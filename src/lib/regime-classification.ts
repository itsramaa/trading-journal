/**
 * Regime Classification Engine
 * Replaces overlapping scores with a single decisional output.
 * Supports style-aware composite weights and range scaling.
 */
import type { TradingStyle } from '@/hooks/trading/use-trade-mode';
import { TRADING_STYLE_CONTEXT, type StyleContextConfig } from '@/lib/constants/trading-style-context';

export type MarketRegime = 'TRENDING_BULL' | 'TRENDING_BEAR' | 'RANGING' | 'HIGH_VOL' | 'RISK_OFF';
export type RiskMode = 'AGGRESSIVE' | 'NEUTRAL' | 'DEFENSIVE';

export interface RegimeStyleContext {
  horizonLabel: string;
  rangeHorizon: string;
  directionLabel: string;
  appliedWeights: { technical: number; onChain: number; macro: number; fearGreed: number };
}

export interface RegimeOutput {
  regime: MarketRegime;
  /** The ONLY score the system exposes. All others are breakdown components. */
  regimeScore: number;
  directionProbability: number;
  expectedRange: { low: number; high: number };
  riskMode: RiskMode;
  sizePercent: number;
  sizeLabel: string;
  breakdown: {
    technical: number;
    macro: number;
    fearGreed: number;
  };
  alignment: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL';
  /** Style context metadata — present when tradingStyle is provided */
  styleContext?: RegimeStyleContext;
}

interface RegimeInput {
  technicalScore: number;
  onChainScore: number;
  macroScore: number;
  fearGreedValue: number;
  overallSentiment: 'bullish' | 'bearish' | 'neutral' | 'cautious';
  macroSentiment: 'bullish' | 'bearish' | 'cautious';
  volatilityLevel?: 'low' | 'medium' | 'high';
  momentum24h?: number;
  eventRiskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  positionSizeAdjustment?: number;
  /** Active trading style — shifts composite weights and range horizon */
  tradingStyle?: TradingStyle;
}

/**
 * Main classification function — single source of truth
 */
export function classifyMarketRegime(input: RegimeInput): RegimeOutput {
  const styleConfig = input.tradingStyle ? TRADING_STYLE_CONTEXT[input.tradingStyle] : undefined;
  const compositeScore = calculateComposite(input, styleConfig);
  const alignment = determineAlignment(input);
  const regime = determineRegime(compositeScore, input, alignment, styleConfig);
  const riskMode = determineRiskMode(regime, alignment, input);
  const directionProbability = calculateDirectionProbability(compositeScore);
  const expectedRange24h = calculateExpectedRange(input, regime);

  // Scale range by style multiplier
  const rangeMultiplier = styleConfig?.rangeBaseMultiplier ?? 1.0;
  const expectedRange = {
    low: Math.round(expectedRange24h.low * rangeMultiplier * 10) / 10,
    high: Math.round(expectedRange24h.high * rangeMultiplier * 10) / 10,
  };

  const { sizePercent, sizeLabel } = calculateSizeAdjustment(riskMode, input);

  const weights = styleConfig?.weights.composite ?? { technical: 0.35, onChain: 0.20, macro: 0.25, fearGreed: 0.20 };

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
    ...(styleConfig && {
      styleContext: {
        horizonLabel: styleConfig.rangeHorizonLabel,
        rangeHorizon: styleConfig.rangeHorizonLabel,
        directionLabel: styleConfig.directionLabel,
        appliedWeights: weights,
      },
    }),
  };
}

/**
 * Non-linear Fear & Greed transformation with contrarian asymmetry.
 */
function transformFearGreed(fg: number): number {
  if (fg <= 20) {
    return 35 + (fg / 20) * 15;
  }
  if (fg >= 80) {
    return 50 + ((fg - 80) / 20) * 15;
  }
  return fg;
}

function calculateComposite(input: RegimeInput, styleConfig?: StyleContextConfig): number {
  const w = styleConfig?.weights.composite ?? { technical: 0.35, onChain: 0.20, macro: 0.25, fearGreed: 0.20 };

  const technical = input.technicalScore * w.technical;
  const onChain = input.onChainScore * w.onChain;
  const macro = input.macroScore * w.macro;
  const fearGreed = transformFearGreed(input.fearGreedValue) * w.fearGreed;
  const linearScore = technical + onChain + macro + fearGreed;

  // Divergence penalty
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
  alignment: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL',
  styleConfig?: StyleContextConfig
): MarketRegime {
  const regimeRelevance = styleConfig?.regimeRelevance ?? 'high';

  // Priority 1: Event risk override — sensitivity varies by style
  if (input.eventRiskLevel === 'VERY_HIGH') {
    return 'RISK_OFF';
  }
  if (input.eventRiskLevel === 'HIGH') {
    // For scalping (low regime relevance), only VERY_HIGH triggers RISK_OFF
    if (regimeRelevance !== 'low') return 'RISK_OFF';
  }

  // Priority 2: Extreme volatility — relaxed for scalping (vol IS their domain)
  if (input.volatilityLevel === 'high') {
    if (regimeRelevance === 'low') {
      // Scalping: high vol is opportunity, not override — only override if RISK_OFF already
    } else {
      return 'HIGH_VOL';
    }
  }

  // Priority 3: Trending
  const momentum = input.momentum24h ?? 0;
  if (compositeScore >= 65 && momentum > 0 && alignment !== 'CONFLICT') {
    return 'TRENDING_BULL';
  }
  if (compositeScore <= 35 && momentum < 0 && alignment !== 'CONFLICT') {
    return 'TRENDING_BEAR';
  }

  return 'RANGING';
}

function determineRiskMode(
  regime: MarketRegime,
  alignment: 'ALIGNED' | 'CONFLICT' | 'NEUTRAL',
  input: RegimeInput
): RiskMode {
  if (regime === 'RISK_OFF' || regime === 'HIGH_VOL') return 'DEFENSIVE';
  if (alignment === 'CONFLICT') return 'DEFENSIVE';
  if (input.volatilityLevel === 'high') return 'DEFENSIVE';
  if (input.eventRiskLevel === 'HIGH' || input.eventRiskLevel === 'VERY_HIGH') return 'DEFENSIVE';
  if ((regime === 'TRENDING_BULL' || regime === 'TRENDING_BEAR') && alignment === 'ALIGNED') return 'AGGRESSIVE';
  return 'NEUTRAL';
}

function calculateDirectionProbability(compositeScore: number): number {
  return Math.round(30 + (compositeScore / 100) * 40);
}

function calculateExpectedRange(
  input: RegimeInput,
  regime: MarketRegime
): { low: number; high: number } {
  // Base 24h range — always computed at 24h horizon, style scaling applied externally
  let baseRange = 2.5;
  if (input.volatilityLevel === 'low') baseRange = 1.5;
  if (input.volatilityLevel === 'high') baseRange = 4.0;

  const regimeMultipliers: Record<string, number> = {
    HIGH_VOL: 1.3,
    RISK_OFF: 1.2,
    TRENDING_BULL: 1.1,
    TRENDING_BEAR: 1.1,
    RANGING: 0.8,
  };
  const multiplier = regimeMultipliers[regime] ?? 1.0;
  const range = baseRange * multiplier;

  const momentum = input.momentum24h ?? 0;
  const skew = Math.max(-0.5, Math.min(0.5, momentum * 0.05));

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
