/**
 * Position Lifecycle Grouper
 * 
 * Groups raw Binance trades into complete position lifecycles.
 * A lifecycle = position opened → position closed (qty goes 0 → X → 0)
 * 
 * Key Logic:
 * - LONG: BUY = entry, SELL = exit
 * - SHORT: SELL = entry, BUY = exit
 * - Hedge mode: Use positionSide field
 * - One-way mode: positionSide = BOTH, infer from side sequence
 */

import type { BinanceTrade, BinanceOrder, BinanceIncome } from '@/features/binance/types';
import type { PositionLifecycle, RawBinanceData, GroupedIncome } from './types';

// Time tolerance for matching income to fills (REDUCED to 60 seconds)
// Only used as fallback when tradeId matching fails
const INCOME_MATCH_TOLERANCE_MS = 60 * 1000;

/**
 * Group raw Binance data into position lifecycles
 */
export function groupIntoLifecycles(rawData: RawBinanceData): PositionLifecycle[] {
  const { trades, orders, income } = rawData;
  
  if (trades.length === 0) {
    return [];
  }
  
  // Sort trades by time
  const sortedTrades = [...trades].sort((a, b) => a.time - b.time);
  
  // Group income by type for faster lookup
  const groupedIncome = groupIncomeByType(income);
  
  // Track open positions and completed lifecycles
  const lifecycles: PositionLifecycle[] = [];
  const openPositions = new Map<string, PositionTracker>();
  
  for (const trade of sortedTrades) {
    const positionKey = getPositionKey(trade);
    
    let tracker = openPositions.get(positionKey);
    if (!tracker) {
      tracker = createPositionTracker(trade.symbol, trade.positionSide);
      openPositions.set(positionKey, tracker);
    }
    
    // IMPORTANT: Set direction from FIRST trade before determining entry/exit
    // This fixes one-way mode (positionSide = BOTH) where direction must be inferred
    if (tracker.entryTime === 0) {
      // First trade for this position - infer direction
      tracker.direction = inferDirection(trade);
    }
    
    // Determine if this is entry or exit based on correct direction
    const isEntry = isEntryTrade(trade, tracker.direction);
    
    if (isEntry) {
      tracker.entryFills.push(trade);
      tracker.entryQty += trade.qty;
      if (tracker.entryTime === 0) {
        tracker.entryTime = trade.time;
      }
    } else {
      tracker.exitFills.push(trade);
      tracker.exitQty += trade.qty;
      tracker.exitTime = trade.time;
    }
    
    // Check if position is now closed (exit qty >= entry qty)
    if (tracker.exitQty >= tracker.entryQty && tracker.entryQty > 0) {
      // Create lifecycle from tracker
      const lifecycle = createLifecycleFromTracker(
        tracker,
        orders,
        groupedIncome
      );
      lifecycles.push(lifecycle);
      
      // Reset tracker for next lifecycle on same symbol
      openPositions.delete(positionKey);
    }
  }
  
  // Handle incomplete positions (still open)
  for (const [key, tracker] of openPositions) {
    if (tracker.entryQty > 0) {
      const lifecycle = createLifecycleFromTracker(
        tracker,
        orders,
        groupedIncome
      );
      lifecycle.isComplete = false;
      lifecycles.push(lifecycle);
    }
  }
  
  return lifecycles;
}

/**
 * Position tracker during grouping
 */
interface PositionTracker {
  symbol: string;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  direction: 'LONG' | 'SHORT';
  entryFills: BinanceTrade[];
  exitFills: BinanceTrade[];
  entryQty: number;
  exitQty: number;
  entryTime: number;
  exitTime: number;
}

function createPositionTracker(
  symbol: string, 
  positionSide: 'LONG' | 'SHORT' | 'BOTH'
): PositionTracker {
  // For hedge mode, direction is explicit from positionSide
  // For one-way mode (BOTH), direction will be set by first trade in inferDirection()
  const initialDirection: 'LONG' | 'SHORT' = 
    positionSide === 'LONG' ? 'LONG' : 
    positionSide === 'SHORT' ? 'SHORT' : 
    'LONG'; // Temporary default, will be overwritten by inferDirection on first trade
    
  return {
    symbol,
    positionSide,
    direction: initialDirection,
    entryFills: [],
    exitFills: [],
    entryQty: 0,
    exitQty: 0,
    entryTime: 0,
    exitTime: 0,
  };
}

/**
 * Generate unique position key for tracking
 */
function getPositionKey(trade: BinanceTrade): string {
  // In hedge mode, separate LONG and SHORT positions
  if (trade.positionSide !== 'BOTH') {
    return `${trade.symbol}_${trade.positionSide}`;
  }
  // In one-way mode, just use symbol
  return `${trade.symbol}_BOTH`;
}

/**
 * Infer direction from trade
 */
function inferDirection(trade: BinanceTrade): 'LONG' | 'SHORT' {
  if (trade.positionSide === 'LONG') return 'LONG';
  if (trade.positionSide === 'SHORT') return 'SHORT';
  // One-way mode: first trade side determines direction
  return trade.side === 'BUY' ? 'LONG' : 'SHORT';
}

/**
 * Determine if trade is entry or exit based on direction
 */
function isEntryTrade(trade: BinanceTrade, direction: 'LONG' | 'SHORT'): boolean {
  if (trade.positionSide === 'LONG') {
    return trade.side === 'BUY';
  }
  if (trade.positionSide === 'SHORT') {
    return trade.side === 'SELL';
  }
  // One-way mode
  if (direction === 'LONG') {
    return trade.side === 'BUY';
  }
  return trade.side === 'SELL';
}

/**
 * Group income records by type
 */
function groupIncomeByType(income: BinanceIncome[]): GroupedIncome {
  const grouped: GroupedIncome = {
    realizedPnl: [],
    commission: [],
    fundingFee: [],
    other: [],
  };
  
  for (const record of income) {
    switch (record.incomeType) {
      case 'REALIZED_PNL':
        grouped.realizedPnl.push(record);
        break;
      case 'COMMISSION':
        grouped.commission.push(record);
        break;
      case 'FUNDING_FEE':
        grouped.fundingFee.push(record);
        break;
      default:
        grouped.other.push(record);
    }
  }
  
  return grouped;
}

/**
 * Create a PositionLifecycle from a completed tracker
 */
function createLifecycleFromTracker(
  tracker: PositionTracker,
  allOrders: BinanceOrder[],
  groupedIncome: GroupedIncome
): PositionLifecycle {
  // Collect all order IDs and trade IDs from fills
  const orderIds = new Set([
    ...tracker.entryFills.map(f => f.orderId),
    ...tracker.exitFills.map(f => f.orderId),
  ]);
  
  const tradeIds = new Set([
    ...tracker.entryFills.map(f => f.id.toString()),
    ...tracker.exitFills.map(f => f.id.toString()),
  ]);
  
  const relatedOrders = allOrders.filter(o => orderIds.has(o.orderId));
  const entryOrders = relatedOrders.filter(o => 
    tracker.entryFills.some(f => f.orderId === o.orderId)
  );
  const exitOrders = relatedOrders.filter(o => 
    tracker.exitFills.some(f => f.orderId === o.orderId)
  );
  
  // Find related income records using trade ID matching (primary) + time fallback (secondary)
  const incomeRecords = findRelatedIncomeByTradeId(
    tracker.symbol,
    tradeIds,
    tracker.entryTime,
    tracker.exitTime || Date.now(),
    groupedIncome
  );
  
  // Generate lifecycle ID
  const lifecycleId = `${tracker.symbol}_${tracker.entryTime}_${tracker.exitTime || 'open'}`;
  
  return {
    symbol: tracker.symbol,
    direction: tracker.direction,
    positionSide: tracker.positionSide,
    entryFills: tracker.entryFills,
    exitFills: tracker.exitFills,
    entryOrders,
    exitOrders,
    incomeRecords,
    entryTime: tracker.entryTime,
    exitTime: tracker.exitTime,
    isComplete: tracker.exitQty >= tracker.entryQty && tracker.entryQty > 0,
    lifecycleId,
  };
}

/**
 * Find income records related to a position lifecycle using trade ID matching
 * 
 * PRIMARY: Match by tradeId field in income records (accurate)
 * FALLBACK: Match by symbol + time window for records without tradeId
 */
function findRelatedIncomeByTradeId(
  symbol: string,
  tradeIds: Set<string>,
  entryTime: number,
  exitTime: number,
  groupedIncome: GroupedIncome
): BinanceIncome[] {
  const related: BinanceIncome[] = [];
  const matchedTranIds = new Set<number>();
  
  // PASS 1: Match REALIZED_PNL by tradeId (most accurate)
  for (const pnl of groupedIncome.realizedPnl) {
    if (pnl.symbol === symbol) {
      // Primary: Match by tradeId
      if (pnl.tradeId && tradeIds.has(pnl.tradeId)) {
        related.push(pnl);
        matchedTranIds.add(pnl.tranId);
        continue;
      }
      // Fallback: Match by tight time window (only if tradeId unavailable)
      if (!pnl.tradeId && 
          pnl.time >= entryTime - INCOME_MATCH_TOLERANCE_MS &&
          pnl.time <= exitTime + INCOME_MATCH_TOLERANCE_MS) {
        related.push(pnl);
        matchedTranIds.add(pnl.tranId);
      }
    }
  }
  
  // PASS 2: Match COMMISSION by tradeId or tight time window
  for (const comm of groupedIncome.commission) {
    if (comm.symbol === symbol) {
      if (matchedTranIds.has(comm.tranId)) continue; // Already matched
      
      // Primary: Match by tradeId
      if (comm.tradeId && tradeIds.has(comm.tradeId)) {
        related.push(comm);
        continue;
      }
      // Fallback: Match by tight time window
      if (!comm.tradeId &&
          comm.time >= entryTime - INCOME_MATCH_TOLERANCE_MS &&
          comm.time <= exitTime + INCOME_MATCH_TOLERANCE_MS) {
        related.push(comm);
      }
    }
  }
  
  // PASS 3: Match FUNDING_FEE by exact time range (no tradeId available for funding)
  for (const funding of groupedIncome.fundingFee) {
    if (funding.symbol === symbol &&
        funding.time >= entryTime &&
        funding.time <= exitTime) {
      related.push(funding);
    }
  }
  
  return related;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use findRelatedIncomeByTradeId instead
 */
function findRelatedIncome(
  symbol: string,
  entryTime: number,
  exitTime: number,
  groupedIncome: GroupedIncome
): BinanceIncome[] {
  return findRelatedIncomeByTradeId(
    symbol,
    new Set<string>(), // No trade IDs, will fall back to time matching
    entryTime,
    exitTime,
    groupedIncome
  );
}

/**
 * Detect position flips (LONG to SHORT or vice versa) and split
 */
export function detectAndSplitPositionFlips(
  lifecycles: PositionLifecycle[]
): PositionLifecycle[] {
  const result: PositionLifecycle[] = [];
  
  for (const lifecycle of lifecycles) {
    // Check if exit quantity exceeds entry (potential flip)
    const entryQty = lifecycle.entryFills.reduce((sum, f) => sum + f.qty, 0);
    const exitQty = lifecycle.exitFills.reduce((sum, f) => sum + f.qty, 0);
    
    if (exitQty > entryQty) {
      // Position flip detected - split into close + new open
      // For now, we mark and handle later
      console.warn(`[Grouper] Position flip detected for ${lifecycle.symbol}`);
    }
    
    result.push(lifecycle);
  }
  
  return result;
}
