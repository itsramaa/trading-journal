/**
 * useContextAwareRisk Hook
 * Combines volatility, events, momentum, and historical performance
 * to auto-adjust position sizing based on market conditions
 */

import { useMemo } from "react";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useUnifiedMarketScore } from "@/hooks/use-unified-market-score";
import { useBinanceVolatility } from "@/features/binance/useBinanceAdvancedAnalytics";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { DEFAULT_RISK_VALUES } from "@/lib/constants/risk-thresholds";
import {
  VOLATILITY_MULTIPLIERS,
  EVENT_MULTIPLIERS,
  SENTIMENT_MULTIPLIERS,
  FEAR_GREED_THRESHOLDS,
  MOMENTUM_THRESHOLDS,
  MOMENTUM_MULTIPLIERS,
  PAIR_PERFORMANCE_THRESHOLDS,
  PAIR_PERFORMANCE_MULTIPLIERS,
  STRATEGY_PERFORMANCE_THRESHOLDS,
  STRATEGY_PERFORMANCE_MULTIPLIERS,
  RECOMMENDATION_THRESHOLDS,
} from "@/lib/constants/risk-multipliers";

export type AdjustmentLevel = 'positive' | 'neutral' | 'warning' | 'danger';

export interface AdjustmentFactor {
  id: string;
  name: string;
  multiplier: number;
  reason: string;
  level: AdjustmentLevel;
  value?: string;
}

export interface ContextAwareRiskResult {
  // Base values
  baseRisk: number;
  
  // Calculated adjustments
  adjustedRisk: number;
  totalMultiplier: number;
  adjustmentFactors: AdjustmentFactor[];
  
  // Recommendation
  recommendation: 'significantly_reduce' | 'reduce' | 'slightly_reduce' | 'normal' | 'increase';
  recommendationLabel: string;
  
  // Loading state
  isLoading: boolean;
  
  // Individual factor values (for direct access)
  volatilityMultiplier: number;
  eventMultiplier: number;
  sentimentMultiplier: number;
  momentumMultiplier: number;
  performanceMultiplier: number;
  strategyMultiplier: number; // NEW: Strategy-specific multiplier
  
  // Context flags
  hasHighImpactEvent: boolean;
  volatilityLevel: string;
  marketBias: string;
  
  // Historical performance context
  pairWinRate: number | null;
  pairTradeCount: number;
  strategyWinRate: number | null; // NEW: Strategy-specific win rate
  strategyTradeCount: number; // NEW: Strategy-specific trade count
}

interface UseContextAwareRiskOptions {
  symbol?: string;
  strategyId?: string; // NEW: Strategy ID for strategy-specific performance
  baseRiskPercent?: number;
  enabled?: boolean;
}

export function useContextAwareRisk(
  options: UseContextAwareRiskOptions = {}
): ContextAwareRiskResult {
  const { symbol = 'BTCUSDT', strategyId, baseRiskPercent, enabled = true } = options;

  // Fetch required data
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { 
    score, 
    bias, 
    components, 
    volatilityLabel,
    hasHighImpactEvent,
    isLoading: marketLoading,
  } = useUnifiedMarketScore({ symbol, enabled });
  const { data: volatilityData, isLoading: volLoading } = useBinanceVolatility(symbol);
  const { data: tradeEntries, isLoading: tradesLoading } = useTradeEntries();
  // Use centralized default risk value
  const baseRisk = baseRiskPercent ?? riskProfile?.risk_per_trade_percent ?? DEFAULT_RISK_VALUES.RISK_PER_TRADE;

  // Calculate historical performance for this pair
  const pairPerformance = useMemo(() => {
    if (!tradeEntries || tradeEntries.length === 0) {
      return { winRate: null, tradeCount: 0 };
    }

    // Normalize symbol for matching (handle BTCUSDT, BTC/USDT, BTC variations)
    const normalizedSymbol = symbol.replace('/', '').replace('USDT', '').replace('BUSD', '');
    
    const pairTrades = tradeEntries.filter(trade => {
      const tradePair = trade.pair.replace('/', '').replace('USDT', '').replace('BUSD', '');
      return tradePair === normalizedSymbol && trade.status === 'closed';
    });

    // Use centralized minimum trade count
    if (pairTrades.length < PAIR_PERFORMANCE_THRESHOLDS.MIN_TRADES) {
      return { winRate: null, tradeCount: pairTrades.length };
    }

    const wins = pairTrades.filter(t => t.result === 'win').length;
    const winRate = (wins / pairTrades.length) * 100;

    return { winRate, tradeCount: pairTrades.length };
  }, [tradeEntries, symbol]);

  // Calculate strategy-specific performance (NEW)
  const strategyPerformance = useMemo(() => {
    if (!tradeEntries || tradeEntries.length === 0 || !strategyId) {
      return { winRate: null, tradeCount: 0 };
    }

    // Filter trades linked to this strategy
    const strategyTrades = tradeEntries.filter(trade => {
      if (trade.status !== 'closed') return false;
      // Check if trade has this strategy linked
      return trade.strategies?.some(s => s.id === strategyId);
    });

    // Use centralized minimum trade count
    if (strategyTrades.length < STRATEGY_PERFORMANCE_THRESHOLDS.MIN_TRADES) {
      return { winRate: null, tradeCount: strategyTrades.length };
    }

    const wins = strategyTrades.filter(t => t.result === 'win').length;
    const winRate = (wins / strategyTrades.length) * 100;

    return { winRate, tradeCount: strategyTrades.length };
  }, [tradeEntries, strategyId]);

  // Calculate all adjustment factors using centralized multipliers
  const adjustmentFactors = useMemo<AdjustmentFactor[]>(() => {
    const factors: AdjustmentFactor[] = [];

    // 1. Volatility Adjustment using centralized multipliers
    if (volatilityData?.risk) {
      const { level } = volatilityData.risk;
      let volMultiplier = VOLATILITY_MULTIPLIERS.MEDIUM;
      let volLevel: AdjustmentLevel = 'neutral';
      let volReason = '';

      switch (level) {
        case 'extreme':
          volMultiplier = VOLATILITY_MULTIPLIERS.EXTREME;
          volLevel = 'danger';
          volReason = 'Extreme volatility detected - halve position size';
          break;
        case 'high':
          volMultiplier = VOLATILITY_MULTIPLIERS.HIGH;
          volLevel = 'warning';
          volReason = 'High volatility - reduce position by 25%';
          break;
        case 'medium':
          volMultiplier = VOLATILITY_MULTIPLIERS.MEDIUM;
          volLevel = 'neutral';
          volReason = 'Normal volatility conditions';
          break;
        case 'low':
          volMultiplier = VOLATILITY_MULTIPLIERS.LOW;
          volLevel = 'positive';
          volReason = 'Low volatility - can increase slightly';
          break;
      }

      factors.push({
        id: 'volatility',
        name: 'Volatility',
        multiplier: volMultiplier,
        reason: volReason,
        level: volLevel,
        value: `ATR ${volatilityData.atrPercent.toFixed(2)}%`,
      });
    } else {
      factors.push({
        id: 'volatility',
        name: 'Volatility',
        multiplier: 1.0,
        reason: 'Volatility data unavailable',
        level: 'neutral',
        value: 'N/A',
      });
    }

    // 2. Event/Macro Adjustment using centralized multipliers
    if (hasHighImpactEvent) {
      factors.push({
        id: 'event',
        name: 'Economic Event',
        multiplier: EVENT_MULTIPLIERS.HIGH_IMPACT,
        reason: 'High-impact event today - reduce exposure significantly',
        level: 'danger',
        value: 'High Impact',
      });
    } else {
      factors.push({
        id: 'event',
        name: 'Economic Event',
        multiplier: EVENT_MULTIPLIERS.NORMAL,
        reason: 'No major events affecting this trade',
        level: 'positive',
        value: 'Clear',
      });
    }

    // 3. Market Sentiment/Bias Adjustment using centralized thresholds
    let sentimentMultiplier = SENTIMENT_MULTIPLIERS.NEUTRAL;
    let sentimentLevel: AdjustmentLevel = 'neutral';
    let sentimentReason = '';

    if (bias === 'AVOID') {
      sentimentMultiplier = SENTIMENT_MULTIPLIERS.AVOID;
      sentimentLevel = 'danger';
      sentimentReason = 'Market conditions unfavorable - reduce size';
    } else if (components.fearGreed < FEAR_GREED_THRESHOLDS.EXTREME_FEAR) {
      sentimentMultiplier = SENTIMENT_MULTIPLIERS.EXTREME_FEAR;
      sentimentLevel = 'warning';
      sentimentReason = 'Extreme fear - proceed with caution';
    } else if (components.fearGreed > FEAR_GREED_THRESHOLDS.EXTREME_GREED) {
      sentimentMultiplier = SENTIMENT_MULTIPLIERS.EXTREME_GREED;
      sentimentLevel = 'warning';
      sentimentReason = 'Extreme greed - watch for reversals';
    } else {
      sentimentMultiplier = SENTIMENT_MULTIPLIERS.NEUTRAL;
      sentimentLevel = 'neutral';
      sentimentReason = 'Neutral sentiment conditions';
    }

    factors.push({
      id: 'sentiment',
      name: 'Market Sentiment',
      multiplier: sentimentMultiplier,
      reason: sentimentReason,
      level: sentimentLevel,
      value: `F&G: ${components.fearGreed}`,
    });

    // 4. Momentum Adjustment using centralized thresholds
    let momentumMultiplier = MOMENTUM_MULTIPLIERS.NEUTRAL;
    let momentumLevel: AdjustmentLevel = 'neutral';
    let momentumReason = '';

    if (score >= MOMENTUM_THRESHOLDS.STRONG_BULLISH) {
      momentumMultiplier = MOMENTUM_MULTIPLIERS.STRONG;
      momentumLevel = 'positive';
      momentumReason = 'Strong bullish momentum - favorable conditions';
    } else if (score <= MOMENTUM_THRESHOLDS.WEAK) {
      momentumMultiplier = MOMENTUM_MULTIPLIERS.WEAK;
      momentumLevel = 'warning';
      momentumReason = 'Weak momentum - reduce exposure';
    } else {
      momentumMultiplier = MOMENTUM_MULTIPLIERS.NEUTRAL;
      momentumLevel = 'neutral';
      momentumReason = 'Neutral momentum';
    }

    factors.push({
      id: 'momentum',
      name: 'Momentum',
      multiplier: momentumMultiplier,
      reason: momentumReason,
      level: momentumLevel,
      value: `Score: ${score}`,
    });

    // 5. Historical Performance Adjustment using centralized thresholds
    if (pairPerformance.winRate !== null) {
      let perfMultiplier = PAIR_PERFORMANCE_MULTIPLIERS.AVERAGE;
      let perfLevel: AdjustmentLevel = 'neutral';
      let perfReason = '';

      if (pairPerformance.winRate >= PAIR_PERFORMANCE_THRESHOLDS.STRONG) {
        perfMultiplier = PAIR_PERFORMANCE_MULTIPLIERS.STRONG;
        perfLevel = 'positive';
        perfReason = `Strong performance on this pair (${pairPerformance.winRate.toFixed(0)}% win rate)`;
      } else if (pairPerformance.winRate >= PAIR_PERFORMANCE_THRESHOLDS.AVERAGE) {
        perfMultiplier = PAIR_PERFORMANCE_MULTIPLIERS.AVERAGE;
        perfLevel = 'neutral';
        perfReason = `Average performance on this pair (${pairPerformance.winRate.toFixed(0)}% win rate)`;
      } else if (pairPerformance.winRate >= PAIR_PERFORMANCE_THRESHOLDS.BELOW) {
        perfMultiplier = PAIR_PERFORMANCE_MULTIPLIERS.BELOW_AVERAGE;
        perfLevel = 'warning';
        perfReason = `Below average performance - reduce size (${pairPerformance.winRate.toFixed(0)}% win rate)`;
      } else {
        perfMultiplier = PAIR_PERFORMANCE_MULTIPLIERS.POOR;
        perfLevel = 'danger';
        perfReason = `Poor performance history - significantly reduce (${pairPerformance.winRate.toFixed(0)}% win rate)`;
      }

      factors.push({
        id: 'performance',
        name: 'Historical Performance',
        multiplier: perfMultiplier,
        reason: perfReason,
        level: perfLevel,
        value: `${pairPerformance.tradeCount} trades`,
      });
    } else if (pairPerformance.tradeCount > 0) {
      factors.push({
        id: 'performance',
        name: 'Historical Performance',
        multiplier: 1.0,
        reason: `Insufficient data (${pairPerformance.tradeCount} trades, need ${PAIR_PERFORMANCE_THRESHOLDS.MIN_TRADES}+)`,
        level: 'neutral',
        value: 'Limited data',
      });
    }

    // 6. Strategy-Specific Performance Adjustment using centralized thresholds
    if (strategyPerformance.winRate !== null) {
      let stratMultiplier = STRATEGY_PERFORMANCE_MULTIPLIERS.AVERAGE;
      let stratLevel: AdjustmentLevel = 'neutral';
      let stratReason = '';

      if (strategyPerformance.winRate >= STRATEGY_PERFORMANCE_THRESHOLDS.EXCELLENT) {
        stratMultiplier = STRATEGY_PERFORMANCE_MULTIPLIERS.EXCELLENT;
        stratLevel = 'positive';
        stratReason = `Excellent strategy performance (${strategyPerformance.winRate.toFixed(0)}% win rate)`;
      } else if (strategyPerformance.winRate >= STRATEGY_PERFORMANCE_THRESHOLDS.GOOD) {
        stratMultiplier = STRATEGY_PERFORMANCE_MULTIPLIERS.GOOD;
        stratLevel = 'positive';
        stratReason = `Good strategy performance (${strategyPerformance.winRate.toFixed(0)}% win rate)`;
      } else if (strategyPerformance.winRate >= STRATEGY_PERFORMANCE_THRESHOLDS.AVERAGE) {
        stratMultiplier = STRATEGY_PERFORMANCE_MULTIPLIERS.AVERAGE;
        stratLevel = 'neutral';
        stratReason = `Average strategy performance (${strategyPerformance.winRate.toFixed(0)}% win rate)`;
      } else if (strategyPerformance.winRate >= STRATEGY_PERFORMANCE_THRESHOLDS.BELOW) {
        stratMultiplier = STRATEGY_PERFORMANCE_MULTIPLIERS.BELOW_AVERAGE;
        stratLevel = 'warning';
        stratReason = `Below average strategy - reduce size (${strategyPerformance.winRate.toFixed(0)}% win rate)`;
      } else {
        stratMultiplier = STRATEGY_PERFORMANCE_MULTIPLIERS.POOR;
        stratLevel = 'danger';
        stratReason = `Poor strategy performance - significantly reduce (${strategyPerformance.winRate.toFixed(0)}% win rate)`;
      }

      factors.push({
        id: 'strategy',
        name: 'Strategy Performance',
        multiplier: stratMultiplier,
        reason: stratReason,
        level: stratLevel,
        value: `${strategyPerformance.tradeCount} trades`,
      });
    } else if (strategyId && strategyPerformance.tradeCount > 0) {
      factors.push({
        id: 'strategy',
        name: 'Strategy Performance',
        multiplier: 1.0,
        reason: `Insufficient strategy data (${strategyPerformance.tradeCount} trades, need ${STRATEGY_PERFORMANCE_THRESHOLDS.MIN_TRADES}+)`,
        level: 'neutral',
        value: 'Limited data',
      });
    }

    return factors;
  }, [volatilityData, hasHighImpactEvent, bias, components, score, pairPerformance, strategyPerformance, strategyId]);

  // Calculate final adjusted risk using centralized thresholds
  const { totalMultiplier, adjustedRisk, recommendation, recommendationLabel } = useMemo(() => {
    const total = adjustmentFactors.reduce((acc, f) => acc * f.multiplier, 1);
    const adjusted = Math.round(baseRisk * total * 100) / 100;

    let rec: ContextAwareRiskResult['recommendation'];
    let label: string;

    if (total < RECOMMENDATION_THRESHOLDS.SIGNIFICANTLY_REDUCE) {
      rec = 'significantly_reduce';
      label = 'Significantly Reduce';
    } else if (total < RECOMMENDATION_THRESHOLDS.REDUCE) {
      rec = 'reduce';
      label = 'Reduce Size';
    } else if (total < RECOMMENDATION_THRESHOLDS.SLIGHTLY_REDUCE) {
      rec = 'slightly_reduce';
      label = 'Slightly Reduce';
    } else if (total > RECOMMENDATION_THRESHOLDS.INCREASE) {
      rec = 'increase';
      label = 'Can Increase';
    } else {
      rec = 'normal';
      label = 'Normal Size';
    }

    return {
      totalMultiplier: total,
      adjustedRisk: adjusted,
      recommendation: rec,
      recommendationLabel: label,
    };
  }, [adjustmentFactors, baseRisk]);

  // Extract individual multipliers for direct access
  const getMultiplier = (id: string) => 
    adjustmentFactors.find(f => f.id === id)?.multiplier ?? 1.0;

  const isLoading = profileLoading || marketLoading || volLoading || tradesLoading;

  return {
    baseRisk,
    adjustedRisk,
    totalMultiplier,
    adjustmentFactors,
    recommendation,
    recommendationLabel,
    isLoading,
    volatilityMultiplier: getMultiplier('volatility'),
    eventMultiplier: getMultiplier('event'),
    sentimentMultiplier: getMultiplier('sentiment'),
    momentumMultiplier: getMultiplier('momentum'),
    performanceMultiplier: getMultiplier('performance'),
    strategyMultiplier: getMultiplier('strategy'),
    hasHighImpactEvent,
    volatilityLevel: volatilityLabel,
    marketBias: bias,
    pairWinRate: pairPerformance.winRate,
    pairTradeCount: pairPerformance.tradeCount,
    strategyWinRate: strategyPerformance.winRate,
    strategyTradeCount: strategyPerformance.tradeCount,
  };
}

/**
 * Simplified hook for quick risk check (returns just adjusted risk and recommendation)
 */
export function useAdjustedRisk(symbol?: string): {
  baseRisk: number;
  adjustedRisk: number;
  recommendation: string;
  isLoading: boolean;
} {
  const { baseRisk, adjustedRisk, recommendationLabel, isLoading } = useContextAwareRisk({ symbol });
  return { baseRisk, adjustedRisk, recommendation: recommendationLabel, isLoading };
}
