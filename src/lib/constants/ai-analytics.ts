/**
 * AI Analytics Constants
 * Centralized thresholds and configuration for AI-powered trade analysis
 */

// Performance thresholds for insight generation
export const PERFORMANCE_THRESHOLDS = {
  // Win rate benchmarks
  WIN_RATE_STRONG: 60,
  WIN_RATE_GOOD: 55,
  WIN_RATE_POOR: 45,
  WIN_RATE_CRITICAL: 40,
  
  // Profit factor benchmarks
  PROFIT_FACTOR_EXCELLENT: 2,
  PROFIT_FACTOR_GOOD: 1.5,
  PROFIT_FACTOR_POOR: 1.2,
  
  // Streak thresholds
  STREAK_SIGNIFICANT: 3,
  
  // Action item thresholds
  ACTION_WIN_RATE_THRESHOLD: 50,
  ACTION_PROFIT_FACTOR_THRESHOLD: 1.5,
  ACTION_TIME_SLOT_WIN_RATE: 40,
  ACTION_PAIR_LOSS_THRESHOLD: -100,
} as const;

// Data quality thresholds for statistical significance
export const DATA_QUALITY = {
  // Minimum trades for different analysis types
  MIN_TRADES_FOR_RANKING: 3,
  MIN_TRADES_FOR_INSIGHTS: 5,
  MIN_TRADES_FOR_PATTERNS: 10,
  MIN_TRADES_FOR_SESSION: 3,
  MIN_TRADES_FOR_CORRELATION: 3,
  MIN_TRADES_FOR_ZONE_COMPARISON: 5,
  
  // Data quality percentage threshold
  QUALITY_WARNING_PERCENT: 50,
  
  // Minimum pairs for correlation
  MIN_PAIRS_FOR_CORRELATION: 3,
} as const;

// Time analysis configuration
export const TIME_ANALYSIS = {
  // Time slot grouping (hours)
  SLOT_HOURS: 4,
  
  // Recent trades period (days)
  RECENT_DAYS: 30,
  
  // Day labels
  DAY_LABELS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const,
} as const;

// Session comparison thresholds
export const SESSION_THRESHOLDS = {
  // Win rate gap for performance comparison
  PERFORMANCE_GAP_SIGNIFICANT: 15,
  
  // Win rate for session opportunity/warning
  SESSION_OPPORTUNITY_WIN_RATE: 55,
  SESSION_WARNING_WIN_RATE: 45,
  
  // Off-hours analysis
  OFF_HOURS_MIN_TRADES: 5,
} as const;

// Fear/Greed zone boundaries
export const FEAR_GREED_ZONES = {
  EXTREME_FEAR_MAX: 20,
  FEAR_MAX: 40,
  NEUTRAL_MAX: 60,
  GREED_MAX: 80,
  // Above 80 = Extreme Greed
} as const;

// Volatility comparison thresholds
export const VOLATILITY_THRESHOLDS = {
  // Performance difference for volatility insights
  HIGH_VS_LOW_DIFF: 15,
  
  // Event day comparison
  EVENT_DAY_DIFF: 10,
  EVENT_DAY_PNL_MULTIPLIER: 1.5,
} as const;

// Correlation strength classification
export const CORRELATION_STRENGTH = {
  WEAK_THRESHOLD: 0.2,
  MODERATE_THRESHOLD: 0.5,
  STRONG_THRESHOLD: 0.7,
} as const;

// Emotional state thresholds
export const EMOTIONAL_THRESHOLDS = {
  // Win rate by emotional state
  GOOD_WIN_RATE: 60,
  POOR_WIN_RATE: 40,
  REVENGE_WIN_RATE_WARNING: 30,
  
  // Win rate difference for emotional impact insight
  EMOTIONAL_IMPACT_DIFF: 20,
} as const;

/**
 * Classify performance based on win rate
 */
export function classifyWinRate(winRate: number): 'strong' | 'good' | 'average' | 'poor' | 'critical' {
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_STRONG) return 'strong';
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_GOOD) return 'good';
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_POOR) return 'average';
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_CRITICAL) return 'poor';
  return 'critical';
}

/**
 * Classify profit factor
 */
export function classifyProfitFactor(pf: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (pf >= PERFORMANCE_THRESHOLDS.PROFIT_FACTOR_EXCELLENT) return 'excellent';
  if (pf >= PERFORMANCE_THRESHOLDS.PROFIT_FACTOR_GOOD) return 'good';
  if (pf >= PERFORMANCE_THRESHOLDS.PROFIT_FACTOR_POOR) return 'average';
  return 'poor';
}

/**
 * Classify correlation strength
 */
export function classifyCorrelation(value: number): { strength: string; direction: string } {
  const absValue = Math.abs(value);
  const strength = absValue < CORRELATION_STRENGTH.WEAK_THRESHOLD ? 'Weak' 
    : absValue < CORRELATION_STRENGTH.MODERATE_THRESHOLD ? 'Moderate' 
    : 'Strong';
  const direction = value > 0 ? 'Positive' : value < 0 ? 'Negative' : 'None';
  return { strength, direction };
}

/**
 * Get time slot hour from date
 */
export function getTimeSlotHour(date: Date): number {
  return Math.floor(date.getHours() / TIME_ANALYSIS.SLOT_HOURS) * TIME_ANALYSIS.SLOT_HOURS;
}

/**
 * Get day label from date
 */
export function getDayLabel(date: Date): string {
  return TIME_ANALYSIS.DAY_LABELS[date.getDay()];
}

/**
 * Get win rate color class based on threshold
 */
export function getWinRateColorClass(winRate: number): string {
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_STRONG) return 'text-profit';
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_POOR) return 'text-yellow-500';
  return 'text-loss';
}

/**
 * Get progress bar color class based on win rate
 */
export function getProgressBarColorClass(winRate: number): string {
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_STRONG) return '[&>div]:bg-profit';
  if (winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_CRITICAL) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-loss';
}
