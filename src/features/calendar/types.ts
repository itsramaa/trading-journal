/**
 * Economic Calendar Types
 * Based on Trading Economics API integration
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

export interface EconomicCalendarResponse {
  events: EconomicEvent[];
  todayHighlight: TodayHighlight;
  impactSummary: ImpactSummary;
  lastUpdated: string;
}

// Trading Economics API raw response type
export interface TradingEconomicsEvent {
  Date: string;
  Event: string;
  Country: string;
  Importance: number; // 1 = low, 2 = medium, 3 = high
  Forecast: string | null;
  Previous: string | null;
  Actual: string | null;
  Symbol?: string;
  Category?: string;
}
