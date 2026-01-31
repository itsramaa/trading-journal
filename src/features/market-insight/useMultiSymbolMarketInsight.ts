/**
 * Hook for fetching market insight data for multiple symbols dynamically
 * Similar pattern to useMultiSymbolVolatility - passes array of symbols to edge function
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketInsightResponse } from "./types";

export function useMultiSymbolMarketInsight(symbols: string[]) {
  return useQuery({
    queryKey: ["market-insight-multi", symbols.join(",")],
    queryFn: async (): Promise<MarketInsightResponse> => {
      const { data, error } = await supabase.functions.invoke("market-insight", {
        body: { symbols },
      });
      
      if (error) {
        console.error("Multi-symbol market insight fetch error:", error);
        throw new Error(error.message || "Failed to fetch market insight");
      }
      
      return data as MarketInsightResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: symbols.length > 0,
  });
}
