/**
 * Strategy Configuration Constants
 * Centralized defaults, colors, and scoring thresholds for strategy system
 */

import type { TradingMethodology, TradingStyle, TradingSession, DifficultyLevel } from '@/types/strategy';

// =============================================================================
// STRATEGY DEFAULTS
// =============================================================================

export const STRATEGY_DEFAULTS = {
  COLOR: 'blue',
  MARKET_TYPE: 'spot' as const,
  STATUS: 'active' as const,
  MIN_CONFLUENCES: 3,
  MIN_RR: 1.5,
  VALID_PAIRS: ['BTC', 'ETH', 'BNB'],
  // Entry rules slice for new strategies
  DEFAULT_ENTRY_RULES_COUNT: 4,
  // YouTube import defaults
  YOUTUBE_MANDATORY_ENTRY_RULES: 2,
  YOUTUBE_MAX_TAGS: 5,
  // Professional trading defaults
  METHODOLOGY: 'price_action' as TradingMethodology,
  TRADING_STYLE: 'day_trading' as TradingStyle,
  SESSION_PREFERENCE: ['all'] as TradingSession[],
  DIFFICULTY_LEVEL: 'intermediate' as DifficultyLevel,
  // Position sizing defaults
  POSITION_SIZING_MODEL: 'fixed_percent' as const,
  POSITION_SIZING_VALUE: 2,
  // Futures defaults
  DEFAULT_LEVERAGE: 1,
  MARGIN_MODE: 'cross' as const,
} as const;

// =============================================================================
// METHODOLOGY OPTIONS
// =============================================================================

export interface MethodologyOption {
  value: TradingMethodology;
  label: string;
  description: string;
}

export const METHODOLOGY_OPTIONS: MethodologyOption[] = [
  { value: 'price_action', label: 'Price Action', description: 'Support/Resistance, candlestick patterns' },
  { value: 'smc', label: 'SMC', description: 'Smart Money Concepts (OB, FVG, BOS)' },
  { value: 'ict', label: 'ICT', description: 'Inner Circle Trader (Killzones, Liquidity)' },
  { value: 'indicator_based', label: 'Indicator-Based', description: 'RSI, MACD, Moving Averages' },
  { value: 'wyckoff', label: 'Wyckoff', description: 'Accumulation/Distribution cycles' },
  { value: 'elliott_wave', label: 'Elliott Wave', description: 'Wave patterns and Fibonacci' },
  { value: 'hybrid', label: 'Hybrid', description: 'Combination of multiple methods' },
];

// =============================================================================
// TRADING STYLE OPTIONS
// =============================================================================

export interface TradingStyleOption {
  value: TradingStyle;
  label: string;
  description: string;
  typicalTimeframes: string;
}

export const TRADING_STYLE_OPTIONS: TradingStyleOption[] = [
  { value: 'scalping', label: 'Scalping', description: 'Quick trades, small profits', typicalTimeframes: '1m-5m' },
  { value: 'day_trading', label: 'Day Trading', description: 'Intraday, close before EOD', typicalTimeframes: '5m-1h' },
  { value: 'swing', label: 'Swing Trading', description: 'Multi-day positions', typicalTimeframes: '1h-1d' },
  { value: 'position', label: 'Position Trading', description: 'Long-term holds', typicalTimeframes: '4h-1w' },
];

// =============================================================================
// SESSION OPTIONS
// =============================================================================

export interface SessionOption {
  value: TradingSession;
  label: string;
  utcHours: string;
}

export const SESSION_OPTIONS: SessionOption[] = [
  { value: 'all', label: 'All Sessions', utcHours: '24h' },
  { value: 'asian', label: 'Asian', utcHours: '00:00-08:00 UTC' },
  { value: 'london', label: 'London', utcHours: '08:00-17:00 UTC' },
  { value: 'ny', label: 'New York', utcHours: '13:00-22:00 UTC' },
];

// =============================================================================
// DIFFICULTY LEVEL OPTIONS
// =============================================================================

export interface DifficultyOption {
  value: DifficultyLevel;
  label: string;
  description: string;
}

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { value: 'beginner', label: 'Beginner', description: 'Simple rules, easy to follow' },
  { value: 'intermediate', label: 'Intermediate', description: 'Moderate complexity' },
  { value: 'advanced', label: 'Advanced', description: 'Complex confluences required' },
];

// =============================================================================
// STRATEGY COLORS
// =============================================================================

export interface StrategyColorConfig {
  name: string;
  value: string;
  className: string;
  borderClassName: string;
}

export const STRATEGY_COLORS: StrategyColorConfig[] = [
  { name: 'Blue', value: 'blue', className: 'bg-primary/10', borderClassName: 'border-l-primary' },
  { name: 'Green', value: 'green', className: 'bg-profit/10', borderClassName: 'border-l-profit' },
  { name: 'Purple', value: 'purple', className: 'bg-[hsl(var(--chart-3))]/10', borderClassName: 'border-l-[hsl(var(--chart-3))]' },
  { name: 'Orange', value: 'orange', className: 'bg-[hsl(var(--chart-4))]/10', borderClassName: 'border-l-[hsl(var(--chart-4))]' },
  { name: 'Red', value: 'red', className: 'bg-loss/10', borderClassName: 'border-l-loss' },
  { name: 'Teal', value: 'teal', className: 'bg-[hsl(var(--chart-1))]/10', borderClassName: 'border-l-[hsl(var(--chart-1))]' },
  { name: 'Pink', value: 'pink', className: 'bg-[hsl(var(--chart-6))]/10', borderClassName: 'border-l-[hsl(var(--chart-6))]' },
  { name: 'Yellow', value: 'yellow', className: 'bg-[hsl(var(--chart-4))]/15', borderClassName: 'border-l-[hsl(var(--chart-4))]' },
];

// Lookup map for quick access by color value
export const STRATEGY_COLOR_CLASSES: Record<string, string> = Object.fromEntries(
  STRATEGY_COLORS.map(c => [c.value, c.className])
);

// Card border classes for strategy cards
export const STRATEGY_CARD_COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-primary/10 text-primary border-primary/30',
  green: 'bg-profit/10 text-profit border-profit/30',
  purple: 'bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3))]/30',
  orange: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30',
  red: 'bg-loss/10 text-loss border-loss/30',
  teal: 'bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1))]/30',
  pink: 'bg-[hsl(var(--chart-6))]/10 text-[hsl(var(--chart-6))] border-[hsl(var(--chart-6))]/30',
  yellow: 'bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30',
};

// =============================================================================
// AI QUALITY SCORE CONFIG
// =============================================================================

export const AI_QUALITY_SCORE_CONFIG = {
  WEIGHTS: {
    WIN_RATE: 0.4,        // 40% weight
    PROFIT_FACTOR: 0.3,   // 30% weight
    CONSISTENCY: 0.2,     // 20% weight
    SAMPLE_SIZE: 0.1,     // 10% weight
  },
  // Normalization factor for profit factor (2.5+ = excellent)
  PROFIT_FACTOR_NORMALIZATION: 2.5,
  // Target trade count for consistency score
  CONSISTENCY_TRADE_TARGET: 20,
  // Minimum trades for sample size bonus
  SAMPLE_SIZE_MINIMUM: 10,
  // Fallback when no losses (infinity handling)
  PROFIT_FACTOR_INFINITY_FALLBACK: 99,
} as const;

// =============================================================================
// QUALITY SCORE THRESHOLDS & LABELS
// =============================================================================

export const QUALITY_SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  NO_DATA: 0,
} as const;

export interface QualityScoreLabel {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  colorClass: string;
}

export const QUALITY_SCORE_LABELS: Record<string, QualityScoreLabel> = {
  EXCELLENT: { label: 'Excellent', variant: 'default', colorClass: 'bg-green-500/20 text-green-500' },
  GOOD: { label: 'Good', variant: 'secondary', colorClass: 'bg-blue-500/20 text-blue-500' },
  FAIR: { label: 'Fair', variant: 'outline', colorClass: 'bg-yellow-500/20 text-yellow-500' },
  NEEDS_WORK: { label: 'Needs Work', variant: 'destructive', colorClass: 'bg-orange-500/20 text-orange-500' },
  NO_DATA: { label: 'No Data', variant: 'outline', colorClass: 'bg-muted text-muted-foreground' },
};

// =============================================================================
// STRATEGY CONTEXT / MARKET FIT CONFIG
// =============================================================================

export const STRATEGY_FIT_CONFIG = {
  // Timeframes considered for volatility matching
  SCALPING_TIMEFRAMES: ['1m', '5m'] as const,
  SWING_TIMEFRAMES: ['4h', '1d', '1w'] as const,
  
  // Session hours (UTC)
  ACTIVE_SESSION_HOURS: {
    EARLY: { start: 0, end: 8 },     // Asian overlap
    LATE: { start: 13, end: 22 },    // London/NY overlap
  },
  
  // Fit score adjustments
  FIT_SCORE_ADJUSTMENTS: {
    BASE: 50,
    VOLATILITY_OPTIMAL: 20,
    VOLATILITY_POOR: -15,
    VOLATILITY_ACCEPTABLE: 5,
    TREND_ALIGNED: 15,
    TREND_COUNTER: -20,
    SESSION_ACTIVE: 10,
    SESSION_OFF: -5,
    EVENT_CLEAR: 10,
    EVENT_AVOID: -20,
    EVENT_CAUTION: -5,
  },
  
  // Overall fit thresholds
  FIT_THRESHOLDS: {
    OPTIMAL: 70,
    POOR: 40,
  },
  
  // Recommendations config
  MIN_TRADES_FOR_RECOMMENDATION: 3,
  WIN_RATE_THRESHOLD_FOR_BEST_PAIRS: 50,
  RECOMMENDED_STRATEGY_THRESHOLD: 60,
} as const;

// =============================================================================
// FORM CONSTRAINTS
// =============================================================================

export const STRATEGY_FORM_CONSTRAINTS = {
  MIN_CONFLUENCES: { MIN: 1, MAX: 10 },
  MIN_RR: { MIN: 0.5, MAX: 10, STEP: 0.1 },
  LEVERAGE: { MIN: 1, MAX: 125 },
} as const;

// =============================================================================
// POSITION SIZING MODELS
// =============================================================================

export interface PositionSizingModelOption {
  value: string;
  label: string;
  description: string;
  defaultValue: number;
  unit: string;
}

export const POSITION_SIZING_MODELS: PositionSizingModelOption[] = [
  { value: 'fixed_percent', label: 'Fixed % Risk', description: 'Risk a fixed percentage of equity per trade', defaultValue: 2, unit: '%' },
  { value: 'fixed_usd', label: 'Fixed USD', description: 'Risk a fixed dollar amount per trade', defaultValue: 100, unit: 'USD' },
  { value: 'kelly', label: 'Kelly Fraction', description: 'Optimal sizing based on win rate and R:R', defaultValue: 0.25, unit: 'fraction' },
  { value: 'atr_based', label: 'ATR-Based', description: 'Size based on Average True Range volatility', defaultValue: 1.5, unit: 'ATR multiplier' },
];

// =============================================================================
// KELLY FRACTION SAFETY
// =============================================================================

export const KELLY_FRACTION_CAP = 0.25;
export const KELLY_MIN_TRADES_WARNING = 50;

// =============================================================================
// ATR PARAMETER DEFAULTS
// =============================================================================

export const ATR_DEFAULTS = {
  PERIOD: { DEFAULT: 14, MIN: 5, MAX: 50 },
  MULTIPLIER: { DEFAULT: 1.5, MIN: 0.5, MAX: 5.0, STEP: 0.1 },
} as const;
