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

// Phase 3: Advanced analytics types and hooks
export * from './advanced-analytics-types';
export * from './useBinanceAdvancedAnalytics';

// Phase 4: Extended account data hooks
export * from './useBinanceExtendedData';

// Phase 5: Bulk export hooks
export * from './useBinanceBulkExport';

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

// Re-export Phase 3 advanced analytics hooks
export {
  useBinanceBasis,
  useBinanceTicker24h,
  useBinanceTopMovers,
  useBinanceExchangeInfo,
  useSymbolConfig,
  useBinanceVolatility,
  useMultiSymbolVolatility,
  useBinanceLiquidationHeatmap,
  useMarketStructureAnalysis,
  useVolatilityBasedSizing,
} from './useBinanceAdvancedAnalytics';

// Re-export Phase 4 extended account data hooks
export {
  useBinanceSymbolConfig,
  useBinanceMultiAssetsMode,
  useBinanceMarginHistory,
  useBinanceAccountConfig,
  useBinanceBnbBurn,
  useBinanceAdlQuantile,
  useBinanceOrderRateLimit,
  useExtendedAccountData,
  getAdlRiskLevel,
  calculateFeeWithDiscount,
  getRateLimitUsage,
  isRateLimitWarning,
} from './useBinanceExtendedData';

// Re-export Phase 5 bulk export hooks
export {
  useBulkExportWorkflow,
  useRequestBulkExport,
  useGetDownloadLink,
  getExportTypeLabel,
  getExportTypeDescription,
} from './useBinanceBulkExport';

// Re-export utility functions
export { getIncomeTypeCategory } from './types';
export { getVolatilityRisk, analyzeBasisTrend, findKeyLevels } from './advanced-analytics-types';
