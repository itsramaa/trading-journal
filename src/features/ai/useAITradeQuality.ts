/**
 * AI Trade Quality Hook
 * Calls trade-quality edge function with settings enforcement
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAISettingsEnforcement } from "@/hooks/use-ai-settings-enforcement";
import type { AITradeQualityScore } from "@/types/ai";

interface QualityParams {
  tradeSetup: {
    pair: string;
    direction: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    timeframe: string;
    rr: number;
  };
  confluenceData: {
    confluences_detected: number;
    confluences_required: number;
    overall_confidence: number;
    verdict: string;
  };
  positionSizing: {
    position_size: number;
    risk_amount: number;
    risk_percent: number;
    capital_deployment_percent: number;
  };
  emotionalState: string;
  confidenceLevel: number;
  userStats?: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
  };
}

interface QualityResponse {
  success: boolean;
  data?: AITradeQualityScore;
  error?: string;
}

export function useAITradeQuality() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AITradeQualityScore | null>(null);
  const { shouldRunAIFeature, meetsConfidenceThreshold } = useAISettingsEnforcement();

  const getQualityScore = async (params: QualityParams): Promise<AITradeQualityScore | null> => {
    // Check if quality scoring is enabled
    if (!shouldRunAIFeature('quality_scoring')) {
      console.log('Trade quality scoring is disabled in AI settings');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke<QualityResponse>(
        'trade-quality',
        { body: params }
      );

      if (funcError) {
        throw new Error(funcError.message || 'Failed to call trade quality');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Trade quality analysis failed');
      }

      const resultData = data.data || null;
      
      // Log if confidence is below threshold
      if (resultData && !meetsConfidenceThreshold(resultData.confidence)) {
        console.log('Trade quality result has low confidence:', resultData.confidence);
      }

      setResult(resultData);
      return resultData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Trade quality error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    getQualityScore,
    isLoading,
    error,
    result,
    reset,
    isFeatureEnabled: shouldRunAIFeature('quality_scoring'),
  };
}
