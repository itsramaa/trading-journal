/**
 * Economic Calendar Types
 * Based on Forex Factory API integration
 */

export interface EconomicEvent {
  id: string;
  date: string;
  event: string;
  country: string;
  importance: 'high' | 'medium' | 'low';
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  aiPrediction: string | null;
  cryptoImpact: 'bullish' | 'bearish' | 'neutral' | null;
  /** Historical crypto correlation stats */
  historicalStats?: {
    avgBtcMove2h: number;
    medianBtcMove2h: number;
    maxBtcMove2h: number;
    worstCase2h: number;
    upsideBias: number;
    probMoveGt2Pct: number;
    sampleSize: number;
    volatilitySpikeProb: number;
  } | null;
}

export interface TodayHighlight {
  event: EconomicEvent | null;
  hasEvent: boolean;
  timeUntil: string | null;
}

export interface ImpactSummary {
  hasHighImpact: boolean;
  eventCount: number;
  riskLevel: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  positionAdjustment: 'reduce_50%' | 'reduce_30%' | 'normal';
}

export interface VolatilityEngine {
  riskRegime: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'NORMAL' | 'LOW';
  regimeScore: number;
  expectedRange2h: { low: number; high: number };
  expectedRange24h: { low: number; high: number };
  compositeMoveProbability: number;
  positionSizeMultiplier: number;
  positionSizeReason: string;
  eventCluster: {
    count: number;
    within24h: boolean;
    amplificationFactor: number;
  };
}

export interface EconomicCalendarResponse {
  events: EconomicEvent[];
  todayHighlight: TodayHighlight;
  impactSummary: ImpactSummary;
  volatilityEngine: VolatilityEngine | null;
  lastUpdated: string;
}

// Forex Factory raw response type
export interface ForexFactoryEvent {
  title: string;
  country: string;
  date: string;
  impact: string; // "High", "Medium", "Low", "Holiday", "Non-Economic"
  forecast: string;
  previous: string;
  actual?: string;
}
