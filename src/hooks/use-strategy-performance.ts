/**
 * Hook to calculate strategy performance metrics for AI Quality Score
 */
import { useMemo } from "react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import {
  AI_QUALITY_SCORE_CONFIG,
  QUALITY_SCORE_THRESHOLDS,
  QUALITY_SCORE_LABELS,
  type QualityScoreLabel,
} from "@/lib/constants/strategy-config";

export interface StrategyPerformance {
  strategyId: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  profitFactor: number;
  aiQualityScore: number; // 0-100 score based on performance
}

/**
 * Calculate AI Quality Score based on strategy performance
 * Factors: Win Rate (40%), Profit Factor (30%), Consistency (20%), Sample Size (10%)
 */
function calculateAIQualityScore(
  winRate: number,
  profitFactor: number,
  totalTrades: number
): number {
  const { WEIGHTS, PROFIT_FACTOR_NORMALIZATION, CONSISTENCY_TRADE_TARGET, SAMPLE_SIZE_MINIMUM } = AI_QUALITY_SCORE_CONFIG;

  // Win Rate component (40% weight) - normalized to 0-100
  const winRateScore = Math.min(winRate * 100, 100) * WEIGHTS.WIN_RATE;

  // Profit Factor component (30% weight) - normalized using config
  const pfNormalized = Math.min((profitFactor / PROFIT_FACTOR_NORMALIZATION) * 100, 100);
  const pfScore = pfNormalized * WEIGHTS.PROFIT_FACTOR;

  // Consistency component (20% weight) - based on sample size relative to target
  const consistencyScore = Math.min((totalTrades / CONSISTENCY_TRADE_TARGET) * 100, 100) * WEIGHTS.CONSISTENCY;

  // Sample size bonus (10% weight) - having minimum trades is required
  const sampleSizeScore = totalTrades >= SAMPLE_SIZE_MINIMUM 
    ? 100 * WEIGHTS.SAMPLE_SIZE 
    : (totalTrades / SAMPLE_SIZE_MINIMUM) * 100 * WEIGHTS.SAMPLE_SIZE;

  return Math.round(winRateScore + pfScore + consistencyScore + sampleSizeScore);
}

export function useStrategyPerformance(): Map<string, StrategyPerformance> {
  const { data: trades } = useTradeEntries();

  return useMemo(() => {
    const performanceMap = new Map<string, StrategyPerformance>();

    if (!trades || trades.length === 0) {
      return performanceMap;
    }

    // Group trades by strategy
    const strategyTrades = new Map<string, typeof trades>();

    trades.forEach((trade) => {
      if (trade.status !== 'closed' || !trade.strategies) return;

      trade.strategies.forEach((strategy) => {
        const existing = strategyTrades.get(strategy.id) || [];
        existing.push(trade);
        strategyTrades.set(strategy.id, existing);
      });
    });

    // Calculate metrics for each strategy
    strategyTrades.forEach((strategyTradeList, strategyId) => {
      const wins = strategyTradeList.filter((t) => t.result === 'win').length;
      const losses = strategyTradeList.filter((t) => t.result === 'loss').length;
      const totalTrades = strategyTradeList.length;
      const winRate = totalTrades > 0 ? wins / totalTrades : 0;

      // Calculate profit factor
      const totalWinPnl = strategyTradeList
        .filter((t) => (t.pnl || 0) > 0)
        .reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalLossPnl = Math.abs(
        strategyTradeList
          .filter((t) => (t.pnl || 0) < 0)
          .reduce((sum, t) => sum + (t.pnl || 0), 0)
      );
      const profitFactor = totalLossPnl > 0 
        ? totalWinPnl / totalLossPnl 
        : totalWinPnl > 0 
          ? AI_QUALITY_SCORE_CONFIG.PROFIT_FACTOR_INFINITY_FALLBACK 
          : 0;

      // Calculate avg PnL
      const avgPnl =
        totalTrades > 0
          ? strategyTradeList.reduce((sum, t) => sum + (t.pnl || 0), 0) / totalTrades
          : 0;

      // Calculate AI Quality Score
      const aiQualityScore = calculateAIQualityScore(winRate, profitFactor, totalTrades);

      performanceMap.set(strategyId, {
        strategyId,
        totalTrades,
        wins,
        losses,
        winRate,
        avgPnl,
        profitFactor,
        aiQualityScore,
      });
    });

    return performanceMap;
  }, [trades]);
}

/**
 * Get quality score label and color based on score
 */
export function getQualityScoreLabel(score: number): QualityScoreLabel {
  if (score >= QUALITY_SCORE_THRESHOLDS.EXCELLENT) {
    return QUALITY_SCORE_LABELS.EXCELLENT;
  } else if (score >= QUALITY_SCORE_THRESHOLDS.GOOD) {
    return QUALITY_SCORE_LABELS.GOOD;
  } else if (score >= QUALITY_SCORE_THRESHOLDS.FAIR) {
    return QUALITY_SCORE_LABELS.FAIR;
  } else if (score > QUALITY_SCORE_THRESHOLDS.NO_DATA) {
    return QUALITY_SCORE_LABELS.NEEDS_WORK;
  }
  return QUALITY_SCORE_LABELS.NO_DATA;
}
