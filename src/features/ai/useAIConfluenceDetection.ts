/**
 * AI Confluence Detection Hook
 * Calls confluence-detection edge function with settings enforcement
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAISettingsEnforcement } from "@/hooks/use-ai-settings-enforcement";
import type { AIConfluenceResult, ConfluenceDetail } from "@/types/ai";
import type { EntryRule } from "@/types/strategy";

interface DetectionParams {
  pair: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  strategyRules: EntryRule[];
  strategyName: string;
}

interface DetectionResponse {
  success: boolean;
  data?: AIConfluenceResult;
  error?: string;
}

export function useAIConfluenceDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIConfluenceResult | null>(null);
  const { shouldRunAIFeature, meetsConfidenceThreshold } = useAISettingsEnforcement();

  const detectConfluences = async (params: DetectionParams): Promise<AIConfluenceResult | null> => {
    // Check if confluence detection is enabled
    if (!shouldRunAIFeature('confluence_detection')) {
      console.log('Confluence detection is disabled in AI settings');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke<DetectionResponse>(
        'confluence-detection',
        { body: params }
      );

      if (funcError) {
        throw new Error(funcError.message || 'Failed to call confluence detection');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Confluence detection failed');
      }

      const resultData = data.data || null;
      
      // Log if confidence is below threshold (don't mutate the verdict type)
      if (resultData && !meetsConfidenceThreshold(resultData.overall_confidence)) {
        console.log('Confluence result has low confidence:', resultData.overall_confidence);
      }

      setResult(resultData);
      return resultData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Confluence detection error:', err);
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
    detectConfluences,
    isLoading,
    error,
    result,
    reset,
    isFeatureEnabled: shouldRunAIFeature('confluence_detection'),
  };
}
