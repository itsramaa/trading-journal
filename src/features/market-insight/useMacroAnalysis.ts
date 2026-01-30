import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MacroAnalysisResponse } from "./types";

export function useMacroAnalysis() {
  return useQuery({
    queryKey: ["macro-analysis"],
    queryFn: async (): Promise<MacroAnalysisResponse> => {
      const { data, error } = await supabase.functions.invoke("macro-analysis");
      
      if (error) {
        console.error("Macro analysis fetch error:", error);
        throw new Error(error.message || "Failed to fetch macro analysis");
      }
      
      return data as MacroAnalysisResponse;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes cache (macro data updates slower)
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
