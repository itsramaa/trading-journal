/**
 * AI Preflight Hook - Calls the AI preflight edge function
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PreflightInput {
  pair: string;
  direction: 'LONG' | 'SHORT';
  userHistory: {
    pair: string;
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
  }[];
  currentMarketConditions?: {
    trend?: string;
    volatility?: string;
  };
}

interface PreflightResult {
  verdict: 'proceed' | 'caution' | 'skip';
  confidence: number;
  winPrediction: number;
  similarSetups: {
    count: number;
    avgWin: number;
    avgLoss: number;
  };
  marketRegime: string;
  reasoning: string;
}

export function useAIPreflight() {
  return useMutation({
    mutationFn: async (input: PreflightInput): Promise<PreflightResult> => {
      const { data, error } = await supabase.functions.invoke('ai-preflight', {
        body: input,
      });

      if (error) throw error;
      return data as PreflightResult;
    },
  });
}
