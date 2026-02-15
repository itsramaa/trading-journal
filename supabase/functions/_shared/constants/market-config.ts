/**
 * Market Configuration Constants for Edge Functions
 * Single source of truth for market data processing
 * 
 * These constants mirror the frontend constants in src/lib/constants/market-config.ts
 */

// Default symbols for market analysis
export const DEFAULT_WATCHLIST_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT', 
  'SOLUSDT',
  'XRPUSDT',
  'BNBUSDT',
] as const;

// API limits
export const API_LIMITS = {
  MAX_SYMBOLS_PER_REQUEST: 10,
  MAX_EVENTS_PER_REQUEST: 15,
  KLINES_LIMIT: 720, // 30 days hourly = 697 rolling windows for robust P95
} as const;

// Technical analysis periods
export const TECHNICAL_ANALYSIS = {
  RSI_PERIOD: 14,
  MA_SHORT_PERIOD: 50,
  MA_LONG_PERIOD: 200,
  MIN_KLINES_FOR_WHALE: 48,
  VOLATILITY_LOOKBACK: 20,
} as const;

// Momentum thresholds
export const MOMENTUM_THRESHOLDS = {
  STRONG_POSITIVE: 5,
  STRONG_NEGATIVE: -5,
} as const;

// Volume and price thresholds for whale detection
export const WHALE_DETECTION = {
  VOLUME_SPIKE_THRESHOLD: 30,      // 30% volume increase
  EXTREME_VOLUME_SPIKE: 50,        // 50% volume increase
  PRICE_UP_THRESHOLD: 2,           // 2% price increase
  PRICE_DOWN_THRESHOLD: -2,        // 2% price decrease
  BASE_CONFIDENCE: 40,
  SPIKE_CONFIDENCE: 70,
  MAX_CONFIDENCE: 95,
} as const;

// Volatility level thresholds
export const VOLATILITY_THRESHOLDS = {
  HIGH: 4,
  MEDIUM: 2,
  DISPLAY_MULTIPLIER: 12,          // Convert to 0-100 scale
  MAX_DISPLAY_VALUE: 100,
} as const;

// Score calculation weights
export const SCORE_WEIGHTS = {
  TECHNICAL: 0.30,
  ON_CHAIN: 0.25,
  SOCIAL: 0.25,
  MACRO: 0.20,
} as const;

// Sentiment classification thresholds
export const SENTIMENT_THRESHOLDS = {
  BULLISH: 0.60,
  BEARISH: 0.45,
} as const;

// Confidence calculation
export const CONFIDENCE_CONFIG = {
  AGREEMENT_BONUS: 40,
  DISAGREEMENT_BONUS: 20,
  DISTANCE_WEIGHT: 30,
  DATA_QUALITY_WEIGHT: 20,
  BASE_CONFIDENCE: 10,
  MIN_CONFIDENCE: 30,
  MAX_CONFIDENCE: 95,
  HIGH_DATA_QUALITY: 0.95,
  LOW_DATA_QUALITY: 0.70,
  MIN_KLINES_FOR_HIGH_QUALITY: 100,
  AGREEMENT_THRESHOLD: 0.15,
} as const;

// Helper functions
export function classifySentiment(score: number): 'bullish' | 'bearish' | 'neutral' {
  if (score > SENTIMENT_THRESHOLDS.BULLISH) return 'bullish';
  if (score < SENTIMENT_THRESHOLDS.BEARISH) return 'bearish';
  return 'neutral';
}

export function getVolatilityLevel(volatility: number): 'high' | 'medium' | 'low' {
  if (volatility > VOLATILITY_THRESHOLDS.HIGH) return 'high';
  if (volatility > VOLATILITY_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

export function getVolatilityStatus(volatility: number): string {
  if (volatility > VOLATILITY_THRESHOLDS.HIGH) return 'Elevated - caution';
  if (volatility > VOLATILITY_THRESHOLDS.MEDIUM) return 'Normal range';
  return 'Low volatility';
}

export function normalizeVolatilityDisplay(volatility: number): number {
  return Math.min(
    VOLATILITY_THRESHOLDS.MAX_DISPLAY_VALUE,
    Math.round(volatility * VOLATILITY_THRESHOLDS.DISPLAY_MULTIPLIER)
  );
}
