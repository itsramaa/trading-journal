/**
 * Economic Calendar Hook
 * Fetches real-time economic events from Trading Economics API
 * with AI-generated crypto impact predictions
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EconomicCalendarResponse } from "./types";

async function fetchEconomicCalendar(): Promise<EconomicCalendarResponse> {
  const { data, error } = await supabase.functions.invoke('economic-calendar');
  
  if (error) {
    console.error('Economic calendar fetch error:', error);
    throw new Error('Failed to fetch economic calendar');
  }
  
  return data as EconomicCalendarResponse;
}

export function useEconomicCalendar() {
  return useQuery({
    queryKey: ['economic-calendar'],
    queryFn: fetchEconomicCalendar,
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes auto-refresh
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
