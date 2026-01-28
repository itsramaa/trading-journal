/**
 * AI Confluence Detection Hook
 * Calls confluence-detection edge function
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  const detectConfluences = async (params: DetectionParams): Promise<AIConfluenceResult | null> => {
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

      setResult(data.data || null);
      return data.data || null;
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
  };
}
