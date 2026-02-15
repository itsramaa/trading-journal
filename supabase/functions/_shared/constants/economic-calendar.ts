/**
 * Economic Calendar Constants for Edge Functions
 * Single source of truth for economic event processing
 * 
 * These constants mirror the frontend constants in src/lib/constants/economic-calendar.ts
 */

// Event importance thresholds
export const IMPORTANCE_THRESHOLDS = {
  HIGH: 3,      // Importance >= 3 = high
  MEDIUM: 2,    // Importance = 2 = medium
  // Importance < 2 = low
} as const;

// Risk level configuration
export const RISK_LEVEL_CONFIG = {
  VERY_HIGH: {
    minHighImpactToday: 2,
    riskLevel: 'VERY_HIGH',
    positionAdjustment: 'reduce_50%',
  },
  HIGH: {
    minHighImpactToday: 1,
    riskLevel: 'HIGH',
    positionAdjustment: 'reduce_30%',
  },
  MODERATE: {
    hasHighImpactWeek: true,
    riskLevel: 'MODERATE',
    positionAdjustment: 'normal',
  },
  LOW: {
    riskLevel: 'LOW',
    positionAdjustment: 'normal',
  },
} as const;

// Event filter configuration
export const EVENT_FILTERS = {
  // Countries to include
  COUNTRIES: ['United States'],
  
  // Keywords that indicate Fed/FOMC events (always include regardless of country)
  FED_KEYWORDS: ['fed', 'fomc', 'powell'],
  
  // Minimum importance to include
  MIN_IMPORTANCE: 2,
} as const;

// Display limits
export const DISPLAY_LIMITS = {
  MAX_EVENTS: 15,
  MAX_AI_PREDICTIONS: 5,
} as const;

// Time windows
export const TIME_WINDOWS = {
  WEEK_DAYS: 7,
} as const;

// Volatility Engine Configuration
export const VOLATILITY_ENGINE = {
  REGIME_THRESHOLDS: {
    EXTREME: { minProbability: 85, minHighEvents: 2 },
    HIGH: { minProbability: 70, minHighEvents: 1 },
    ELEVATED: { minProbability: 50, minHighEvents: 0 },
    NORMAL: { minProbability: 0, minHighEvents: 0 },
    LOW: { maxEvents: 0 },
  },
  POSITION_MULTIPLIERS: {
    EXTREME: 0.25,
    HIGH: 0.5,
    ELEVATED: 0.7,
    NORMAL: 1.0,
    LOW: 1.1,
  },
  CLUSTER_AMPLIFICATION: {
    TWO_EVENTS: 1.2,
    THREE_PLUS: 1.4,
  },
  RANGE_EXPANSION: {
    CLUSTER_FACTOR: 1.3,
    BASE_24H_MULTIPLIER: 1.8,
  },
} as const;

// Helper functions
export function mapImportance(importance: number): 'high' | 'medium' | 'low' {
  if (importance >= IMPORTANCE_THRESHOLDS.HIGH) return 'high';
  if (importance >= IMPORTANCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

export function isRelevantEvent(
  country: string,
  eventName: string,
  importance: number
): boolean {
  const isTargetCountry = EVENT_FILTERS.COUNTRIES.includes(country);
  const eventLower = eventName.toLowerCase();
  const isFedEvent = EVENT_FILTERS.FED_KEYWORDS.some(keyword => 
    eventLower.includes(keyword)
  );
  const meetsImportance = importance >= EVENT_FILTERS.MIN_IMPORTANCE;
  
  return (isTargetCountry || isFedEvent) && meetsImportance;
}

export function calculateRiskLevel(
  todayHighImpactCount: number,
  weekHighImpactCount: number
): {
  hasHighImpact: boolean;
  eventCount: number;
  riskLevel: string;
  positionAdjustment: string;
} {
  if (todayHighImpactCount >= RISK_LEVEL_CONFIG.VERY_HIGH.minHighImpactToday) {
    return {
      hasHighImpact: true,
      eventCount: todayHighImpactCount,
      riskLevel: RISK_LEVEL_CONFIG.VERY_HIGH.riskLevel,
      positionAdjustment: RISK_LEVEL_CONFIG.VERY_HIGH.positionAdjustment,
    };
  }
  
  if (todayHighImpactCount >= RISK_LEVEL_CONFIG.HIGH.minHighImpactToday) {
    return {
      hasHighImpact: true,
      eventCount: todayHighImpactCount,
      riskLevel: RISK_LEVEL_CONFIG.HIGH.riskLevel,
      positionAdjustment: RISK_LEVEL_CONFIG.HIGH.positionAdjustment,
    };
  }
  
  if (weekHighImpactCount > 0) {
    return {
      hasHighImpact: true,
      eventCount: weekHighImpactCount,
      riskLevel: RISK_LEVEL_CONFIG.MODERATE.riskLevel,
      positionAdjustment: RISK_LEVEL_CONFIG.MODERATE.positionAdjustment,
    };
  }
  
  return {
    hasHighImpact: false,
    eventCount: 0,
    riskLevel: RISK_LEVEL_CONFIG.LOW.riskLevel,
    positionAdjustment: RISK_LEVEL_CONFIG.LOW.positionAdjustment,
  };
}
