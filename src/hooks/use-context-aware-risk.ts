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
  
  // Context flags
  hasHighImpactEvent: boolean;
  volatilityLevel: string;
  marketBias: string;
  
  // Historical performance context
  pairWinRate: number | null;
  pairTradeCount: number;
}

interface UseContextAwareRiskOptions {
  symbol?: string;
  baseRiskPercent?: number;
  enabled?: boolean;
}

export function useContextAwareRisk(
  options: UseContextAwareRiskOptions = {}
): ContextAwareRiskResult {
  const { symbol = 'BTCUSDT', baseRiskPercent, enabled = true } = options;

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

  const baseRisk = baseRiskPercent ?? riskProfile?.risk_per_trade_percent ?? 2;

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

    if (pairTrades.length < 3) {
      return { winRate: null, tradeCount: pairTrades.length };
    }

    const wins = pairTrades.filter(t => t.result === 'win').length;
    const winRate = (wins / pairTrades.length) * 100;

    return { winRate, tradeCount: pairTrades.length };
  }, [tradeEntries, symbol]);

  // Calculate all adjustment factors
  const adjustmentFactors = useMemo<AdjustmentFactor[]>(() => {
    const factors: AdjustmentFactor[] = [];

    // 1. Volatility Adjustment
    if (volatilityData?.risk) {
      const { level } = volatilityData.risk;
      let volMultiplier = 1.0;
      let volLevel: AdjustmentLevel = 'neutral';
      let volReason = '';

      switch (level) {
        case 'extreme':
          volMultiplier = 0.5;
          volLevel = 'danger';
          volReason = 'Extreme volatility detected - halve position size';
          break;
        case 'high':
          volMultiplier = 0.75;
          volLevel = 'warning';
          volReason = 'High volatility - reduce position by 25%';
          break;
        case 'medium':
          volMultiplier = 1.0;
          volLevel = 'neutral';
          volReason = 'Normal volatility conditions';
          break;
        case 'low':
          volMultiplier = 1.1;
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

    // 2. Event/Macro Adjustment
    if (hasHighImpactEvent) {
      factors.push({
        id: 'event',
        name: 'Economic Event',
        multiplier: 0.5,
        reason: 'High-impact event today - reduce exposure significantly',
        level: 'danger',
        value: 'High Impact',
      });
    } else {
      factors.push({
        id: 'event',
        name: 'Economic Event',
        multiplier: 1.0,
        reason: 'No major events affecting this trade',
        level: 'positive',
        value: 'Clear',
      });
    }

    // 3. Market Sentiment/Bias Adjustment
    let sentimentMultiplier = 1.0;
    let sentimentLevel: AdjustmentLevel = 'neutral';
    let sentimentReason = '';

    if (bias === 'AVOID') {
      sentimentMultiplier = 0.5;
      sentimentLevel = 'danger';
      sentimentReason = 'Market conditions unfavorable - reduce size';
    } else if (components.fearGreed < 25) {
      sentimentMultiplier = 0.8;
      sentimentLevel = 'warning';
      sentimentReason = 'Extreme fear - proceed with caution';
    } else if (components.fearGreed > 75) {
      sentimentMultiplier = 0.9;
      sentimentLevel = 'warning';
      sentimentReason = 'Extreme greed - watch for reversals';
    } else {
      sentimentMultiplier = 1.0;
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

    // 4. Momentum Adjustment (based on market score)
    let momentumMultiplier = 1.0;
    let momentumLevel: AdjustmentLevel = 'neutral';
    let momentumReason = '';

    if (score >= 70) {
      momentumMultiplier = 1.1;
      momentumLevel = 'positive';
      momentumReason = 'Strong bullish momentum - favorable conditions';
    } else if (score <= 30) {
      momentumMultiplier = 0.8;
      momentumLevel = 'warning';
      momentumReason = 'Weak momentum - reduce exposure';
    } else {
      momentumMultiplier = 1.0;
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

    // 5. Historical Performance Adjustment (NEW)
    if (pairPerformance.winRate !== null) {
      let perfMultiplier = 1.0;
      let perfLevel: AdjustmentLevel = 'neutral';
      let perfReason = '';

      if (pairPerformance.winRate >= 60) {
        perfMultiplier = 1.15;
        perfLevel = 'positive';
        perfReason = `Strong performance on this pair (${pairPerformance.winRate.toFixed(0)}% win rate)`;
      } else if (pairPerformance.winRate >= 50) {
        perfMultiplier = 1.0;
        perfLevel = 'neutral';
        perfReason = `Average performance on this pair (${pairPerformance.winRate.toFixed(0)}% win rate)`;
      } else if (pairPerformance.winRate >= 40) {
        perfMultiplier = 0.85;
        perfLevel = 'warning';
        perfReason = `Below average performance - reduce size (${pairPerformance.winRate.toFixed(0)}% win rate)`;
      } else {
        perfMultiplier = 0.7;
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
        reason: `Insufficient data (${pairPerformance.tradeCount} trades, need 3+)`,
        level: 'neutral',
        value: 'Limited data',
      });
    }

    return factors;
  }, [volatilityData, hasHighImpactEvent, bias, components, score, pairPerformance]);

  // Calculate final adjusted risk
  const { totalMultiplier, adjustedRisk, recommendation, recommendationLabel } = useMemo(() => {
    const total = adjustmentFactors.reduce((acc, f) => acc * f.multiplier, 1);
    const adjusted = Math.round(baseRisk * total * 100) / 100;

    let rec: ContextAwareRiskResult['recommendation'];
    let label: string;

    if (total < 0.5) {
      rec = 'significantly_reduce';
      label = 'Significantly Reduce';
    } else if (total < 0.8) {
      rec = 'reduce';
      label = 'Reduce Size';
    } else if (total < 1) {
      rec = 'slightly_reduce';
      label = 'Slightly Reduce';
    } else if (total > 1.05) {
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
    hasHighImpactEvent,
    volatilityLevel: volatilityLabel,
    marketBias: bias,
    pairWinRate: pairPerformance.winRate,
    pairTradeCount: pairPerformance.tradeCount,
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
