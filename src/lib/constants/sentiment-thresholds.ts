/**
 * Sentiment Thresholds Configuration
 * Centralized thresholds for market sentiment calculations
 * Used by both frontend hooks and edge functions
 */

// ============================================
// Sentiment Score Thresholds
// ============================================

export const SENTIMENT_SCORE = {
  /** Score above this is considered bullish */
  BULLISH_THRESHOLD: 60,
  /** Score below this is considered bearish */
  BEARISH_THRESHOLD: 40,
  /** Neutral zone: between BEARISH_THRESHOLD and BULLISH_THRESHOLD */
} as const;

// ============================================
// Top Trader Ratio Thresholds
// ============================================

export const TOP_TRADER_RATIO = {
  /** Ratio above this indicates bullish pro traders */
  BULLISH: 1.2,
  /** Ratio below this indicates bearish pro traders */
  BEARISH: 0.8,
} as const;

// ============================================
// Retail Sentiment Thresholds (Contrarian)
// ============================================

export const RETAIL_RATIO = {
  /** High retail longs = potential bearish signal (contrarian) */
  CROWDED_LONG: 1.5,
  /** High retail shorts = potential bullish signal (contrarian) */
  CROWDED_SHORT: 0.7,
} as const;

// ============================================
// Taker Volume Thresholds
// ============================================

export const TAKER_VOLUME = {
  /** Buy/sell ratio above this = bullish pressure */
  BULLISH: 1.1,
  /** Buy/sell ratio below this = bearish pressure */
  BEARISH: 0.9,
} as const;

// ============================================
// Funding Rate Thresholds
// ============================================

export const FUNDING_RATE = {
  /** Funding rate above this (0.1%) = crowded longs, potential bearish */
  POSITIVE_EXTREME: 0.001,
  /** Funding rate below this (-0.1%) = crowded shorts, potential bullish */
  NEGATIVE_EXTREME: -0.001,
} as const;

// ============================================
// Score Calculation Weights (for edge function)
// ============================================

export const SCORE_WEIGHTS = {
  TECHNICAL: 0.30,
  ON_CHAIN: 0.25,
  SENTIMENT: 0.25,
  MOMENTUM: 0.20,
} as const;

// ============================================
// Momentum Thresholds
// ============================================

export const MOMENTUM = {
  /** Price change above this % = strong bullish momentum */
  BULLISH_THRESHOLD: 5,
  /** Price change below this % = strong bearish momentum */
  BEARISH_THRESHOLD: -5,
} as const;

// ============================================
// Technical Indicator Parameters
// ============================================

export const TECHNICAL_PARAMS = {
  /** RSI calculation period */
  RSI_PERIOD: 14,
  /** Short-term moving average period */
  MA_SHORT: 50,
  /** Long-term moving average period */
  MA_LONG: 200,
  /** Minimum klines required for analysis */
  MIN_KLINES: 48,
} as const;

// ============================================
// Volume Analysis Thresholds
// ============================================

export const VOLUME_THRESHOLDS = {
  /** Volume change % for bullish signal */
  HIGH_VOLUME: 30,
  /** Price change % above this is significant */
  SIGNIFICANT_PRICE_UP: 2,
  /** Price change % below this is significant */
  SIGNIFICANT_PRICE_DOWN: -2,
  /** Volume threshold for whale detection */
  WHALE_VOLUME: 50,
} as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Determine sentiment classification from bullish score
 */
export function classifySentiment(bullishScore: number): 'bullish' | 'bearish' | 'neutral' {
  if (bullishScore >= SENTIMENT_SCORE.BULLISH_THRESHOLD) return 'bullish';
  if (bullishScore <= SENTIMENT_SCORE.BEARISH_THRESHOLD) return 'bearish';
  return 'neutral';
}

/**
 * Get sentiment color class based on score
 */
export function getSentimentColorClass(score: number): string {
  if (score >= SENTIMENT_SCORE.BULLISH_THRESHOLD) return 'text-green-500';
  if (score <= SENTIMENT_SCORE.BEARISH_THRESHOLD) return 'text-red-500';
  return 'text-yellow-500';
}

/**
 * Get sentiment background class based on score
 */
export function getSentimentBgClass(score: number): string {
  if (score >= SENTIMENT_SCORE.BULLISH_THRESHOLD) return 'bg-green-500/10';
  if (score <= SENTIMENT_SCORE.BEARISH_THRESHOLD) return 'bg-red-500/10';
  return 'bg-yellow-500/10';
}

/**
 * Analyze top trader ratio
 */
export function analyzeTopTraderRatio(ratio: number): 'bullish' | 'bearish' | 'neutral' {
  if (ratio > TOP_TRADER_RATIO.BULLISH) return 'bullish';
  if (ratio < TOP_TRADER_RATIO.BEARISH) return 'bearish';
  return 'neutral';
}

/**
 * Analyze retail ratio (contrarian)
 */
export function analyzeRetailRatio(ratio: number): 'bullish' | 'bearish' | 'neutral' {
  // Contrarian: crowded longs = bearish, crowded shorts = bullish
  if (ratio > RETAIL_RATIO.CROWDED_LONG) return 'bearish';
  if (ratio < RETAIL_RATIO.CROWDED_SHORT) return 'bullish';
  return 'neutral';
}

/**
 * Analyze taker volume ratio
 */
export function analyzeTakerVolume(ratio: number): 'bullish' | 'bearish' | 'neutral' {
  if (ratio > TAKER_VOLUME.BULLISH) return 'bullish';
  if (ratio < TAKER_VOLUME.BEARISH) return 'bearish';
  return 'neutral';
}

/**
 * Analyze funding rate
 */
export function analyzeFundingRate(rate: number): 'positive' | 'negative' | 'neutral' {
  if (rate > FUNDING_RATE.POSITIVE_EXTREME) return 'positive';
  if (rate < FUNDING_RATE.NEGATIVE_EXTREME) return 'negative';
  return 'neutral';
}
