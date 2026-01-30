/**
 * Binance Advanced Analytics Types - Phase 3
 * Public endpoints for advanced market analytics
 */

// ============================================
// 3.1 Basis Data (Contango/Backwardation)
// ============================================
export type ContractType = 'PERPETUAL' | 'CURRENT_QUARTER' | 'NEXT_QUARTER';

export interface BasisParams {
  pair: string;           // e.g., "BTCUSDT"
  contractType: ContractType;
  period: '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d';
  startTime?: number;
  endTime?: number;
  limit?: number;         // Default 30, max 500
}

export interface BasisData {
  pair: string;
  contractType: string;
  futuresPrice: number;
  indexPrice: number;
  basis: number;          // Futures - Index
  basisRate: number;      // Basis / Index (percentage)
  timestamp: number;
}

export interface BasisAnalysis {
  data: BasisData[];
  trend: 'contango' | 'backwardation' | 'neutral';
  averageBasisRate: number;
  currentBasisRate: number;
}

// ============================================
// 3.2 Insurance Fund
// ============================================
export interface InsuranceFundData {
  message: string;
  note: string;
}

// ============================================
// 3.3 24h Ticker Statistics
// ============================================
export interface Ticker24h {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  lastPrice: number;
  lastQty: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;          // Trade count
}

// ============================================
// 3.4 Exchange Info (Trading Schedule)
// ============================================
export interface SymbolFilter {
  filterType: string;
  [key: string]: any;
}

export interface SymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  marginAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  baseAssetPrecision: number;
  quotePrecision: number;
  underlyingType: string;
  settlePlan: number;
  triggerProtect: string;
  liquidationFee: string;
  marketTakeBound: string;
  maxMoveOrderLimit: number;
  filters: SymbolFilter[];
  orderTypes: string[];
  timeInForce: string[];
}

export interface ExchangeInfo {
  timezone: string;
  serverTime: number;
  rateLimits: {
    rateLimitType: string;
    interval: string;
    intervalNum: number;
    limit: number;
  }[];
  symbols: SymbolInfo[];
}

// ============================================
// 3.5 Historical Volatility
// ============================================
export interface VolatilityData {
  symbol: string;
  period: number;
  dailyVolatility: number;       // As percentage
  annualizedVolatility: number;  // As percentage
  atr: number;                   // Average True Range
  atrPercent: number;            // ATR as % of price
  currentPrice: number;
  dataPoints: number;
  timestamp: number;
}

export interface VolatilityRisk {
  level: 'low' | 'medium' | 'high' | 'extreme';
  description: string;
  suggestedStopLossPercent: number;
}

// ============================================
// 3.6 Liquidation Heatmap
// ============================================
export interface HeatmapLevel {
  price: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  netFlow: number;
  intensity: number;      // 0-100
}

export interface LiquidationHeatmapData {
  symbol: string;
  interval: string;
  currentPrice: number;
  heatmap: HeatmapLevel[];
  summary: {
    highestVolumePriceLow: HeatmapLevel[];
    highestVolumePriceHigh: HeatmapLevel[];
    totalBuyVolume: number;
    totalSellVolume: number;
  };
  timestamp: number;
}

// ============================================
// Composite Analytics Types
// ============================================
export interface MarketStructureAnalysis {
  symbol: string;
  basis: BasisAnalysis | null;
  volatility: VolatilityData | null;
  ticker: Ticker24h | null;
  liquidationHeatmap: LiquidationHeatmapData | null;
  timestamp: number;
}

export interface VolatilityAlert {
  symbol: string;
  type: 'spike' | 'drop' | 'extreme';
  currentVolatility: number;
  threshold: number;
  message: string;
  timestamp: number;
}

// ============================================
// API Action Types
// ============================================
export type AdvancedAnalyticsAction =
  | 'basis'
  | 'insurance-fund'
  | 'ticker-24h'
  | 'exchange-info'
  | 'historical-volatility'
  | 'liquidation-heatmap';

// ============================================
// Helper Functions
// ============================================

/**
 * Get volatility risk level based on annualized volatility
 */
export function getVolatilityRisk(annualizedVolatility: number): VolatilityRisk {
  if (annualizedVolatility < 30) {
    return {
      level: 'low',
      description: 'Low volatility - stable price action',
      suggestedStopLossPercent: 1.5,
    };
  } else if (annualizedVolatility < 60) {
    return {
      level: 'medium',
      description: 'Medium volatility - normal crypto conditions',
      suggestedStopLossPercent: 2.5,
    };
  } else if (annualizedVolatility < 100) {
    return {
      level: 'high',
      description: 'High volatility - increased risk',
      suggestedStopLossPercent: 4,
    };
  } else {
    return {
      level: 'extreme',
      description: 'Extreme volatility - reduce position size',
      suggestedStopLossPercent: 6,
    };
  }
}

/**
 * Analyze basis trend (contango/backwardation)
 */
export function analyzeBasisTrend(basisData: BasisData[]): BasisAnalysis['trend'] {
  if (basisData.length === 0) return 'neutral';
  
  const recentBasis = basisData.slice(-5);
  const avgBasisRate = recentBasis.reduce((sum, b) => sum + b.basisRate, 0) / recentBasis.length;
  
  if (avgBasisRate > 0.001) return 'contango';    // > 0.1%
  if (avgBasisRate < -0.001) return 'backwardation';
  return 'neutral';
}

/**
 * Calculate support/resistance levels from heatmap
 */
export function findKeyLevels(heatmap: HeatmapLevel[], currentPrice: number): {
  support: number[];
  resistance: number[];
} {
  const sortedByVolume = [...heatmap].sort((a, b) => b.totalVolume - a.totalVolume);
  const topLevels = sortedByVolume.slice(0, 10);
  
  return {
    support: topLevels
      .filter(l => l.price < currentPrice)
      .map(l => l.price)
      .slice(0, 3),
    resistance: topLevels
      .filter(l => l.price > currentPrice)
      .map(l => l.price)
      .slice(0, 3),
  };
}
