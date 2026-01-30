/**
 * Binance Futures Feature Module
 * Exports all Binance-related types and hooks
 */

// Core types and account hooks
export * from './types';
export * from './useBinanceFutures';

// Phase 1: Market data types and hooks
export * from './market-data-types';
export * from './useBinanceMarketData';

// Phase 2: Account data hooks
export * from './useBinanceAccountData';

// Re-export commonly used account hooks for convenience
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

// Re-export Phase 1 market data hooks
export {
  useBinanceKlines,
  useBinanceMarkPrice,
  useBinanceFundingRateHistory,
  useBinanceOpenInterest,
  useBinanceTopTraderRatio,
  useBinanceGlobalRatio,
  useBinanceTakerVolume,
  useBinanceOrderBook,
  useBinanceAggTrades,
  useBinanceMarketSentiment,
} from './useBinanceMarketData';

// Re-export Phase 2 account data hooks
export {
  useBinanceCommissionRate,
  useBinanceLeverageBrackets,
  useBinanceForceOrders,
  useBinancePositionMode,
  useBinanceAllOrders,
  usePositionSizingData,
  getMaxLeverageForNotional,
  getMaintMarginRatio,
} from './useBinanceAccountData';

// Re-export utility functions
export { getIncomeTypeCategory } from './types';
