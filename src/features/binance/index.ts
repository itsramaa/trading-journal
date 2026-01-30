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
  useBinanceRealizedPnL,
  useBinanceCommissions,
} from './useBinanceFutures';
