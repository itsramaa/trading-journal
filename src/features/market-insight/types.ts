/**
 * Market Insight Types - Per AI Documentation
 * Real-time market data from Binance, CoinGecko, Alternative.me
 */

export type SentimentDirection = 'bullish' | 'bearish' | 'neutral';
export type VolatilityLevel = 'low' | 'medium' | 'high';
export type WhaleSignal = 'ACCUMULATION' | 'DISTRIBUTION' | 'NONE';
export type TradeDirection = 'LONG' | 'SHORT' | 'WAIT';

export interface FearGreedIndex {
  value: number;
  label: string;
  timestamp: string;
}

export interface MarketSignal {
  asset: string;
  trend: string;
  direction: 'up' | 'down' | 'neutral';
  price?: number;
  change24h?: number;
}

export interface StructuredRecommendation {
  trigger: string;
  direction: string;
  riskPct: number;
  targetPct: number;
  stopPct: number;
  historicalContext: string;
}

export interface MarketSentiment {
  overall: SentimentDirection;
  confidence: number;
  signals: MarketSignal[];
  fearGreed: FearGreedIndex;
  recommendation: string;
  structuredRecommendation?: StructuredRecommendation | null;
  technicalScore: number;
  onChainScore: number;
  macroScore: number;
  lastUpdated: string;
  /** ISO timestamp - bias expires after this time, requiring refresh */
  validUntil?: string;
}

export interface VolatilityData {
  asset: string;
  level: VolatilityLevel;
  value: number;
  status: string;
  atr?: number;
  /** Annualized volatility from hourly data */
  annualizedVolatility?: number;
  /** Percentile rank vs last 180 days (0-100) */
  percentile180d?: number;
  /** Number of historical data points used for percentile */
  percentileDataPoints?: number;
}

export interface TradingOpportunity {
  pair: string;
  confidence: number;
  direction: TradeDirection;
  reason: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
}

export interface MacroCorrelation {
  name: string;
  value: number;
  change: number;
  impact: string;
}

export interface MacroAnalysis {
  overallSentiment: 'bullish' | 'bearish' | 'cautious';
  correlations: MacroCorrelation[];
  aiSummary: string;
  lastUpdated: string;
  marketCapTrend: 'up' | 'down' | 'stable';
  btcDominance: number;
  /** Fear & Greed percentile context */
  fearGreedPercentile?: {
    value: number;
    percentile365d: number;
    dataPoints: number;
    label: string;
  };
}

export interface WhaleActivity {
  asset: string;
  signal: WhaleSignal;
  volumeChange24h: number;
  exchangeFlowEstimate: 'inflow' | 'outflow' | 'balanced';
  fundingRate?: number;
  confidence: number;
  description: string;
  /** Detection method description for transparency */
  method?: string;
  /** Threshold criteria used for detection */
  thresholds?: string;
  /** Volume percentile rank vs rolling historical windows (0-100) */
  percentileRank?: number;
}

/** Funding rate with historical percentile context */
export interface FundingRateContext {
  symbol: string;
  rate: number;
  /** Percentile rank vs last 90 days */
  percentile90d: number;
  percentileDataPoints: number;
}

/** Open Interest 24h change data */
export interface OIChangeData {
  symbol: string;
  /** Percentage change in OI over last 24h */
  oiChange24hPct: number;
  currentOI: number;
  prevOI: number;
}

/** Funding rate vs price divergence signal */
export interface FundingPriceDivergence {
  symbol: string;
  hasDivergence: boolean;
  /** 'bullish_divergence' | 'bearish_divergence' | 'none' */
  type: string;
  description: string;
}

export interface MarketInsightResponse {
  sentiment: MarketSentiment;
  volatility: VolatilityData[];
  opportunities: TradingOpportunity[];
  whaleActivity: WhaleActivity[];
  /** Funding rate percentile context per symbol */
  fundingRates?: FundingRateContext[];
  /** OI change 24h per symbol */
  oiChanges?: OIChangeData[];
  /** Funding/price divergence signals per symbol */
  divergences?: FundingPriceDivergence[];
  lastUpdated: string;
  dataQuality: number;
}

export interface MacroAnalysisResponse {
  macro: MacroAnalysis;
  lastUpdated: string;
}
