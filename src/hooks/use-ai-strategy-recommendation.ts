/**
 * AI Strategy Recommendation Hook
 * Provides intelligent strategy recommendations based on market conditions and trade history
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

export interface StrategyRecommendation {
  strategyId: string;
  strategyName: string;
  confidenceScore: number;
  winRateForPair: number;
  reasoning: string;
  strengths: string[];
  considerations: string[];
}

export interface AIStrategyRecommendationResult {
  recommendations: StrategyRecommendation[];
  marketCondition: string;
  overallAdvice: string;
}

interface StrategyPerformance {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  pairSpecificWinRate: number;
}

export function useAIStrategyRecommendation() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIStrategyRecommendationResult | null>(null);
  const { user } = useAuth();
  const { language } = useLanguage();

  const getRecommendations = async (
    pair: string,
    direction: string,
    strategies: Array<{
      id: string;
      name: string;
      description: string | null;
      timeframe: string | null;
      market_type: string;
      min_confluences: number;
      min_rr: number;
      entry_rules: any[];
      exit_rules: any[];
    }>
  ): Promise<AIStrategyRecommendationResult | null> => {
    if (!user?.id || strategies.length === 0) return null;

    setIsLoading(true);
    try {
      // Fetch user's trade history for performance analysis
      const { data: trades } = await supabase
        .from('trade_entries')
        .select(`
          id, pair, direction, result, pnl, confluence_score,
          trade_entry_strategies(strategy_id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .order('trade_date', { ascending: false })
        .limit(100);

      // Calculate performance per strategy
      const strategyPerformance: Map<string, StrategyPerformance> = new Map();

      strategies.forEach(s => {
        strategyPerformance.set(s.id, {
          strategyId: s.id,
          strategyName: s.name,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          avgPnl: 0,
          pairSpecificWinRate: 0,
        });
      });

      // Analyze trades by strategy
      trades?.forEach(trade => {
        const strategyLinks = trade.trade_entry_strategies as any[];
        strategyLinks?.forEach(link => {
          const perf = strategyPerformance.get(link.strategy_id);
          if (perf) {
            perf.totalTrades++;
            if (trade.result === 'win') perf.wins++;
            if (trade.result === 'loss') perf.losses++;
            perf.avgPnl = (perf.avgPnl * (perf.totalTrades - 1) + (trade.pnl || 0)) / perf.totalTrades;
          }
        });
      });

      // Calculate pair-specific win rates
      const pairTrades = trades?.filter(t => t.pair === pair) || [];
      strategies.forEach(s => {
        const perf = strategyPerformance.get(s.id);
        if (perf) {
          const pairStrategyTrades = pairTrades.filter(t => 
            (t.trade_entry_strategies as any[])?.some(link => link.strategy_id === s.id)
          );
          const pairWins = pairStrategyTrades.filter(t => t.result === 'win').length;
          perf.pairSpecificWinRate = pairStrategyTrades.length > 0 
            ? (pairWins / pairStrategyTrades.length) * 100 
            : 50; // Default to 50% if no history
          perf.winRate = perf.totalTrades > 0 
            ? (perf.wins / perf.totalTrades) * 100 
            : 50;
        }
      });

      // Generate AI recommendations based on performance data
      const recommendations: StrategyRecommendation[] = strategies
        .map(s => {
          const perf = strategyPerformance.get(s.id)!;
          
          // Calculate confidence based on multiple factors
          let confidence = 50; // Base
          
          // Historical win rate contribution (up to 30 points)
          confidence += Math.min(30, (perf.winRate / 100) * 30);
          
          // Pair-specific performance (up to 20 points)
          confidence += Math.min(20, (perf.pairSpecificWinRate / 100) * 20);
          
          // Strategy quality factors
          if ((s.entry_rules?.length || 0) >= 4) confidence += 5;
          if ((s.min_rr || 0) >= 1.5) confidence += 5;
          if (s.timeframe) confidence += 3;
          
          // Sample size penalty (reduce confidence if few trades)
          if (perf.totalTrades < 5) confidence *= 0.8;
          if (perf.totalTrades < 2) confidence *= 0.8;

          const strengths: string[] = [];
          const considerations: string[] = [];

          if (perf.winRate >= 60) strengths.push(`${perf.winRate.toFixed(0)}% overall win rate`);
          if (perf.pairSpecificWinRate >= 60) strengths.push(`Strong performance on ${pair}`);
          if ((s.entry_rules?.length || 0) >= 4) strengths.push('Well-defined entry rules');
          if ((s.min_rr || 0) >= 2) strengths.push('Excellent risk-reward ratio');

          if (perf.totalTrades < 5) considerations.push('Limited trade history');
          if (perf.winRate < 40) considerations.push('Below-average win rate');
          if (!s.timeframe) considerations.push('No specific timeframe defined');

          return {
            strategyId: s.id,
            strategyName: s.name,
            confidenceScore: Math.round(Math.min(100, Math.max(0, confidence))),
            winRateForPair: perf.pairSpecificWinRate,
            reasoning: generateReasoning(s.name, perf, pair, direction),
            strengths,
            considerations,
          };
        })
        .sort((a, b) => b.confidenceScore - a.confidenceScore);

      const aiResult: AIStrategyRecommendationResult = {
        recommendations,
        marketCondition: 'Normal volatility', // Would come from market data API
        overallAdvice: recommendations.length > 0 && recommendations[0].confidenceScore >= 70
          ? `${recommendations[0].strategyName} shows the strongest alignment with your trading history on ${pair}.`
          : 'Consider reviewing your strategy performance and refining entry rules before trading.',
      };

      setResult(aiResult);
      return aiResult;
    } catch (error) {
      console.error('AI Strategy Recommendation error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getRecommendations,
    isLoading,
    result,
    clearResult: () => setResult(null),
  };
}

function generateReasoning(
  strategyName: string,
  perf: StrategyPerformance,
  pair: string,
  direction: string
): string {
  const parts: string[] = [];

  if (perf.totalTrades >= 10) {
    parts.push(`Based on ${perf.totalTrades} historical trades`);
  } else if (perf.totalTrades >= 5) {
    parts.push(`With ${perf.totalTrades} trades in your history`);
  } else {
    parts.push('Limited trade data available');
  }

  if (perf.pairSpecificWinRate >= 60) {
    parts.push(`strong ${pair} performance (${perf.pairSpecificWinRate.toFixed(0)}% win rate)`);
  } else if (perf.pairSpecificWinRate >= 40) {
    parts.push(`moderate ${pair} performance`);
  } else {
    parts.push(`mixed results on ${pair}`);
  }

  return parts.join(', ') + '.';
}
