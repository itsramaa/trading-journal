/**
 * Economic Calendar Configuration Constants
 * Centralized patterns and filters for economic event analysis
 */

// ============================================
// High Impact Event Patterns
// ============================================

/** Keyword patterns that indicate high-impact economic events */
export const HIGH_IMPACT_PATTERNS = [
  'FOMC',
  'Federal Reserve',
  'Interest Rate Decision',
  'CPI',
  'Consumer Price Index',
  'NFP',
  'Non-Farm Payrolls',
  'Nonfarm Payrolls',
  'Employment Change',
  'GDP',
  'Gross Domestic Product',
  'PCE',
  'Core PCE',
  'Retail Sales',
  'PMI',
] as const;

// ============================================
// Event Label Priority
// ============================================

/** Priority order for abbreviated event labels */
export const EVENT_LABEL_PRIORITY = [
  { patterns: ['FOMC', 'Federal Reserve'], label: 'FOMC' },
  { patterns: ['CPI', 'Consumer Price'], label: 'CPI' },
  { patterns: ['NFP', 'Payrolls'], label: 'NFP' },
  { patterns: ['GDP'], label: 'GDP' },
  { patterns: ['PCE'], label: 'PCE' },
] as const;

// ============================================
// Date Range Defaults
// ============================================

export const CALENDAR_DATE_RANGE = {
  /** Days to look back for historical events */
  LOOKBACK_DAYS: 90,
  /** Days to look ahead for upcoming events */
  LOOKAHEAD_DAYS: 30,
} as const;

// ============================================
// Risk Level Configuration
// ============================================

export const RISK_LEVELS = {
  VERY_HIGH: 'VERY_HIGH',
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
} as const;

export const RISK_LEVEL_CONFIG = {
  VERY_HIGH: {
    label: 'Very High Impact Day',
    variant: 'destructive' as const,
  },
  HIGH: {
    label: 'High Impact Event',
    variant: 'default' as const,
  },
  MODERATE: {
    label: 'Upcoming High Impact Events',
    variant: 'default' as const,
  },
  LOW: {
    label: 'Low Impact',
    variant: 'secondary' as const,
  },
} as const;

// ============================================
// Position Adjustment Recommendations
// ============================================

export const POSITION_ADJUSTMENTS = {
  REDUCE_50: {
    value: 'reduce_50%',
    message: 'Consider reducing position sizes by 50%.',
  },
  REDUCE_30: {
    value: 'reduce_30%',
    message: 'Consider reducing position sizes by 30%.',
  },
  NORMAL: {
    value: 'normal',
    message: 'Stay alert for potential volatility.',
  },
} as const;

// ============================================
// Importance Configuration
// ============================================

export const IMPORTANCE_CONFIG = {
  high: {
    dotColor: 'bg-loss',
    label: 'High',
  },
  medium: {
    dotColor: 'bg-secondary',
    label: 'Medium',
  },
  low: {
    dotColor: 'bg-profit',
    label: 'Low',
  },
} as const;

// ============================================
// Country Filters (for edge function)
// ============================================

export const COUNTRY_FILTERS = {
  /** Primary countries for crypto-relevant events */
  PRIMARY: ['United States'],
  /** Keywords for Fed-related events */
  FED_KEYWORDS: ['fed', 'fomc', 'powell'],
} as const;

// ============================================
// Edge Function Limits
// ============================================

export const CALENDAR_LIMITS = {
  /** Maximum events to return */
  MAX_EVENTS: 15,
  /** Minimum importance level (Trading Economics scale) */
  MIN_IMPORTANCE: 2,
} as const;

// ============================================
// Importance Mapping (Trading Economics → App)
// ============================================

export const IMPORTANCE_MAP = {
  /** Trading Economics importance >= 3 = high */
  HIGH_THRESHOLD: 3,
  /** Trading Economics importance === 2 = medium */
  MEDIUM_VALUE: 2,
} as const;

// ============================================
// Risk Assessment Thresholds
// ============================================

export const RISK_ASSESSMENT = {
  /** >= this many high-impact events = VERY_HIGH risk */
  VERY_HIGH_THRESHOLD: 2,
  /** === this many high-impact events = HIGH risk */
  HIGH_THRESHOLD: 1,
} as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Check if an event title matches high-impact patterns
 */
export function isHighImpactEvent(title: string): boolean {
  return HIGH_IMPACT_PATTERNS.some(pattern => 
    title.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Get abbreviated label for events
 */
export function getEventLabel(events: string[]): string {
  if (events.length === 0) return '';
  
  // Check priority patterns
  for (const { patterns, label } of EVENT_LABEL_PRIORITY) {
    if (events.some(e => patterns.some(p => e.includes(p)))) {
      return label;
    }
  }
  
  // Multiple misc events
  if (events.length > 1) return `${events.length} Events`;
  
  // Abbreviate single event
  const first = events[0];
  return first.length > 10 ? first.substring(0, 8) + '…' : first;
}

/**
 * Map Trading Economics importance to app importance
 */
export function mapImportance(teImportance: number): 'high' | 'medium' | 'low' {
  if (teImportance >= IMPORTANCE_MAP.HIGH_THRESHOLD) return 'high';
  if (teImportance === IMPORTANCE_MAP.MEDIUM_VALUE) return 'medium';
  return 'low';
}

/**
 * Get position adjustment recommendation
 */
export function getPositionAdjustment(adjustment: string): string {
  switch (adjustment) {
    case POSITION_ADJUSTMENTS.REDUCE_50.value:
      return POSITION_ADJUSTMENTS.REDUCE_50.message;
    case POSITION_ADJUSTMENTS.REDUCE_30.value:
      return POSITION_ADJUSTMENTS.REDUCE_30.message;
    default:
      return POSITION_ADJUSTMENTS.NORMAL.message;
  }
}

/**
 * Assess risk level from high-impact event count
 */
export function assessRiskLevel(highImpactCount: number): keyof typeof RISK_LEVELS {
  if (highImpactCount >= RISK_ASSESSMENT.VERY_HIGH_THRESHOLD) return 'VERY_HIGH';
  if (highImpactCount >= RISK_ASSESSMENT.HIGH_THRESHOLD) return 'HIGH';
  return 'LOW';
}
