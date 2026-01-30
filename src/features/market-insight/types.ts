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

export interface MarketSentiment {
  overall: SentimentDirection;
  confidence: number;
  signals: MarketSignal[];
  fearGreed: FearGreedIndex;
  recommendation: string;
  technicalScore: number;
  onChainScore: number;
  macroScore: number;
  lastUpdated: string;
}

export interface VolatilityData {
  asset: string;
  level: VolatilityLevel;
  value: number;
  status: string;
  atr?: number;
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
}

export interface WhaleActivity {
  asset: string;
  signal: WhaleSignal;
  volumeChange24h: number;
  exchangeFlowEstimate: 'inflow' | 'outflow' | 'balanced';
  fundingRate?: number;
  confidence: number;
  description: string;
}

export interface MarketInsightResponse {
  sentiment: MarketSentiment;
  volatility: VolatilityData[];
  opportunities: TradingOpportunity[];
  whaleActivity: WhaleActivity[];
  lastUpdated: string;
  dataQuality: number;
}

export interface MacroAnalysisResponse {
  macro: MacroAnalysis;
  lastUpdated: string;
}
