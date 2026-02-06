/**
 * UnifiedMarketContext - Single Source of Truth for Market Conditions
 * Used to capture and store market state at trade entry time
 * Enables correlation analysis between trade performance and market conditions
 */

import type { TradingSession } from '@/lib/session-utils';

export type SentimentDirection = 'bullish' | 'bearish' | 'neutral';
export type VolatilityLevel = 'low' | 'medium' | 'high';
export type EventRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type PositionSizeAdjustment = 'normal' | 'reduce_30%' | 'reduce_50%';
export type TradingBias = 'LONG_FAVORABLE' | 'SHORT_FAVORABLE' | 'NEUTRAL' | 'AVOID';

/**
 * Session context captured at trade entry
 */
export interface SessionContext {
  current: TradingSession;
  overlap: string | null;
}

/**
 * Sentiment component of market context
 */
export interface MarketSentimentContext {
  overall: SentimentDirection;
  technicalScore: number;      // 0-100
  onChainScore: number;        // 0-100
  macroScore: number;          // 0-100
  confidence: number;          // 0-100
}

/**
 * Fear & Greed index data
 */
export interface FearGreedContext {
  value: number;               // 0-100
  label: string;               // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
}

/**
 * Volatility data for position sizing
 */
export interface VolatilityContext {
  level: VolatilityLevel;
  value: number;               // ATR or volatility percentage
  suggestedStopMultiplier: number;
}

/**
 * Economic event impact data
 */
export interface EventContext {
  hasHighImpactToday: boolean;
  riskLevel: EventRiskLevel;
  positionSizeAdjustment: PositionSizeAdjustment;
  highImpactCount: number;
  upcomingEvent?: {
    name: string;
    timeUntil: string;
    cryptoImpact: 'bullish' | 'bearish' | 'neutral' | null;
  };
}

/**
 * Momentum data from top movers analysis
 */
export interface MomentumContext {
  isTopGainer: boolean;
  isTopLoser: boolean;
  rank24h: number | null;      // 1 = top gainer, negative = loser rank
  priceChange24h: number;      // Percentage change
}

/**
 * Complete Unified Market Context
 * Captured at trade entry and stored in trade_entries.market_context
 */
export interface UnifiedMarketContext {
  // Core components
  sentiment: MarketSentimentContext;
  fearGreed: FearGreedContext;
  volatility: VolatilityContext;
  events: EventContext;
  momentum: MomentumContext;
  
  // Session context (captured at trade entry)
  session?: SessionContext;
  
  // Derived scores
  compositeScore: number;      // 0-100 weighted combination
  tradingBias: TradingBias;
  
  // Metadata
  capturedAt: string;          // ISO timestamp
  dataQuality: number;         // 0-100, indicates data completeness
  symbol: string;              // The symbol this context was captured for
}

/**
 * Weights for composite score calculation
 */
export const MARKET_SCORE_WEIGHTS = {
  technical: 0.25,
  onChain: 0.15,
  fearGreed: 0.15,
  macro: 0.15,
  eventRisk: 0.15,   // Negative weight - high risk reduces score
  momentum: 0.15,
} as const;

/**
 * Helper type for partial context (during capture)
 */
export type PartialMarketContext = Partial<UnifiedMarketContext>;

/**
 * Context capture options
 */
export interface CaptureMarketContextOptions {
  symbol: string;
  includeVolatility?: boolean;
  includeMomentum?: boolean;
  includeEvents?: boolean;
}

/**
 * Result of market context capture
 */
export interface CaptureMarketContextResult {
  context: UnifiedMarketContext | null;
  isLoading: boolean;
  error: Error | null;
  capture: (symbol: string) => Promise<UnifiedMarketContext | null>;
  refetch: () => void;
}
