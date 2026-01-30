/**
 * Binance Futures Feature Module
 * Exports all Binance-related types and hooks
 */

export * from './types';
export * from './useBinanceFutures';

// Re-export commonly used hooks for convenience
export {
  useBinanceConnectionStatus,
  useBinanceConnection,
  useBinanceBalance,
  useBinancePositions,
  useBinanceTrades,
  useBinanceOpenOrders,
  useTestBinanceConnection,
  useRefreshBinanceData,
  useBinanceIncomeHistory,
  useBinanceAllIncome,
  useBinanceRealizedPnL,
  useBinanceCommissions,
  useBinanceFundingFees,
} from './useBinanceFutures';

// Re-export utility functions
export { getIncomeTypeCategory } from './types';
