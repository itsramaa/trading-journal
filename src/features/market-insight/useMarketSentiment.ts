import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketInsightResponse } from "./types";

/** AI bias validity duration in minutes (per trading style) */
export const BIAS_VALIDITY_MINUTES = {
  scalping: 15,
  short_trade: 60,
  swing: 240,
} as const;

export function useMarketSentiment() {
  return useQuery({
    queryKey: ["market-sentiment"],
    queryFn: async (): Promise<MarketInsightResponse> => {
      const { data, error } = await supabase.functions.invoke("market-insight");
      
      if (error) {
        console.error("Market sentiment fetch error:", error);
        throw new Error(error.message || "Failed to fetch market sentiment");
      }

      return data as MarketInsightResponse;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
