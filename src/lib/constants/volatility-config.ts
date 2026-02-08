/**
 * Volatility Configuration Constants
 * Centralized thresholds for volatility assessment
 * Used by VolatilityMeterWidget and edge functions
 */

// ============================================
// Volatility Level Thresholds (Annualized %)
// ============================================

export const VOLATILITY_LEVELS = {
  /** Below this = low volatility (calm market) */
  LOW: 30,
  /** Below this = medium volatility (normal market) */
  MEDIUM: 60,
  /** Below this = high volatility (volatile market) */
  HIGH: 100,
  /** Above HIGH = extreme volatility */
} as const;

// ============================================
// Volatility Display Configuration
// ============================================

export const VOLATILITY_DISPLAY = {
  /** Maximum value for volatility bar display */
  BAR_MAX: 150,
  /** Thresholds for bar color progression */
  BAR_THRESHOLDS: {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
  },
} as const;

// ============================================
// Market Condition Labels
// ============================================

export const MARKET_CONDITIONS = {
  CALM: { label: 'Calm', colorClass: 'text-blue-500' },
  NORMAL: { label: 'Normal', colorClass: 'text-primary' },
  VOLATILE: { label: 'Volatile', colorClass: 'text-warning' },
  EXTREME: { label: 'Extreme', colorClass: 'text-destructive' },
} as const;

// ============================================
// Volatility Level Configuration
// ============================================

export const VOLATILITY_LEVEL_CONFIG = {
  low: {
    label: 'Low',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    badgeVariant: 'secondary' as const,
    rangeLabel: '<30%',
  },
  medium: {
    label: 'Medium',
    color: 'text-primary',
    bgColor: 'bg-primary',
    badgeVariant: 'default' as const,
    rangeLabel: '30-60%',
  },
  high: {
    label: 'High',
    color: 'text-warning',
    bgColor: 'bg-warning',
    badgeVariant: 'outline' as const,
    rangeLabel: '60-100%',
  },
  extreme: {
    label: 'Extreme',
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    badgeVariant: 'destructive' as const,
    rangeLabel: '>100%',
  },
} as const;

// ============================================
// Edge Function Volatility Thresholds
// ============================================

export const EDGE_VOLATILITY = {
  /** Hourly ATR% above this = high volatility */
  HIGH_ATR_PERCENT: 4,
  /** Hourly ATR% above this = medium volatility */
  MEDIUM_ATR_PERCENT: 2,
} as const;

// ============================================
// Utility Functions
// ============================================

export type VolatilityLevel = 'low' | 'medium' | 'high' | 'extreme';

/**
 * Determine volatility level from annualized volatility percentage
 */
export function getVolatilityLevel(annualizedVolatility: number): VolatilityLevel {
  if (annualizedVolatility < VOLATILITY_LEVELS.LOW) return 'low';
  if (annualizedVolatility < VOLATILITY_LEVELS.MEDIUM) return 'medium';
  if (annualizedVolatility < VOLATILITY_LEVELS.HIGH) return 'high';
  return 'extreme';
}

/**
 * Get market condition based on average volatility
 */
export function getMarketCondition(avgVolatility: number): typeof MARKET_CONDITIONS[keyof typeof MARKET_CONDITIONS] {
  if (avgVolatility < VOLATILITY_LEVELS.LOW) return MARKET_CONDITIONS.CALM;
  if (avgVolatility < VOLATILITY_LEVELS.MEDIUM) return MARKET_CONDITIONS.NORMAL;
  if (avgVolatility < VOLATILITY_LEVELS.HIGH) return MARKET_CONDITIONS.VOLATILE;
  return MARKET_CONDITIONS.EXTREME;
}

/**
 * Get bar color class based on percentage
 */
export function getVolatilityBarColor(percentage: number): string {
  if (percentage < VOLATILITY_DISPLAY.BAR_THRESHOLDS.LOW) return 'bg-blue-500';
  if (percentage < VOLATILITY_DISPLAY.BAR_THRESHOLDS.MEDIUM) return 'bg-primary';
  if (percentage < VOLATILITY_DISPLAY.BAR_THRESHOLDS.HIGH) return 'bg-warning';
  return 'bg-destructive';
}

/**
 * Get volatility level config
 */
export function getVolatilityLevelConfig(level: VolatilityLevel) {
  return VOLATILITY_LEVEL_CONFIG[level];
}

/**
 * Calculate bar percentage for display
 */
export function calculateBarPercentage(value: number, max: number = VOLATILITY_DISPLAY.BAR_MAX): number {
  return Math.min((value / max) * 100, 100);
}
