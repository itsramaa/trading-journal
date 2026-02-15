/**
 * Unified Risk Orchestrator
 * Combines calendar, regime, and volatility risk signals into a single position multiplier.
 * 
 * Style-aware: Applies different weight profiles per trading style.
 * ADAPTIVE logic: Event risk can be directional opportunity when regime is trending.
 * Uses min() only when signals agree on caution; otherwise applies weighted blend.
 * 
 * NOTE: Assumes annualized vol = sqrt(365) * std(daily returns).
 * If the source computes sqrt(365*24) * std(hourly returns), the daily conversion
 * in calendar's volFloor (realizedVolPct / sqrt(365)) will be slightly off.
 */
import type { TradingStyle } from '@/hooks/trading/use-trade-mode';
import { TRADING_STYLE_CONTEXT } from '@/lib/constants/trading-style-context';

export interface RiskInputs {
  /** From calendar volatility engine positionSizeMultiplier (0.25-1.0) */
  calendarMultiplier: number;
  /** From regime sizePercent / 100 (0.25-1.0) */
  regimeMultiplier: number;
  /** From realized volatility assessment (0.5-1.0) */
  volatilityMultiplier: number;
  /** Whether the regime engine sees a directional trend (not RANGING/RISK_OFF) */
  regimeIsTrending?: boolean;
  /** Calendar event risk level for context */
  eventRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  /** Active trading style — shifts orchestrator weights */
  tradingStyle?: TradingStyle;
}

export interface UnifiedRiskOutput {
  finalMultiplier: number;
  finalSizePercent: number;
  finalSizeLabel: string;
  dominantFactor: 'calendar' | 'regime' | 'volatility';
  breakdown: RiskInputs;
  mode: 'defensive' | 'adaptive';
}

export function calculateUnifiedPositionSize(inputs: RiskInputs): UnifiedRiskOutput {
  const { calendarMultiplier, regimeMultiplier, volatilityMultiplier, regimeIsTrending, eventRiskLevel, tradingStyle } = inputs;

  const styleConfig = tradingStyle ? TRADING_STYLE_CONTEXT[tradingStyle] : undefined;
  const ow = styleConfig?.weights.orchestrator ?? { calendar: 0.33, regime: 0.34, volatility: 0.33 };

  // Determine defensive vs adaptive mode
  const isDefensiveMode =
    !regimeIsTrending ||
    eventRiskLevel === 'VERY_HIGH' ||
    volatilityMultiplier <= 0.5;

  let finalMultiplier: number;
  let mode: UnifiedRiskOutput['mode'];

  if (isDefensiveMode) {
    // Defensive: style-weighted blend, floored by min of all three
    // This is more nuanced than pure min() — dominant risk source has more pull
    const weightedBlend = calendarMultiplier * ow.calendar + regimeMultiplier * ow.regime + volatilityMultiplier * ow.volatility;
    const hardFloor = Math.min(calendarMultiplier, regimeMultiplier, volatilityMultiplier);
    // Blend toward the floor: never more optimistic than weighted, never below hard floor
    finalMultiplier = Math.min(weightedBlend, Math.max(hardFloor, weightedBlend * 0.85));
    mode = 'defensive';
  } else {
    // Adaptive: trending regime + event risk = potential directional opportunity
    // Calendar risk is softened based on style weight (scalpers ignore distant events)
    const calSoftening = 1.0 - ow.calendar; // Higher cal weight = less softening
    const adaptiveCalendar = 1.0 - (1.0 - calendarMultiplier) * (1.0 - calSoftening * 0.5);
    const weightedBlend = adaptiveCalendar * ow.calendar + regimeMultiplier * ow.regime + volatilityMultiplier * ow.volatility;
    const hardFloor = Math.min(calendarMultiplier, regimeMultiplier, volatilityMultiplier);
    // Never exceed blend, never go below 70% of the floor (adaptive allows some lift)
    finalMultiplier = Math.min(weightedBlend, Math.max(hardFloor * 0.7 + weightedBlend * 0.3, hardFloor));
    mode = 'adaptive';
  }

  // Never go below 0.25 regardless of mode
  finalMultiplier = Math.max(0.25, Math.min(1.0, finalMultiplier));

  // Determine dominant factor
  let dominantFactor: UnifiedRiskOutput['dominantFactor'] = 'regime';
  const minVal = Math.min(calendarMultiplier, regimeMultiplier, volatilityMultiplier);
  if (calendarMultiplier === minVal) dominantFactor = 'calendar';
  else if (volatilityMultiplier === minVal) dominantFactor = 'volatility';

  const finalSizePercent = Math.round(finalMultiplier * 100);

  let finalSizeLabel: string;
  if (finalSizePercent >= 100) {
    finalSizeLabel = 'Normal (100%)';
  } else if (finalSizePercent >= 70) {
    finalSizeLabel = `Reduce ${100 - finalSizePercent}%`;
  } else if (finalSizePercent >= 50) {
    finalSizeLabel = `Reduce ${100 - finalSizePercent}%`;
  } else {
    finalSizeLabel = `Reduce ${100 - finalSizePercent}% (high risk)`;
  }

  return {
    finalMultiplier,
    finalSizePercent,
    finalSizeLabel,
    dominantFactor,
    breakdown: inputs,
    mode,
  };
}

/**
 * Event decay weight — smooth exponential decay beyond the full-weight window.
 * Within the window: full weight (1.0).
 * Beyond: exponential decay with half-life ≈ 6h (decay constant = 1/6).
 */
export function eventDecayWeight(hoursToEvent: number, fullWeightWindowHours: number): number {
  if (hoursToEvent <= fullWeightWindowHours) return 1.0;
  return Math.exp(-(hoursToEvent - fullWeightWindowHours) / 6);
}

/**
 * Derive a volatility multiplier from realized annualized volatility.
 * BTC annualized vol: <40% = calm, 40-80% = normal, >80% = elevated, >120% = extreme
 */
export function deriveVolatilityMultiplier(annualizedVolPct: number): number {
  if (annualizedVolPct > 120) return 0.5;
  if (annualizedVolPct > 80) return 0.7;
  if (annualizedVolPct > 40) return 1.0;
  return 1.0;
}
