/**
 * Dashboard AI Insights Hook
 * Calls dashboard-insights edge function with settings enforcement
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAISettingsEnforcement } from "@/hooks/use-ai-settings-enforcement";
import { useUnifiedMarketScore } from "@/hooks/use-unified-market-score";

export interface DashboardInsights {
  summary: string;
  recommendations: string[];
  riskAlerts: string[];
  bestSetups: Array<{
    pair: string;
    strategy: string;
    confidence: number;
    reason: string;
  }>;
  overallSentiment: 'bullish' | 'bearish' | 'neutral' | 'cautious';
}

interface InsightsParams {
  portfolioStatus: {
    totalBalance: number;
    deployedCapital: number;
    openPositions: number;
  };
  riskStatus: {
    currentDailyLoss: number;
    maxDailyLoss: number;
    tradingAllowed: boolean;
  };
  recentTrades: Array<{
    pair: string;
    direction: string;
    result: string;
    pnl: number;
    date: string;
  }>;
  strategies: Array<{
    name: string;
    trades: number;
    winRate: number;
  }>;
}

interface InsightsResponse {
  success: boolean;
  data?: DashboardInsights;
  error?: string;
}

export function useDashboardInsights() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const { data: settings } = useUserSettings();
  const { shouldRunAIFeature, filterByConfidence } = useAISettingsEnforcement();
  const { scoreLabel: marketScoreLabel } = useUnifiedMarketScore();

  const getInsights = useCallback(async (params: InsightsParams): Promise<DashboardInsights | null> => {
    // Check if daily suggestions is enabled
    if (!shouldRunAIFeature('daily_suggestions')) {
      console.log('Daily suggestions is disabled in AI settings');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke<InsightsResponse>(
        'dashboard-insights',
        { 
          body: { 
            ...params, 
            language: settings?.language || 'en',
            marketScoreLabel: marketScoreLabel || 'Unknown',
          }
        }
      );

      if (funcError) {
        throw new Error(funcError.message || 'Failed to get dashboard insights');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Dashboard insights failed');
      }

      let resultData = data.data || null;
      
      // Filter best setups by confidence threshold
      if (resultData?.bestSetups) {
        resultData = {
          ...resultData,
          bestSetups: filterByConfidence(resultData.bestSetups),
        };
      }

      setInsights(resultData);
      return resultData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Dashboard insights error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [settings?.language, shouldRunAIFeature, filterByConfidence, marketScoreLabel]);

  const refresh = useCallback((params: InsightsParams) => {
    return getInsights(params);
  }, [getInsights]);

  const reset = () => {
    setInsights(null);
    setError(null);
  };

  return {
    getInsights,
    refresh,
    isLoading,
    error,
    insights,
    reset,
    isFeatureEnabled: shouldRunAIFeature('daily_suggestions'),
  };
}
