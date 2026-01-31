/**
 * useStrategyContext Hook - Phase 3: Strategy Intelligence
 * Maps strategy fit with current market conditions
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUnifiedMarketScore } from "@/hooks/use-unified-market-score";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";
import type { VolatilityLevel } from "@/types/market-context";

// Match levels for different context factors
export type MatchLevel = 'optimal' | 'acceptable' | 'poor';
export type AlignmentLevel = 'aligned' | 'neutral' | 'counter';
export type SessionMatch = 'active' | 'off_hours';
export type EventRiskLevel = 'clear' | 'caution' | 'avoid';

export interface MarketFit {
  volatilityMatch: MatchLevel;
  trendAlignment: AlignmentLevel;
  sessionMatch: SessionMatch;
  eventRisk: EventRiskLevel;
  overallFit: MatchLevel;
  fitScore: number; // 0-100
}

export interface PairPerformance {
  pair: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

export interface StrategyPerformanceData {
  overallWinRate: number;
  totalTrades: number;
  pairPerformance: PairPerformance[];
  bestTimeframe: string | null;
  avgHoldTime: number | null;
}

export interface PairRecommendation {
  pair: string;
  winRate: number;
  trades: number;
  reason: string;
}

export interface StrategyContextResult {
  strategy: TradingStrategy;
  
  // Market Fit Analysis
  marketFit: MarketFit;
  
  // Historical Performance
  performance: StrategyPerformanceData;
  
  // Pair Recommendations
  recommendations: {
    bestPairs: PairRecommendation[];
    avoidPairs: PairRecommendation[];
    currentPairScore: number | null;
  };
  
  // Validity Check
  isValidForCurrentConditions: boolean;
  validityReasons: string[];
  
  // Loading state
  isLoading: boolean;
}

/**
 * Analyze strategy fit with current market conditions
 */
export function useStrategyContext(
  strategy: TradingStrategy | null,
  currentPair?: string
): StrategyContextResult | null {
  const { user } = useAuth();
  const marketScoreResult = useUnifiedMarketScore({ symbol: currentPair || 'BTCUSDT' });
  
  // Extract needed values from market score
  const volatilityLevel = marketScoreResult.volatilityLabel?.toLowerCase() as VolatilityLevel | undefined;
  const hasHighImpactEvent = marketScoreResult.hasHighImpactEvent;
  const tradingBias = marketScoreResult.bias;

  // Fetch historical trades for this strategy
  const { data: tradesData, isLoading } = useQuery({
    queryKey: ['strategy-trades', strategy?.id, user?.id],
    queryFn: async () => {
      if (!strategy?.id || !user?.id) return null;

      // Get trades linked to this strategy
      const { data: strategyLinks } = await supabase
        .from('trade_entry_strategies')
        .select('trade_entry_id')
        .eq('strategy_id', strategy.id)
        .eq('user_id', user.id);

      if (!strategyLinks || strategyLinks.length === 0) return { trades: [] };

      const tradeIds = strategyLinks.map(l => l.trade_entry_id);

      const { data: trades } = await supabase
        .from('trade_entries')
        .select('id, pair, direction, result, pnl, status, entry_datetime, exit_datetime, chart_timeframe')
        .in('id', tradeIds)
        .eq('status', 'closed');

      return { trades: trades || [] };
    },
    enabled: !!strategy?.id && !!user?.id,
  });

  // Calculate performance metrics
  const performance = useMemo<StrategyPerformanceData>(() => {
    const trades = tradesData?.trades || [];
    
    if (trades.length === 0) {
      return {
        overallWinRate: 0,
        totalTrades: 0,
        pairPerformance: [],
        bestTimeframe: null,
        avgHoldTime: null,
      };
    }

    // Overall stats
    const wins = trades.filter(t => t.result === 'win').length;
    const overallWinRate = (wins / trades.length) * 100;

    // Per-pair performance
    const pairMap = new Map<string, PairPerformance>();
    trades.forEach(trade => {
      const pair = trade.pair;
      const existing = pairMap.get(pair) || {
        pair,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
      };
      
      existing.trades++;
      if (trade.result === 'win') existing.wins++;
      if (trade.result === 'loss') existing.losses++;
      existing.totalPnl += trade.pnl || 0;
      existing.avgPnl = existing.totalPnl / existing.trades;
      existing.winRate = (existing.wins / existing.trades) * 100;
      
      pairMap.set(pair, existing);
    });

    // Timeframe analysis
    const timeframeCounts = new Map<string, number>();
    trades.forEach(t => {
      if (t.chart_timeframe) {
        timeframeCounts.set(t.chart_timeframe, (timeframeCounts.get(t.chart_timeframe) || 0) + 1);
      }
    });
    const bestTimeframe = Array.from(timeframeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Average hold time
    const holdTimes = trades
      .filter(t => t.entry_datetime && t.exit_datetime)
      .map(t => {
        const entry = new Date(t.entry_datetime!).getTime();
        const exit = new Date(t.exit_datetime!).getTime();
        return (exit - entry) / (1000 * 60 * 60); // Hours
      });
    const avgHoldTime = holdTimes.length > 0 
      ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length 
      : null;

    return {
      overallWinRate,
      totalTrades: trades.length,
      pairPerformance: Array.from(pairMap.values()),
      bestTimeframe,
      avgHoldTime,
    };
  }, [tradesData]);

  // Calculate market fit
  const marketFit = useMemo<MarketFit>(() => {
    if (!strategy) {
      return {
        volatilityMatch: 'acceptable',
        trendAlignment: 'neutral',
        sessionMatch: 'active',
        eventRisk: 'clear',
        overallFit: 'acceptable',
        fitScore: 50,
      };
    }

    // Volatility match based on strategy type
    let volatilityMatch: MatchLevel = 'acceptable';
    if (volatilityLevel === 'high') {
      // Scalping/momentum strategies may perform well in high vol
      if (strategy.timeframe === '1m' || strategy.timeframe === '5m') {
        volatilityMatch = 'optimal';
      } else {
        volatilityMatch = 'poor';
      }
    } else if (volatilityLevel === 'low') {
      // Swing strategies prefer low vol
      if (strategy.timeframe === '4h' || strategy.timeframe === '1d' || strategy.timeframe === '1w') {
        volatilityMatch = 'optimal';
      } else {
        volatilityMatch = 'acceptable';
      }
    } else {
      volatilityMatch = 'optimal';
    }

    // Trend alignment based on trading bias
    let trendAlignment: AlignmentLevel = 'neutral';
    if (tradingBias === 'LONG_FAVORABLE' || tradingBias === 'SHORT_FAVORABLE') {
      trendAlignment = 'aligned';
    } else if (tradingBias === 'AVOID') {
      trendAlignment = 'counter';
    }

    // Session match (simplified - could be enhanced with market hours logic)
    const currentHour = new Date().getUTCHours();
    const sessionMatch: SessionMatch = (currentHour >= 0 && currentHour < 8) || (currentHour >= 13 && currentHour < 22) 
      ? 'active' 
      : 'off_hours';

    // Event risk
    let eventRisk: EventRiskLevel = 'clear';
    if (hasHighImpactEvent) {
      eventRisk = 'avoid';
    }

    // Calculate overall fit score
    let fitScore = 50;
    fitScore += volatilityMatch === 'optimal' ? 20 : volatilityMatch === 'poor' ? -15 : 5;
    fitScore += trendAlignment === 'aligned' ? 15 : trendAlignment === 'counter' ? -20 : 0;
    fitScore += sessionMatch === 'active' ? 10 : -5;
    fitScore += eventRisk === 'clear' ? 10 : eventRisk === 'avoid' ? -20 : -5;
    fitScore = Math.max(0, Math.min(100, fitScore));

    // Overall fit level
    let overallFit: MatchLevel = 'acceptable';
    if (fitScore >= 70) overallFit = 'optimal';
    else if (fitScore < 40) overallFit = 'poor';

    return {
      volatilityMatch,
      trendAlignment,
      sessionMatch,
      eventRisk,
      overallFit,
      fitScore,
    };
  }, [strategy, volatilityLevel, tradingBias, hasHighImpactEvent]);

  // Generate pair recommendations
  const recommendations = useMemo(() => {
    const pairPerf = performance.pairPerformance;
    
    // Filter pairs with at least 3 trades for meaningful data
    const validPairs = pairPerf.filter(p => p.trades >= 3);
    
    // Sort by win rate
    const sorted = [...validPairs].sort((a, b) => b.winRate - a.winRate);
    
    // Best pairs (top 3 with >50% win rate)
    const bestPairs: PairRecommendation[] = sorted
      .filter(p => p.winRate >= 50)
      .slice(0, 3)
      .map(p => ({
        pair: p.pair,
        winRate: p.winRate,
        trades: p.trades,
        reason: `${p.winRate.toFixed(0)}% win rate from ${p.trades} trades`,
      }));

    // Avoid pairs (bottom 3 with <50% win rate)
    const avoidPairs: PairRecommendation[] = sorted
      .filter(p => p.winRate < 50)
      .slice(-3)
      .reverse()
      .map(p => ({
        pair: p.pair,
        winRate: p.winRate,
        trades: p.trades,
        reason: `Only ${p.winRate.toFixed(0)}% win rate from ${p.trades} trades`,
      }));

    // Current pair score
    let currentPairScore: number | null = null;
    if (currentPair) {
      const currentPerf = pairPerf.find(p => p.pair === currentPair);
      if (currentPerf && currentPerf.trades >= 3) {
        currentPairScore = currentPerf.winRate;
      }
    }

    return {
      bestPairs,
      avoidPairs,
      currentPairScore,
    };
  }, [performance.pairPerformance, currentPair]);

  // Validity check
  const { isValidForCurrentConditions, validityReasons } = useMemo(() => {
    if (!strategy) {
      return { isValidForCurrentConditions: false, validityReasons: ['No strategy selected'] };
    }

    const reasons: string[] = [];
    let isValid = true;

    // Check volatility
    if (marketFit.volatilityMatch === 'poor') {
      reasons.push(`Current ${volatilityLevel || 'unknown'} volatility doesn't suit ${strategy.timeframe || 'this'} timeframe`);
      isValid = false;
    }

    // Check event risk
    if (marketFit.eventRisk === 'avoid') {
      reasons.push('High-impact economic event today - consider waiting');
      isValid = false;
    }

    // Check trend alignment
    if (marketFit.trendAlignment === 'counter') {
      reasons.push('Current market bias suggests avoiding new positions');
      isValid = false;
    }

    // Check if pair is in avoid list
    if (currentPair && recommendations.avoidPairs.some(p => p.pair === currentPair)) {
      reasons.push(`${currentPair} has poor historical performance with this strategy`);
    }

    // Positive reasons
    if (marketFit.overallFit === 'optimal') {
      reasons.push('Market conditions are optimal for this strategy');
    }
    if (recommendations.currentPairScore && recommendations.currentPairScore >= 60) {
      reasons.push(`Strong ${recommendations.currentPairScore.toFixed(0)}% win rate on ${currentPair}`);
    }

    return { isValidForCurrentConditions: isValid, validityReasons: reasons };
  }, [strategy, marketFit, volatilityLevel, recommendations, currentPair]);

  if (!strategy) return null;

  return {
    strategy,
    marketFit,
    performance,
    recommendations,
    isValidForCurrentConditions,
    validityReasons,
    isLoading: isLoading || marketScoreResult.isLoading,
  };
}

// Helper hook for multiple strategies
export function useStrategiesContext(
  strategies: TradingStrategy[],
  currentPair?: string
) {
  const marketScoreResult = useUnifiedMarketScore({ symbol: currentPair || 'BTCUSDT' });
  
  const volatilityLevel = marketScoreResult.volatilityLabel?.toLowerCase() as VolatilityLevel | undefined;
  const hasHighImpactEvent = marketScoreResult.hasHighImpactEvent;
  const tradingBias = marketScoreResult.bias;

  // Rank strategies by current market fit
  const rankedStrategies = useMemo(() => {
    return strategies
      .map(strategy => {
        let fitScore = 50;

        // Volatility scoring
        if (volatilityLevel === 'high') {
          if (strategy.timeframe === '1m' || strategy.timeframe === '5m') fitScore += 15;
          else fitScore -= 10;
        } else if (volatilityLevel === 'low') {
          if (strategy.timeframe === '4h' || strategy.timeframe === '1d') fitScore += 15;
        } else {
          fitScore += 10;
        }

        // Event risk
        if (hasHighImpactEvent) fitScore -= 20;

        // Trend alignment
        if (tradingBias === 'LONG_FAVORABLE' || tradingBias === 'SHORT_FAVORABLE') {
          fitScore += 15;
        } else if (tradingBias === 'AVOID') {
          fitScore -= 15;
        }

        return {
          strategy,
          fitScore: Math.max(0, Math.min(100, fitScore)),
          isRecommended: fitScore >= 60,
        };
      })
      .sort((a, b) => b.fitScore - a.fitScore);
  }, [strategies, volatilityLevel, hasHighImpactEvent, tradingBias]);

  return {
    rankedStrategies,
    topRecommended: rankedStrategies.filter(s => s.isRecommended).slice(0, 3),
    isLoading: marketScoreResult.isLoading,
  };
}
