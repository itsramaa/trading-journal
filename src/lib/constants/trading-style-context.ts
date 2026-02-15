/**
 * Trading Style Context Configuration
 * Centralized weight profiles, range multipliers, and event sensitivity windows per trading style.
 * 
 * One engine, three context views. The same data sources feed different weight profiles
 * and range horizons depending on the selected trading style.
 */
import type { TradingStyle } from '@/hooks/trading/use-trade-mode';

export interface StyleWeightProfile {
  /** Composite score weights (must sum to 1.0) */
  composite: {
    technical: number;
    onChain: number;
    macro: number;
    fearGreed: number;
  };
  /** Orchestrator multiplier weights (must sum to 1.0) */
  orchestrator: {
    calendar: number;
    regime: number;
    volatility: number;
  };
}

export interface StyleContextConfig {
  weights: StyleWeightProfile;
  /** Label shown in UI: "2h" / "8h" / "24h" */
  rangeHorizonLabel: string;
  /** Fraction of 24h ATR range to display (sqrt-time scaling) */
  rangeBaseMultiplier: number;
  /** How far ahead events matter for this style (hours) */
  eventSensitivityWindowHours: number;
  /** Dynamic label for direction probability */
  directionLabel: string;
  /** Controls whether regime overrides are strict or relaxed */
  regimeRelevance: 'low' | 'medium' | 'high';
}

/**
 * Style Weight Profiles
 * 
 * Composite Weights:
 *                Tech   OnChain  Macro   F&G
 * scalping       0.50   0.15     0.10    0.25
 * short_trade    0.35   0.20     0.25    0.20
 * swing          0.25   0.20     0.35    0.20
 * 
 * Orchestrator Weights:
 *                CalWeight  RegWeight  VolWeight
 * scalping       0.10       0.30       0.60
 * short_trade    0.33       0.34       0.33
 * swing          0.35       0.35       0.30
 */
export const TRADING_STYLE_CONTEXT: Record<TradingStyle, StyleContextConfig> = {
  scalping: {
    weights: {
      composite: { technical: 0.50, onChain: 0.15, macro: 0.10, fearGreed: 0.25 },
      orchestrator: { calendar: 0.10, regime: 0.30, volatility: 0.60 },
    },
    rangeHorizonLabel: '2h',
    rangeBaseMultiplier: 0.12, // sqrt(2/24) approximation
    eventSensitivityWindowHours: 3,
    directionLabel: 'Direction (2h)',
    regimeRelevance: 'low',
  },
  short_trade: {
    weights: {
      composite: { technical: 0.35, onChain: 0.20, macro: 0.25, fearGreed: 0.20 },
      orchestrator: { calendar: 0.33, regime: 0.34, volatility: 0.33 },
    },
    rangeHorizonLabel: '8h',
    rangeBaseMultiplier: 0.40, // sqrt(8/24) approximation
    eventSensitivityWindowHours: 6,
    directionLabel: 'Direction (8h)',
    regimeRelevance: 'medium',
  },
  swing: {
    weights: {
      composite: { technical: 0.25, onChain: 0.20, macro: 0.35, fearGreed: 0.20 },
      orchestrator: { calendar: 0.35, regime: 0.35, volatility: 0.30 },
    },
    rangeHorizonLabel: '24h',
    rangeBaseMultiplier: 1.0,
    eventSensitivityWindowHours: 48,
    directionLabel: 'Direction (24h)',
    regimeRelevance: 'high',
  },
};
