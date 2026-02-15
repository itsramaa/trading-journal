/**
 * Economic Calendar Hook
 * Fetches real-time economic events from Trading Economics API
 * with AI-generated crypto impact predictions.
 * Accepts optional realizedVolPct to floor calendar expected ranges.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EconomicCalendarResponse } from "./types";

async function fetchEconomicCalendar(realizedVolPct?: number): Promise<EconomicCalendarResponse> {
  const { data, error } = await supabase.functions.invoke('economic-calendar', {
    method: 'POST',
    body: { realizedVolPct: realizedVolPct ?? 0 },
  });
  
  if (error) {
    console.error('Economic calendar fetch error:', error);
    throw new Error('Failed to fetch economic calendar');
  }
  
  return data as EconomicCalendarResponse;
}

export function useEconomicCalendar(realizedVolPct?: number) {
  return useQuery({
    queryKey: ['economic-calendar', realizedVolPct ?? 0],
    queryFn: () => fetchEconomicCalendar(realizedVolPct),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
