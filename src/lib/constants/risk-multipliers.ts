/**
 * Risk Multipliers Constants
 * Centralized configuration for context-aware risk adjustments
 * Used by useContextAwareRisk hook and related components
 */

// Volatility-based Position Size Multipliers
export const VOLATILITY_MULTIPLIERS: Record<string, number> = {
  EXTREME: 0.5,   // Halve position in extreme volatility
  HIGH: 0.75,     // 75% position in high volatility
  MEDIUM: 1.0,    // Normal position
  LOW: 1.1,       // Can increase slightly in low volatility
};

// Event-based Multipliers (FOMC, NFP, etc.)
export const EVENT_MULTIPLIERS: Record<string, number> = {
  HIGH_IMPACT: 0.5,  // Halve position on high-impact event days
  NORMAL: 1.0,       // No adjustment
};

// Market Sentiment Multipliers (Fear & Greed Index)
export const SENTIMENT_MULTIPLIERS: Record<string, number> = {
  AVOID: 0.5,           // Market bias is AVOID
  EXTREME_FEAR: 0.8,    // F&G < 25
  EXTREME_GREED: 0.9,   // F&G > 75
  NEUTRAL: 1.0,         // Normal sentiment
};

// Fear & Greed Thresholds
export const FEAR_GREED_THRESHOLDS = {
  EXTREME_FEAR: 25,
  EXTREME_GREED: 75,
} as const;

// Momentum Score Thresholds
export const MOMENTUM_THRESHOLDS = {
  STRONG_BULLISH: 70,  // Increase multiplier
  WEAK: 30,            // Decrease multiplier
} as const;

// Momentum Multipliers
export const MOMENTUM_MULTIPLIERS: Record<string, number> = {
  STRONG: 1.1,   // Score >= 70
  WEAK: 0.8,     // Score <= 30
  NEUTRAL: 1.0,  // Normal momentum
};

// Pair Historical Performance Thresholds (Win Rate %)
export const PAIR_PERFORMANCE_THRESHOLDS = {
  STRONG: 60,    // >= 60% win rate
  AVERAGE: 50,   // >= 50% win rate
  BELOW: 40,     // >= 40% win rate
  MIN_TRADES: 3, // Minimum trades for valid sample
} as const;

// Pair Performance Multipliers
export const PAIR_PERFORMANCE_MULTIPLIERS: Record<string, number> = {
  STRONG: 1.15,      // Strong performance on pair
  AVERAGE: 1.0,      // Average performance
  BELOW_AVERAGE: 0.85, // Below average
  POOR: 0.7,         // Poor history
};

// Strategy Performance Thresholds (Win Rate %)
export const STRATEGY_PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 65,   // >= 65% win rate
  GOOD: 55,        // >= 55% win rate
  AVERAGE: 45,     // >= 45% win rate
  BELOW: 35,       // >= 35% win rate
  MIN_TRADES: 3,   // Minimum trades for valid sample
} as const;

// Strategy Performance Multipliers
export const STRATEGY_PERFORMANCE_MULTIPLIERS: Record<string, number> = {
  EXCELLENT: 1.2,
  GOOD: 1.1,
  AVERAGE: 1.0,
  BELOW_AVERAGE: 0.8,
  POOR: 0.6,
};

// Recommendation Thresholds (based on total multiplier)
export const RECOMMENDATION_THRESHOLDS = {
  SIGNIFICANTLY_REDUCE: 0.5,  // < 0.5
  REDUCE: 0.8,                // < 0.8
  SLIGHTLY_REDUCE: 1.0,       // < 1.0
  INCREASE: 1.05,             // > 1.05
} as const;

// ATR Stop Loss Multipliers
export const ATR_STOP_LOSS_CONFIG = {
  TIGHT: {
    key: 'tight',
    label: 'Tight (Risk Level)',
    factor: 'dynamic' as const,
    isRecommended: false,
  },
  STANDARD: {
    key: 'atr1x',
    label: '1x ATR',
    factor: 1.0,
    isRecommended: false,
  },
  RECOMMENDED: {
    key: 'atr15x',
    label: '1.5x ATR (Recommended)',
    factor: 1.5,
    isRecommended: true,
  },
  WIDE: {
    key: 'atr2x',
    label: '2x ATR (Wide)',
    factor: 2.0,
    isRecommended: false,
  },
} as const;

// ATR Period (days)
export const ATR_PERIOD = 14;

// Volatility Level Labels (for UI display)
export const VOLATILITY_LEVEL_LABELS = {
  extreme: 'Extreme',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const;
