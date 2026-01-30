import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketInsightResponse } from "./types";

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
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
