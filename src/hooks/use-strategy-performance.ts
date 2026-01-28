/**
 * Hook to calculate strategy performance metrics for AI Quality Score
 */
import { useMemo } from "react";
import { useTradeEntries } from "@/hooks/use-trade-entries";

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
  // Win Rate component (40% weight) - normalized to 0-100
  const winRateScore = Math.min(winRate * 100, 100) * 0.4;

  // Profit Factor component (30% weight) - 1.5+ is good, 2.0+ is excellent
  const pfNormalized = Math.min((profitFactor / 2.5) * 100, 100);
  const pfScore = pfNormalized * 0.3;

  // Consistency component (20% weight) - based on sample size
  // More trades = more reliable signal
  const consistencyScore = Math.min((totalTrades / 20) * 100, 100) * 0.2;

  // Sample size bonus (10% weight) - having 10+ trades is minimum viable
  const sampleSizeScore = totalTrades >= 10 ? 100 * 0.1 : (totalTrades / 10) * 100 * 0.1;

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
      const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? 99 : 0;

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
export function getQualityScoreLabel(score: number): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  colorClass: string;
} {
  if (score >= 80) {
    return { label: 'Excellent', variant: 'default', colorClass: 'bg-green-500/20 text-green-500' };
  } else if (score >= 60) {
    return { label: 'Good', variant: 'secondary', colorClass: 'bg-blue-500/20 text-blue-500' };
  } else if (score >= 40) {
    return { label: 'Fair', variant: 'outline', colorClass: 'bg-yellow-500/20 text-yellow-500' };
  } else if (score > 0) {
    return { label: 'Needs Work', variant: 'destructive', colorClass: 'bg-orange-500/20 text-orange-500' };
  }
  return { label: 'No Data', variant: 'outline', colorClass: 'bg-muted text-muted-foreground' };
}
