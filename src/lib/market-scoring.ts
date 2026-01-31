/**
 * Market Scoring Utilities
 * Calculation logic for composite market scores and trading bias
 */

import type {
  UnifiedMarketContext,
  MarketSentimentContext,
  FearGreedContext,
  VolatilityContext,
  EventContext,
  MomentumContext,
  TradingBias,
  VolatilityLevel,
  EventRiskLevel,
  PositionSizeAdjustment,
  MARKET_SCORE_WEIGHTS,
} from '@/types/market-context';

const WEIGHTS = {
  technical: 0.25,
  onChain: 0.15,
  fearGreed: 0.15,
  macro: 0.15,
  eventRisk: 0.15,
  momentum: 0.15,
};

/**
 * Calculate composite market score from all components
 * Returns 0-100 score indicating market favorability
 */
export function calculateCompositeScore(context: {
  sentiment?: Partial<MarketSentimentContext>;
  fearGreed?: Partial<FearGreedContext>;
  volatility?: Partial<VolatilityContext>;
  events?: Partial<EventContext>;
  momentum?: Partial<MomentumContext>;
}): number {
  let score = 50; // Base neutral score
  let totalWeight = 0;
  
  // Technical Score (0-100, higher is better)
  if (context.sentiment?.technicalScore !== undefined) {
    score += (context.sentiment.technicalScore - 50) * WEIGHTS.technical;
    totalWeight += WEIGHTS.technical;
  }
  
  // On-Chain Score (0-100, higher is better)
  if (context.sentiment?.onChainScore !== undefined) {
    score += (context.sentiment.onChainScore - 50) * WEIGHTS.onChain;
    totalWeight += WEIGHTS.onChain;
  }
  
  // Fear & Greed Score (0-100, neutral is 50)
  // Extreme values reduce score (both extreme fear and extreme greed are risky)
  if (context.fearGreed?.value !== undefined) {
    const fg = context.fearGreed.value;
    // Best zone is 30-70, extreme values penalized
    const fgScore = fg >= 30 && fg <= 70 
      ? 60 + (50 - Math.abs(50 - fg)) * 0.4  // Bonus for balanced sentiment
      : 50 - Math.abs(50 - fg) * 0.3;        // Penalty for extremes
    score += (fgScore - 50) * WEIGHTS.fearGreed;
    totalWeight += WEIGHTS.fearGreed;
  }
  
  // Macro Score (0-100, higher is better)
  if (context.sentiment?.macroScore !== undefined) {
    score += (context.sentiment.macroScore - 50) * WEIGHTS.macro;
    totalWeight += WEIGHTS.macro;
  }
  
  // Event Risk (negative impact - high risk events reduce score)
  if (context.events?.riskLevel !== undefined) {
    const eventPenalty = getEventRiskPenalty(context.events.riskLevel);
    score -= eventPenalty * WEIGHTS.eventRisk * 100;
    totalWeight += WEIGHTS.eventRisk;
  }
  
  // Momentum Score (positive momentum is good for longs)
  if (context.momentum?.priceChange24h !== undefined) {
    const momentumScore = normalizeMomentumScore(context.momentum.priceChange24h);
    score += (momentumScore - 50) * WEIGHTS.momentum;
    totalWeight += WEIGHTS.momentum;
  }
  
  // Normalize to account for missing data
  if (totalWeight > 0) {
    score = 50 + (score - 50) / totalWeight;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine trading bias from composite score and components
 */
export function calculateTradingBias(
  compositeScore: number,
  context: {
    sentiment?: Partial<MarketSentimentContext>;
    events?: Partial<EventContext>;
    volatility?: Partial<VolatilityContext>;
  }
): TradingBias {
  // High-impact events today = AVOID
  if (context.events?.hasHighImpactToday && context.events?.riskLevel === 'VERY_HIGH') {
    return 'AVOID';
  }
  
  // High volatility with high event risk = AVOID
  if (context.volatility?.level === 'high' && context.events?.riskLevel === 'HIGH') {
    return 'AVOID';
  }
  
  // Score-based bias
  if (compositeScore >= 65) {
    return 'LONG_FAVORABLE';
  } else if (compositeScore <= 35) {
    return 'SHORT_FAVORABLE';
  }
  
  return 'NEUTRAL';
}

/**
 * Calculate data quality score based on available data
 */
export function calculateDataQuality(context: Partial<UnifiedMarketContext>): number {
  let quality = 0;
  const components = [
    context.sentiment?.technicalScore !== undefined,
    context.sentiment?.onChainScore !== undefined,
    context.sentiment?.macroScore !== undefined,
    context.fearGreed?.value !== undefined,
    context.volatility?.level !== undefined,
    context.events?.riskLevel !== undefined,
    context.momentum?.priceChange24h !== undefined,
  ];
  
  const availableCount = components.filter(Boolean).length;
  quality = Math.round((availableCount / components.length) * 100);
  
  return quality;
}

/**
 * Get event risk penalty factor (0-1, higher means more penalty)
 */
function getEventRiskPenalty(riskLevel: EventRiskLevel): number {
  switch (riskLevel) {
    case 'VERY_HIGH': return 0.5;
    case 'HIGH': return 0.3;
    case 'MODERATE': return 0.1;
    case 'LOW': return 0;
    default: return 0;
  }
}

/**
 * Normalize 24h price change to 0-100 score
 */
function normalizeMomentumScore(priceChange24h: number): number {
  // Map -20% to +20% range to 0-100
  // Beyond these extremes, cap at 0 or 100
  const normalized = 50 + (priceChange24h / 20) * 50;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Determine volatility level from ATR or percentage value
 */
export function determineVolatilityLevel(value: number): VolatilityLevel {
  // Assume value is daily ATR as percentage
  if (value < 2) return 'low';
  if (value < 5) return 'medium';
  return 'high';
}

/**
 * Calculate suggested stop loss multiplier based on volatility
 */
export function calculateStopMultiplier(volatilityLevel: VolatilityLevel): number {
  switch (volatilityLevel) {
    case 'low': return 1.0;
    case 'medium': return 1.5;
    case 'high': return 2.0;
    default: return 1.5;
  }
}

/**
 * Determine position size adjustment based on event count
 */
export function determinePositionAdjustment(highImpactCount: number): PositionSizeAdjustment {
  if (highImpactCount >= 2) return 'reduce_50%';
  if (highImpactCount >= 1) return 'reduce_30%';
  return 'normal';
}

/**
 * Determine event risk level from high impact count
 */
export function determineEventRiskLevel(highImpactCount: number): EventRiskLevel {
  if (highImpactCount >= 3) return 'VERY_HIGH';
  if (highImpactCount >= 2) return 'HIGH';
  if (highImpactCount >= 1) return 'MODERATE';
  return 'LOW';
}

/**
 * Get Fear/Greed label from value
 */
export function getFearGreedLabel(value: number): string {
  if (value <= 20) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Greed';
  return 'Extreme Greed';
}
