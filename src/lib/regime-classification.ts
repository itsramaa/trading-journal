/**
 * Regime Classification Engine
 * Replaces overlapping scores with a single decisional output
 * Uses existing calculateCompositeScore and calculateTradingBias as inputs
 */

export type MarketRegime = 'TRENDING_BULL' | 'TRENDING_BEAR' | 'RANGING' | 'HIGH_VOL' | 'RISK_OFF';
export type RiskMode = 'AGGRESSIVE' | 'NEUTRAL' | 'DEFENSIVE';

export interface RegimeOutput {
  regime: MarketRegime;
  /** The ONLY score the system exposes. All others are breakdown components. */
  regimeScore: number;
  directionProbability: number; // % upside probability (30-70 range)
  expectedRange: { low: number; high: number }; // % expected move
  riskMode: RiskMode;
  sizePercent: number; // 25-100
  sizeLabel: string;
  /** Breakdown scores used for transparency — NOT independent scores */
  breakdown: {
    technical: number;
    macro: number;
    fearGreed: number;
  };
  alignment: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL';
}

interface RegimeInput {
  technicalScore: number; // 0-100
  onChainScore: number; // 0-100
  macroScore: number; // 0-100
  fearGreedValue: number; // 0-100
  overallSentiment: 'bullish' | 'bearish' | 'neutral' | 'cautious';
  macroSentiment: 'bullish' | 'bearish' | 'cautious';
  volatilityLevel?: 'low' | 'medium' | 'high';
  momentum24h?: number; // price change %
  eventRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  positionSizeAdjustment?: number; // from combined analysis
}

/**
 * Main classification function — single source of truth
 */
export function classifyMarketRegime(input: RegimeInput): RegimeOutput {
  const compositeScore = calculateComposite(input);
  const alignment = determineAlignment(input);
  const regime = determineRegime(compositeScore, input, alignment);
  const riskMode = determineRiskMode(regime, alignment, input);
  const directionProbability = calculateDirectionProbability(compositeScore);
  const expectedRange = calculateExpectedRange(input, regime);
  const { sizePercent, sizeLabel } = calculateSizeAdjustment(riskMode, input);

  return {
    regime,
    regimeScore: compositeScore,
    directionProbability,
    expectedRange,
    riskMode,
    sizePercent,
    sizeLabel,
    breakdown: {
      technical: input.technicalScore,
      macro: input.macroScore,
      fearGreed: input.fearGreedValue,
    },
    alignment,
  };
}

/**
 * Non-linear Fear & Greed transformation with contrarian asymmetry.
 * 
 * Extreme fear (<20): Contrarian bullish signal — pulls composite toward neutral (50),
 * not deeper bearish. Historically, F&G < 15 is a bottoming zone.
 * 
 * Extreme greed (>80): Contrarian bearish signal — pulls composite toward neutral,
 * not higher. Historically, F&G > 85 is a topping zone.
 * 
 * Normal range (20-80): Linear pass-through.
 */
function transformFearGreed(fg: number): number {
  if (fg <= 20) {
    // Extreme fear → contrarian bullish: compress toward 35-50 instead of 0-15
    // fg=0 → 35, fg=10 → 42.5, fg=20 → 50 (meets normal range boundary)
    return 35 + (fg / 20) * 15;
  }
  if (fg >= 80) {
    // Extreme greed → contrarian bearish: compress toward 50-65 instead of 80-100
    // fg=80 → 50, fg=90 → 57.5, fg=100 → 65
    return 50 + ((fg - 80) / 20) * 15;
  }
  return fg; // normal range: pass-through
}

function calculateComposite(input: RegimeInput): number {
  // Pure signal composite — event risk and volatility are NOT included here.
  // They act as regime overrides only (determineRegime), preventing double-counting.
  const technical = input.technicalScore * 0.35;
  const onChain = input.onChainScore * 0.20;
  const macro = input.macroScore * 0.25;
  const fearGreed = transformFearGreed(input.fearGreedValue) * 0.20;
  const linearScore = technical + onChain + macro + fearGreed;

  // Divergence penalty: disagreement among components = uncertainty
  const components = [input.technicalScore, input.onChainScore, input.macroScore, transformFearGreed(input.fearGreedValue)];
  const mean = components.reduce((a, b) => a + b, 0) / components.length;
  const variance = components.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / components.length;
  const divergencePenalty = Math.min(5, (variance / 500));
  const adjusted = linearScore > 50
    ? linearScore - divergencePenalty
    : linearScore + divergencePenalty;

  return Math.round(Math.max(0, Math.min(100, adjusted)));
}

function determineAlignment(input: RegimeInput): 'ALIGNED' | 'CONFLICT' | 'NEUTRAL' {
  const cryptoBullish = input.overallSentiment === 'bullish';
  const cryptoBearish = input.overallSentiment === 'bearish';
  const macroBullish = input.macroSentiment === 'bullish';
  const macroBearish = input.macroSentiment === 'bearish';

  if ((cryptoBullish && macroBullish) || (cryptoBearish && macroBearish)) return 'ALIGNED';
  if ((cryptoBullish && macroBearish) || (cryptoBearish && macroBullish)) return 'CONFLICT';
  return 'NEUTRAL';
}

function determineRegime(
  compositeScore: number,
  input: RegimeInput,
  alignment: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL'
): MarketRegime {
  // Priority 1: Event risk override (highest priority)
  if (input.eventRiskLevel === 'VERY_HIGH' || input.eventRiskLevel === 'HIGH') {
    return 'RISK_OFF';
  }
  // Priority 2: Extreme volatility override — NO alignment exception.
  // A trending bull with FOMC in 6h + 3x vol should NOT be TRENDING_BULL.
  if (input.volatilityLevel === 'high') {
    return 'HIGH_VOL';
  }
  // Priority 3: Trending (requires conviction + momentum + no conflict)
  const momentum = input.momentum24h ?? 0;
  if (compositeScore >= 65 && momentum > 0 && alignment !== 'CONFLICT') {
    return 'TRENDING_BULL';
  }
  if (compositeScore <= 35 && momentum < 0 && alignment !== 'CONFLICT') {
    return 'TRENDING_BEAR';
  }
  // Default
  return 'RANGING';
}

function determineRiskMode(
  regime: MarketRegime,
  alignment: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL',
  input: RegimeInput
): RiskMode {
  if (regime === 'RISK_OFF' || regime === 'HIGH_VOL') return 'DEFENSIVE';
  if (alignment === 'CONFLICT') return 'DEFENSIVE';
  // Guard: even if trending+aligned, extreme vol or high events force defensive
  if (input.volatilityLevel === 'high') return 'DEFENSIVE';
  if (input.eventRiskLevel === 'HIGH' || input.eventRiskLevel === 'VERY_HIGH') return 'DEFENSIVE';
  if ((regime === 'TRENDING_BULL' || regime === 'TRENDING_BEAR') && alignment === 'ALIGNED') return 'AGGRESSIVE';
  return 'NEUTRAL';
}

/**
 * Maps composite score to upside probability
 * Clamped to 30-70% range — never extreme
 */
function calculateDirectionProbability(compositeScore: number): number {
  // Linear map: score 0 → 30%, score 50 → 50%, score 100 → 70%
  return Math.round(30 + (compositeScore / 100) * 40);
}

/**
 * Expected range based on volatility + momentum + regime
 */
function calculateExpectedRange(
  input: RegimeInput,
  regime: MarketRegime
): { low: number; high: number } {
  // Fixed ATR-based range — volatility level sets the base,
  // regime multiplier is SMALL to avoid double-amplifying volatility.
  // Historical BTC: median 24h ≈ 2-3%, P95 ≈ 6-8%
  let baseRange = 2.5; // default medium
  if (input.volatilityLevel === 'low') baseRange = 1.5;
  if (input.volatilityLevel === 'high') baseRange = 4.0;

  // Small regime multipliers — NOT double-counting volatility
  // HIGH_VOL already has elevated baseRange, so multiplier is modest
  const regimeMultipliers: Record<string, number> = {
    HIGH_VOL: 1.3,    // Was 2.0 — 4.0 * 1.3 = 5.2% (realistic P90)
    RISK_OFF: 1.2,    // Slightly wider for uncertainty
    TRENDING_BULL: 1.1,
    TRENDING_BEAR: 1.1,
    RANGING: 0.8,
  };
  const multiplier = regimeMultipliers[regime] ?? 1.0;
  const range = baseRange * multiplier;

  // Momentum shifts center (skew), does NOT expand total range
  const momentum = input.momentum24h ?? 0;
  const skew = Math.max(-0.5, Math.min(0.5, momentum * 0.05)); // Capped skew

  return {
    low: Math.round((-range + skew) * 10) / 10,
    high: Math.round((range + skew) * 10) / 10,
  };
}

function calculateSizeAdjustment(
  riskMode: RiskMode,
  input: RegimeInput
): { sizePercent: number; sizeLabel: string } {
  switch (riskMode) {
    case 'AGGRESSIVE':
      return { sizePercent: 100, sizeLabel: 'Normal (100%)' };
    case 'NEUTRAL':
      return { sizePercent: 70, sizeLabel: 'Reduce 30%' };
    case 'DEFENSIVE':
      // Further reduce for extreme events
      if (input.eventRiskLevel === 'VERY_HIGH') {
        return { sizePercent: 25, sizeLabel: 'Reduce 75% (extreme event risk)' };
      }
      return { sizePercent: 50, sizeLabel: 'Reduce 50%' };
    default:
      return { sizePercent: 70, sizeLabel: 'Reduce 30%' };
  }
}

// Regime display helpers
export const REGIME_CONFIG: Record<MarketRegime, { label: string; colorClass: string; bgClass: string }> = {
  TRENDING_BULL: { label: 'Trending Bullish', colorClass: 'text-profit', bgClass: 'bg-profit/10 border-profit/30' },
  TRENDING_BEAR: { label: 'Trending Bearish', colorClass: 'text-loss', bgClass: 'bg-loss/10 border-loss/30' },
  RANGING: { label: 'Ranging', colorClass: 'text-muted-foreground', bgClass: 'bg-muted/50 border-muted-foreground/30' },
  HIGH_VOL: { label: 'High Volatility', colorClass: 'text-chart-4', bgClass: 'bg-chart-4/10 border-chart-4/30' },
  RISK_OFF: { label: 'Risk Off', colorClass: 'text-loss', bgClass: 'bg-loss/10 border-loss/30' },
};

export const RISK_MODE_CONFIG: Record<RiskMode, { label: string; colorClass: string }> = {
  AGGRESSIVE: { label: 'Aggressive', colorClass: 'text-profit' },
  NEUTRAL: { label: 'Neutral', colorClass: 'text-muted-foreground' },
  DEFENSIVE: { label: 'Defensive', colorClass: 'text-loss' },
};
