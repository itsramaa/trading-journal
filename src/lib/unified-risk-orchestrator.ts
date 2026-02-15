/**
 * Unified Risk Orchestrator
 * Combines calendar, regime, and volatility risk signals into a single position multiplier.
 * 
 * ADAPTIVE logic: Event risk can be directional opportunity (e.g., dovish FOMC = bullish explosive).
 * Only reduces size when event risk is genuinely uncertain or regime confirms caution.
 * Uses min() only when signals agree on caution; otherwise applies weighted blend.
 */

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
  const { calendarMultiplier, regimeMultiplier, volatilityMultiplier, regimeIsTrending, eventRiskLevel } = inputs;

  // Determine if we should be purely defensive or adaptive
  // DEFENSIVE: when regime confirms caution OR event risk is extreme
  // ADAPTIVE: when regime is trending and event risk is only elevated (directional opportunity)
  const isDefensiveMode =
    !regimeIsTrending ||
    eventRiskLevel === 'VERY_HIGH' ||
    volatilityMultiplier <= 0.5;

  let finalMultiplier: number;
  let mode: UnifiedRiskOutput['mode'];

  if (isDefensiveMode) {
    // Pure defensive: most conservative signal wins
    finalMultiplier = Math.min(calendarMultiplier, regimeMultiplier, volatilityMultiplier);
    mode = 'defensive';
  } else {
    // Adaptive: trending regime + event risk = potential directional opportunity
    // Calendar risk is softened (weighted 0.4) since event may catalyze the trend
    // Regime and vol still apply normally
    const adaptiveCalendar = 1.0 - (1.0 - calendarMultiplier) * 0.4; // Soften calendar reduction
    finalMultiplier = Math.min(adaptiveCalendar, regimeMultiplier, volatilityMultiplier);
    mode = 'adaptive';
  }

  // Never go below 0.25 regardless of mode
  finalMultiplier = Math.max(0.25, finalMultiplier);

  let dominantFactor: UnifiedRiskOutput['dominantFactor'] = 'regime';
  if (finalMultiplier === Math.min(calendarMultiplier, mode === 'adaptive' ? Infinity : calendarMultiplier)) dominantFactor = 'calendar';
  else if (finalMultiplier <= volatilityMultiplier && volatilityMultiplier <= regimeMultiplier) dominantFactor = 'volatility';

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
 * Derive a volatility multiplier from realized annualized volatility.
 * BTC annualized vol: <40% = calm, 40-80% = normal, >80% = elevated, >120% = extreme
 * 
 * NOTE: Assumes annualized vol = sqrt(365) * std(daily returns).
 * If the source computes sqrt(365*24) * std(hourly returns), the daily conversion
 * in calendar's volFloor (realizedVolPct / sqrt(365)) will be slightly off.
 */
export function deriveVolatilityMultiplier(annualizedVolPct: number): number {
  if (annualizedVolPct > 120) return 0.5;
  if (annualizedVolPct > 80) return 0.7;
  if (annualizedVolPct > 40) return 1.0;
  return 1.0;
}
