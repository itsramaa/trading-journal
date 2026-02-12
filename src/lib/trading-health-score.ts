/**
 * Trading Health Score Calculator
 * Composite 0-100 score combining multiple risk/performance metrics
 */
import { AdvancedRiskMetrics } from './advanced-risk-metrics';

export interface TradingHealthScore {
  overall: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string; // tailwind color token
  breakdown: HealthBreakdownItem[];
}

interface HealthBreakdownItem {
  name: string;
  score: number; // 0-100
  weight: number;
  description: string;
}

/**
 * Calculate composite trading health score
 */
export function calculateTradingHealthScore(
  metrics: AdvancedRiskMetrics,
  winRate: number, // 0-100
  totalTrades: number,
  profitFactor: number
): TradingHealthScore {
  const breakdown: HealthBreakdownItem[] = [];

  // 1. Sharpe Score (20% weight) - measures risk-adjusted returns
  const sharpeScore = clamp(mapRange(metrics.sharpeRatio, -1, 3, 0, 100), 0, 100);
  breakdown.push({
    name: 'Risk-Adjusted Returns',
    score: Math.round(sharpeScore),
    weight: 0.20,
    description: `Sharpe Ratio: ${metrics.sharpeRatio}`,
  });

  // 2. Drawdown Score (20% weight) - lower is better
  const ddScore = clamp(mapRange(metrics.maxDrawdownPercent, 50, 0, 0, 100), 0, 100);
  breakdown.push({
    name: 'Drawdown Control',
    score: Math.round(ddScore),
    weight: 0.20,
    description: `Max DD: ${metrics.maxDrawdownPercent}%`,
  });

  // 3. Win Rate Score (15% weight)
  const wrScore = clamp(mapRange(winRate, 20, 70, 0, 100), 0, 100);
  breakdown.push({
    name: 'Win Rate',
    score: Math.round(wrScore),
    weight: 0.15,
    description: `${winRate.toFixed(1)}%`,
  });

  // 4. Profit Factor Score (15% weight)
  const pfScore = clamp(mapRange(profitFactor, 0.5, 3, 0, 100), 0, 100);
  breakdown.push({
    name: 'Profit Factor',
    score: Math.round(pfScore),
    weight: 0.15,
    description: `${profitFactor.toFixed(2)}`,
  });

  // 5. Consistency Score (15% weight) - based on streaks & recovery
  const streakRatio = metrics.winStreakMax > 0 && metrics.lossStreakMax > 0
    ? metrics.winStreakMax / (metrics.winStreakMax + metrics.lossStreakMax)
    : 0.5;
  const recoveryScore = clamp(mapRange(metrics.recoveryFactor, -1, 5, 0, 100), 0, 100);
  const consistencyScore = (streakRatio * 50 + recoveryScore * 50) / 50;
  breakdown.push({
    name: 'Consistency',
    score: Math.round(clamp(consistencyScore, 0, 100)),
    weight: 0.15,
    description: `Recovery: ${metrics.recoveryFactor}`,
  });

  // 6. Sample Size Score (15% weight) - penalize too few trades
  const sampleScore = clamp(mapRange(totalTrades, 5, 100, 0, 100), 0, 100);
  breakdown.push({
    name: 'Sample Size',
    score: Math.round(sampleScore),
    weight: 0.15,
    description: `${totalTrades} trades`,
  });

  // Weighted average
  const overall = Math.round(
    breakdown.reduce((sum, item) => sum + item.score * item.weight, 0)
  );

  const { grade, label, color } = getGradeInfo(overall);

  return { overall, grade, label, color, breakdown };
}

function getGradeInfo(score: number): { grade: TradingHealthScore['grade']; label: string; color: string } {
  if (score >= 90) return { grade: 'A+', label: 'Excellent', color: 'text-profit' };
  if (score >= 75) return { grade: 'A', label: 'Strong', color: 'text-profit' };
  if (score >= 60) return { grade: 'B', label: 'Good', color: 'text-primary' };
  if (score >= 45) return { grade: 'C', label: 'Average', color: 'text-muted-foreground' };
  if (score >= 30) return { grade: 'D', label: 'Below Average', color: 'text-loss' };
  return { grade: 'F', label: 'Needs Improvement', color: 'text-loss' };
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
