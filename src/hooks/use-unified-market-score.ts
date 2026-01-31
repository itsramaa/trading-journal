/**
 * useUnifiedMarketScore Hook
 * Provides a single composite market score combining all data sources
 * Used for quick market assessment in dashboard widgets and trade decisions
 */

import { useMemo } from 'react';
import { useCaptureMarketContext } from './use-capture-market-context';
import type { TradingBias } from '@/types/market-context';

export interface UnifiedMarketScoreResult {
  // Core score
  score: number;                    // 0-100 composite score
  bias: TradingBias;                // Trading recommendation
  
  // Component scores
  components: {
    technical: number;              // 0-100
    onChain: number;                // 0-100
    fearGreed: number;              // 0-100 (raw value)
    macro: number;                  // 0-100
    eventRisk: number;              // 0-100 (inverted - higher = safer)
    momentum: number;               // 0-100
  };
  
  // Status
  isLoading: boolean;
  dataQuality: number;              // 0-100
  lastUpdated: string | null;
  
  // Labels for display
  scoreLabel: string;               // "Bullish", "Bearish", "Neutral"
  fearGreedLabel: string;           // "Extreme Fear", etc.
  volatilityLabel: string;          // "Low", "Medium", "High"
  
  // Recommendations
  positionSizeAdjustment: string;   // "normal", "reduce_30%", "reduce_50%"
  hasHighImpactEvent: boolean;
  upcomingEventName: string | null;
  
  // Refetch function
  refetch: () => void;
}

interface UseUnifiedMarketScoreOptions {
  symbol?: string;
  enabled?: boolean;
}

export function useUnifiedMarketScore(
  options: UseUnifiedMarketScoreOptions = {}
): UnifiedMarketScoreResult {
  const { symbol = 'BTCUSDT', enabled = true } = options;
  
  const { 
    context, 
    isLoading, 
    refetch,
  } = useCaptureMarketContext({ symbol, enabled });

  const result = useMemo((): UnifiedMarketScoreResult => {
    // Default values when no data
    if (!context) {
      return {
        score: 50,
        bias: 'NEUTRAL',
        components: {
          technical: 50,
          onChain: 50,
          fearGreed: 50,
          macro: 50,
          eventRisk: 100, // No event = safe
          momentum: 50,
        },
        isLoading,
        dataQuality: 0,
        lastUpdated: null,
        scoreLabel: 'Loading...',
        fearGreedLabel: 'Unknown',
        volatilityLabel: 'Unknown',
        positionSizeAdjustment: 'normal',
        hasHighImpactEvent: false,
        upcomingEventName: null,
        refetch,
      };
    }

    // Calculate event risk score (inverted - higher = safer)
    const eventRiskScore = context.events.riskLevel === 'VERY_HIGH' ? 25 :
                           context.events.riskLevel === 'HIGH' ? 50 :
                           context.events.riskLevel === 'MODERATE' ? 75 : 100;

    // Calculate momentum score from price change
    const momentumScore = Math.max(0, Math.min(100, 
      50 + (context.momentum.priceChange24h / 20) * 50
    ));

    // Get score label
    const getScoreLabel = (score: number, bias: TradingBias): string => {
      if (bias === 'AVOID') return 'High Risk';
      if (score >= 70) return 'Bullish';
      if (score >= 55) return 'Mildly Bullish';
      if (score >= 45) return 'Neutral';
      if (score >= 30) return 'Mildly Bearish';
      return 'Bearish';
    };

    return {
      score: context.compositeScore,
      bias: context.tradingBias,
      components: {
        technical: context.sentiment.technicalScore,
        onChain: context.sentiment.onChainScore,
        fearGreed: context.fearGreed.value,
        macro: context.sentiment.macroScore,
        eventRisk: eventRiskScore,
        momentum: momentumScore,
      },
      isLoading,
      dataQuality: context.dataQuality,
      lastUpdated: context.capturedAt,
      scoreLabel: getScoreLabel(context.compositeScore, context.tradingBias),
      fearGreedLabel: context.fearGreed.label,
      volatilityLabel: context.volatility.level.charAt(0).toUpperCase() + context.volatility.level.slice(1),
      positionSizeAdjustment: context.events.positionSizeAdjustment,
      hasHighImpactEvent: context.events.hasHighImpactToday,
      upcomingEventName: context.events.upcomingEvent?.name ?? null,
      refetch,
    };
  }, [context, isLoading, refetch]);

  return result;
}

/**
 * Helper hook to get just the score for simple use cases
 */
export function useMarketScore(symbol?: string): {
  score: number;
  bias: TradingBias;
  isLoading: boolean;
} {
  const { score, bias, isLoading } = useUnifiedMarketScore({ symbol });
  return { score, bias, isLoading };
}
