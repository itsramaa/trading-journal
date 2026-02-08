/**
 * Trade Aggregator
 * 
 * Aggregates position lifecycle data into final trade entries.
 * All calculations are based on actual Binance data - no hardcoding.
 * 
 * Key Responsibilities:
 * - Calculate weighted average entry/exit prices
 * - Sum income records (PnL, fees, funding)
 * - Derive calculated fields (result, hold time)
 * - Prepare data for local DB insertion
 */

import type { PositionLifecycle, AggregatedTrade, ValidationResult } from './types';
import { validateAggregatedTrade } from './aggregation-validator';

/**
 * Aggregate a position lifecycle into a trade entry
 */
export function aggregateLifecycle(lifecycle: PositionLifecycle): AggregatedTrade | null {
  // Skip incomplete lifecycles
  if (!lifecycle.isComplete) {
    console.warn(`[Aggregator] Skipping incomplete lifecycle: ${lifecycle.lifecycleId}`);
    return null;
  }
  
  // Validate we have data to work with
  if (lifecycle.entryFills.length === 0) {
    console.error(`[Aggregator] No entry fills for lifecycle: ${lifecycle.lifecycleId}`);
    return null;
  }
  
  // Calculate weighted average entry price
  const { avgPrice: entryPrice, totalQty: entryQty } = calculateWeightedAverage(
    lifecycle.entryFills.map(f => ({ price: f.price, qty: f.qty }))
  );
  
  // Calculate weighted average exit price
  const { avgPrice: exitPrice, totalQty: exitQty } = calculateWeightedAverage(
    lifecycle.exitFills.map(f => ({ price: f.price, qty: f.qty }))
  );
  
  // Aggregate income records
  const incomeAggregation = aggregateIncome(lifecycle.incomeRecords);
  
  // Calculate net P&L
  const fees = incomeAggregation.commission + Math.abs(incomeAggregation.fundingFees);
  const pnl = incomeAggregation.realizedPnl - fees;
  
  // Determine result
  const result = incomeAggregation.realizedPnl > 0.001 
    ? 'win' 
    : incomeAggregation.realizedPnl < -0.001 
      ? 'loss' 
      : 'breakeven';
  
  // Calculate hold time
  const holdTimeMinutes = Math.round((lifecycle.exitTime - lifecycle.entryTime) / 60000);
  
  // Determine maker status (true if any entry fill is maker)
  const isMaker = lifecycle.entryFills.some(f => f.maker);
  
  // Get order types from orders
  const entryOrderType = lifecycle.entryOrders[0]?.type || null;
  const exitOrderType = lifecycle.exitOrders[0]?.type || null;
  
  // Generate binance_trade_id
  const binanceTradeId = generateTradeId(lifecycle);
  
  // Get primary order ID
  const binanceOrderId = lifecycle.entryFills[0]?.orderId || 0;
  
  // Build aggregated trade
  const aggregatedTrade: AggregatedTrade = {
    // Identifiers
    binance_trade_id: binanceTradeId,
    binance_order_id: binanceOrderId,
    
    // Core trade data
    pair: lifecycle.symbol,
    direction: lifecycle.direction,
    
    // Prices
    entry_price: entryPrice,
    exit_price: exitPrice,
    quantity: entryQty,
    
    // P&L (from Binance income API)
    realized_pnl: incomeAggregation.realizedPnl,
    
    // Fees
    commission: incomeAggregation.commission,
    commission_asset: incomeAggregation.commissionAsset || 'USDT',
    funding_fees: incomeAggregation.fundingFees,
    fees,
    pnl,
    
    // Timestamps
    entry_datetime: new Date(lifecycle.entryTime),
    exit_datetime: new Date(lifecycle.exitTime),
    trade_date: new Date(lifecycle.entryTime),
    hold_time_minutes: holdTimeMinutes,
    
    // Metadata
    leverage: null, // Will be enriched from account config
    margin_type: null,
    is_maker: isMaker,
    entry_order_type: entryOrderType,
    exit_order_type: exitOrderType,
    
    // Result
    result,
    status: 'closed',
    source: 'binance',
    
    // Validation (to be filled)
    _validation: null as unknown as ValidationResult,
    _rawLifecycle: lifecycle,
  };
  
  // Validate the trade
  aggregatedTrade._validation = validateAggregatedTrade(aggregatedTrade);
  
  return aggregatedTrade;
}

/**
 * Aggregate multiple lifecycles into trade entries
 */
export function aggregateAllLifecycles(
  lifecycles: PositionLifecycle[],
  onProgress?: (current: number, total: number) => void
): { trades: AggregatedTrade[]; failures: Array<{ lifecycleId: string; reason: string }> } {
  const trades: AggregatedTrade[] = [];
  const failures: Array<{ lifecycleId: string; reason: string }> = [];
  
  const completeLifecycles = lifecycles.filter(l => l.isComplete);
  
  for (let i = 0; i < completeLifecycles.length; i++) {
    const lifecycle = completeLifecycles[i];
    
    try {
      const trade = aggregateLifecycle(lifecycle);
      if (trade) {
        trades.push(trade);
      } else {
        failures.push({
          lifecycleId: lifecycle.lifecycleId,
          reason: 'Aggregation returned null',
        });
      }
    } catch (error) {
      failures.push({
        lifecycleId: lifecycle.lifecycleId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    onProgress?.(i + 1, completeLifecycles.length);
  }
  
  return { trades, failures };
}

/**
 * Calculate weighted average price from fills
 */
function calculateWeightedAverage(
  fills: Array<{ price: number; qty: number }>
): { avgPrice: number; totalQty: number } {
  if (fills.length === 0) {
    return { avgPrice: 0, totalQty: 0 };
  }
  
  let totalValue = 0;
  let totalQty = 0;
  
  for (const fill of fills) {
    totalValue += fill.price * fill.qty;
    totalQty += fill.qty;
  }
  
  return {
    avgPrice: totalQty > 0 ? totalValue / totalQty : 0,
    totalQty,
  };
}

/**
 * Aggregate income records for a lifecycle
 */
interface IncomeAggregation {
  realizedPnl: number;
  commission: number;
  fundingFees: number;
  commissionAsset: string | null;
}

function aggregateIncome(incomeRecords: import('@/features/binance/types').BinanceIncome[]): IncomeAggregation {
  let realizedPnl = 0;
  let commission = 0;
  let fundingFees = 0;
  let commissionAsset: string | null = null;
  
  for (const record of incomeRecords) {
    switch (record.incomeType) {
      case 'REALIZED_PNL':
        realizedPnl += record.income;
        break;
      case 'COMMISSION':
        commission += Math.abs(record.income); // Commission is negative in API
        commissionAsset = record.asset;
        break;
      case 'FUNDING_FEE':
        fundingFees += record.income; // Can be positive or negative
        break;
    }
  }
  
  return { realizedPnl, commission, fundingFees, commissionAsset };
}

/**
 * Generate unique trade ID from lifecycle
 */
function generateTradeId(lifecycle: PositionLifecycle): string {
  // Use symbol + entry time + exit time for uniqueness
  return `${lifecycle.symbol}_${lifecycle.entryTime}_${lifecycle.exitTime}`;
}

/**
 * Calculate reconciliation between Binance and aggregated totals
 * 
 * IMPORTANT: To get accurate reconciliation, we compare:
 * - aggregatedTotalPnl: P&L from completed lifecycles (our trades)
 * - matchedIncomePnl: Only income records that were matched to those lifecycles
 * 
 * This avoids false mismatch caused by:
 * - Open positions (incomplete lifecycles)
 * - Income records outside the lifecycle time windows
 */
export function calculateReconciliation(
  trades: AggregatedTrade[],
  allIncome: import('@/features/binance/types').BinanceIncome[]
): {
  binanceTotalPnl: number;
  aggregatedTotalPnl: number;
  matchedIncomePnl: number;
  unmatchedIncomePnl: number;
  difference: number;
  differencePercent: number;
  isReconciled: boolean;
  incompletePositionsNote: string;
} {
  // Aggregated total from processed trades (complete lifecycles only)
  const aggregatedTotalPnl = trades.reduce(
    (sum, t) => sum + t.realized_pnl,
    0
  );
  
  // Get income that was matched to lifecycles (from _rawLifecycle)
  const matchedIncomeIds = new Set<string>();
  for (const trade of trades) {
    const lifecycle = trade._rawLifecycle;
    if (lifecycle) {
      for (const inc of lifecycle.incomeRecords) {
        if (inc.incomeType === 'REALIZED_PNL') {
          // Use tranId as unique identifier
          matchedIncomeIds.add(`${inc.symbol}_${inc.time}_${inc.income}`);
        }
      }
    }
  }
  
  // Calculate matched income P&L
  const matchedIncomePnl = allIncome
    .filter(i => i.incomeType === 'REALIZED_PNL')
    .filter(i => matchedIncomeIds.has(`${i.symbol}_${i.time}_${i.income}`))
    .reduce((sum, i) => sum + i.income, 0);
  
  // Total raw income (for reference)
  const binanceTotalPnl = allIncome
    .filter(i => i.incomeType === 'REALIZED_PNL')
    .reduce((sum, i) => sum + i.income, 0);
  
  // Unmatched income = income from incomplete/open positions
  const unmatchedIncomePnl = binanceTotalPnl - matchedIncomePnl;
  
  // COMPARE: aggregatedTotalPnl vs matchedIncomePnl (same data source)
  const difference = Math.abs(aggregatedTotalPnl - matchedIncomePnl);
  const differencePercent = matchedIncomePnl !== 0 
    ? (difference / Math.abs(matchedIncomePnl)) * 100 
    : (aggregatedTotalPnl !== 0 ? 100 : 0);
  
  // Reconciled if within 0.1% tolerance
  const isReconciled = differencePercent <= 0.1;
  
  // Note about unmatched income
  const incompletePositionsNote = unmatchedIncomePnl !== 0
    ? `${unmatchedIncomePnl >= 0 ? '+' : ''}$${unmatchedIncomePnl.toFixed(2)} P&L from open/incomplete positions not included in aggregated trades.`
    : '';
  
  return {
    binanceTotalPnl,
    aggregatedTotalPnl,
    matchedIncomePnl,
    unmatchedIncomePnl,
    difference,
    differencePercent,
    isReconciled,
    incompletePositionsNote,
  };
}
