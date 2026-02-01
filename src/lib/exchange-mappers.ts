/**
 * Exchange Mappers
 * 
 * Functions to convert exchange-specific API responses to
 * generic ExchangePosition, ExchangeTrade, ExchangeBalance types.
 * 
 * This is the abstraction layer that decouples UI components
 * from exchange-specific data formats.
 */

import type {
  ExchangePosition,
  ExchangeBalance,
  ExchangeAccountSummary,
  ExchangeTrade,
  ExchangeOrder,
  ExchangeOrderStatus,
  ExchangeOrderType,
  ExchangeIncome,
  ExchangeIncomeCategory,
  ExchangeType,
} from '@/types/exchange';

import type {
  BinancePosition,
  BinanceBalance,
  BinanceAccountSummary,
  BinanceTrade,
  BinanceOrder,
  BinanceIncome,
} from '@/features/binance/types';

// =============================================================================
// Binance → Generic Mappers
// =============================================================================

/**
 * Convert Binance position to generic ExchangePosition
 */
export function mapBinancePosition(bp: BinancePosition): ExchangePosition {
  const isLong = bp.positionAmt > 0;
  
  return {
    symbol: bp.symbol,
    side: isLong ? 'LONG' : 'SHORT',
    size: Math.abs(bp.positionAmt),
    entryPrice: bp.entryPrice,
    markPrice: bp.markPrice,
    unrealizedPnl: bp.unrealizedProfit,
    leverage: bp.leverage,
    marginType: bp.marginType,
    liquidationPrice: bp.liquidationPrice,
    notional: bp.notional,
    updateTime: bp.updateTime,
    source: 'binance',
  };
}

/**
 * Convert array of Binance positions to generic positions
 * Filters out empty positions (size = 0)
 */
export function mapBinancePositions(positions: BinancePosition[]): ExchangePosition[] {
  return positions
    .filter(p => p.positionAmt !== 0)
    .map(mapBinancePosition);
}

/**
 * Convert Binance balance to generic ExchangeBalance
 */
export function mapBinanceBalance(bb: BinanceBalance): ExchangeBalance {
  return {
    asset: bb.asset,
    total: bb.walletBalance,
    available: bb.availableBalance,
    unrealizedPnl: bb.unrealizedProfit,
    marginBalance: bb.marginBalance,
    source: 'binance',
  };
}

/**
 * Convert Binance account summary to generic account summary
 */
export function mapBinanceAccountSummary(summary: BinanceAccountSummary): ExchangeAccountSummary {
  return {
    totalBalance: summary.totalWalletBalance,
    availableBalance: summary.availableBalance,
    totalUnrealizedPnl: summary.totalUnrealizedProfit,
    totalMarginBalance: summary.totalMarginBalance,
    assets: summary.assets.map(mapBinanceBalance),
    source: 'binance',
  };
}

/**
 * Convert Binance trade to generic ExchangeTrade
 */
export function mapBinanceTrade(bt: BinanceTrade): ExchangeTrade {
  return {
    id: bt.id.toString(),
    symbol: bt.symbol,
    side: bt.side,
    price: bt.price,
    quantity: bt.qty,
    quoteQuantity: bt.quoteQty,
    realizedPnl: bt.realizedPnl,
    commission: bt.commission,
    commissionAsset: bt.commissionAsset,
    timestamp: bt.time,
    isMaker: bt.maker,
    positionSide: bt.positionSide,
    source: 'binance',
  };
}

/**
 * Convert array of Binance trades to generic trades
 */
export function mapBinanceTrades(trades: BinanceTrade[]): ExchangeTrade[] {
  return trades.map(mapBinanceTrade);
}

/**
 * Map Binance order status to generic status
 */
function mapBinanceOrderStatus(status: string): ExchangeOrderStatus {
  const statusMap: Record<string, ExchangeOrderStatus> = {
    'NEW': 'NEW',
    'PARTIALLY_FILLED': 'PARTIALLY_FILLED',
    'FILLED': 'FILLED',
    'CANCELED': 'CANCELED',
    'REJECTED': 'REJECTED',
    'EXPIRED': 'EXPIRED',
  };
  return statusMap[status] || 'NEW';
}

/**
 * Map Binance order type to generic type
 */
function mapBinanceOrderType(type: string): ExchangeOrderType {
  const typeMap: Record<string, ExchangeOrderType> = {
    'LIMIT': 'LIMIT',
    'MARKET': 'MARKET',
    'STOP': 'STOP',
    'STOP_MARKET': 'STOP_MARKET',
    'TAKE_PROFIT': 'TAKE_PROFIT',
    'TAKE_PROFIT_MARKET': 'TAKE_PROFIT_MARKET',
  };
  return typeMap[type] || 'MARKET';
}

/**
 * Convert Binance order to generic ExchangeOrder
 */
export function mapBinanceOrder(bo: BinanceOrder): ExchangeOrder {
  return {
    orderId: bo.orderId.toString(),
    symbol: bo.symbol,
    side: bo.side,
    type: mapBinanceOrderType(bo.type),
    status: mapBinanceOrderStatus(bo.status),
    originalQuantity: bo.origQty,
    executedQuantity: bo.executedQty,
    price: bo.price,
    avgPrice: bo.avgPrice,
    stopPrice: bo.stopPrice,
    positionSide: bo.positionSide,
    createTime: bo.time,
    updateTime: bo.updateTime,
    source: 'binance',
  };
}

/**
 * Convert array of Binance orders to generic orders
 */
export function mapBinanceOrders(orders: BinanceOrder[]): ExchangeOrder[] {
  return orders.map(mapBinanceOrder);
}

/**
 * Map Binance income type to category
 */
function mapBinanceIncomeCategory(type: string): ExchangeIncomeCategory {
  const categoryMap: Record<string, ExchangeIncomeCategory> = {
    'REALIZED_PNL': 'pnl',
    'COMMISSION': 'fees',
    'FUNDING_FEE': 'funding',
    'TRANSFER': 'transfers',
    'INTERNAL_TRANSFER': 'transfers',
    'COIN_SWAP_DEPOSIT': 'transfers',
    'COIN_SWAP_WITHDRAW': 'transfers',
    'WELCOME_BONUS': 'rewards',
    'REFERRAL_KICKBACK': 'rewards',
    'COMMISSION_REBATE': 'rewards',
    'API_REBATE': 'rewards',
    'CONTEST_REWARD': 'rewards',
  };
  return categoryMap[type] || 'other';
}

/**
 * Convert Binance income to generic ExchangeIncome
 */
export function mapBinanceIncome(bi: BinanceIncome): ExchangeIncome {
  return {
    id: bi.tranId.toString(),
    symbol: bi.symbol || null,
    incomeType: bi.incomeType,
    category: mapBinanceIncomeCategory(bi.incomeType),
    amount: bi.income,
    asset: bi.asset,
    timestamp: bi.time,
    info: bi.info,
    source: 'binance',
  };
}

/**
 * Convert array of Binance income records to generic income
 */
export function mapBinanceIncomes(incomes: BinanceIncome[]): ExchangeIncome[] {
  return incomes.map(mapBinanceIncome);
}

// =============================================================================
// Aggregation Helpers
// =============================================================================

/**
 * Aggregate income records by category
 */
export function aggregateIncomeByCategory(
  incomes: ExchangeIncome[]
): Record<ExchangeIncomeCategory, { total: number; count: number }> {
  const result: Record<ExchangeIncomeCategory, { total: number; count: number }> = {
    pnl: { total: 0, count: 0 },
    fees: { total: 0, count: 0 },
    funding: { total: 0, count: 0 },
    transfers: { total: 0, count: 0 },
    rewards: { total: 0, count: 0 },
    other: { total: 0, count: 0 },
  };

  for (const income of incomes) {
    result[income.category].total += income.amount;
    result[income.category].count += 1;
  }

  return result;
}

/**
 * Calculate total unrealized PnL from positions
 */
export function calculateTotalUnrealizedPnl(positions: ExchangePosition[]): number {
  return positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
}

/**
 * Calculate total notional value from positions
 */
export function calculateTotalNotional(positions: ExchangePosition[]): number {
  return positions.reduce((sum, p) => sum + Math.abs(p.notional), 0);
}

// =============================================================================
// Future Exchange Mappers (Stubs)
// =============================================================================

/**
 * Bybit mapper - COMING SOON
 * When implementing Bybit support, add mappers here following the same pattern
 */
// export function mapBybitPosition(bp: BybitPosition): ExchangePosition { ... }

/**
 * OKX mapper - COMING SOON
 * When implementing OKX support, add mappers here following the same pattern
 */
// export function mapOkxPosition(op: OkxPosition): ExchangePosition { ... }

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a position is from a specific exchange
 */
export function isFromExchange<T extends ExchangeType>(
  item: { source: ExchangeType },
  exchange: T
): item is { source: T } & typeof item {
  return item.source === exchange;
}

/**
 * Filter items by exchange
 */
export function filterByExchange<T extends { source: ExchangeType }>(
  items: T[],
  exchange: ExchangeType
): T[] {
  return items.filter(item => item.source === exchange);
}
