/**
 * Unified Risk Orchestrator
 * Combines calendar, regime, and volatility risk signals into a single position multiplier.
 * Uses min(calendar, regime, volatility) — most conservative signal wins.
 */

export interface RiskInputs {
  /** From calendar volatility engine positionSizeMultiplier (0.25-1.0) */
  calendarMultiplier: number;
  /** From regime sizePercent / 100 (0.25-1.0) */
  regimeMultiplier: number;
  /** From realized volatility assessment (0.5-1.0) */
  volatilityMultiplier: number;
}

export interface UnifiedRiskOutput {
  finalMultiplier: number;
  finalSizePercent: number;
  finalSizeLabel: string;
  dominantFactor: 'calendar' | 'regime' | 'volatility';
  breakdown: RiskInputs;
}

export function calculateUnifiedPositionSize(inputs: RiskInputs): UnifiedRiskOutput {
  const finalMultiplier = Math.min(
    inputs.calendarMultiplier,
    inputs.regimeMultiplier,
    inputs.volatilityMultiplier
  );

  let dominantFactor: UnifiedRiskOutput['dominantFactor'] = 'regime';
  if (finalMultiplier === inputs.calendarMultiplier) dominantFactor = 'calendar';
  else if (finalMultiplier === inputs.volatilityMultiplier) dominantFactor = 'volatility';

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
  };
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
