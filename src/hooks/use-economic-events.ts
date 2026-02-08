/**
 * Hook to fetch and cache economic calendar events for analysis
 * Used by Trading Heatmap and other components needing event data
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays, addDays } from "date-fns";
import { 
  HIGH_IMPACT_PATTERNS, 
  CALENDAR_DATE_RANGE,
  getEventLabel as getEventLabelFromConstants 
} from "@/lib/constants/economic-calendar";

export interface EconomicEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  currency: string;
  importance: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface UseEconomicEventsOptions {
  startDate?: Date;
  endDate?: Date;
  highImpactOnly?: boolean;
}

export function useEconomicEvents(options: UseEconomicEventsOptions = {}) {
  const {
    startDate = subDays(new Date(), CALENDAR_DATE_RANGE.LOOKBACK_DAYS),
    endDate = addDays(new Date(), CALENDAR_DATE_RANGE.LOOKAHEAD_DAYS),
    highImpactOnly = false,
  } = options;

  return useQuery({
    queryKey: ['economic-events', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), highImpactOnly],
    queryFn: async () => {
      const fromDate = format(startDate, 'yyyy-MM-dd');
      const toDate = format(endDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.functions.invoke('economic-calendar', {
        body: { from: fromDate, to: toDate },
      });

      if (error) throw error;

      let events: EconomicEvent[] = data?.events || [];

      // Filter high impact if requested
      if (highImpactOnly) {
        events = events.filter(e => e.importance === 'high');
      }

      return events;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get a map of dates that have high-impact events
 * Key: 'YYYY-MM-DD', Value: array of event titles
 */
export function useHighImpactEventDates(options: Omit<UseEconomicEventsOptions, 'highImpactOnly'> = {}) {
  const { data: events, isLoading, error } = useEconomicEvents({
    ...options,
    highImpactOnly: true,
  });

  const eventDateMap = new Map<string, string[]>();

  if (events) {
    events.forEach(event => {
      try {
        const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
        const existing = eventDateMap.get(dateKey) || [];
        
        // Check if it matches high-impact patterns using centralized config
        const isHighImpact = HIGH_IMPACT_PATTERNS.some(pattern => 
          event.title.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isHighImpact || event.importance === 'high') {
          if (!existing.includes(event.title)) {
            existing.push(event.title);
            eventDateMap.set(dateKey, existing);
          }
        }
      } catch {
        // Skip invalid dates
      }
    });
  }

  return {
    eventDateMap,
    isLoading,
    error,
  };
}

/**
 * Check if a specific date has high-impact events
 */
export function isHighImpactEventDay(
  date: Date | string, 
  eventDateMap: Map<string, string[]>
): { hasEvent: boolean; events: string[] } {
  try {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    // Normalize to just date part
    const dateKey = dateStr.split('T')[0];
    const events = eventDateMap.get(dateKey) || [];
    return {
      hasEvent: events.length > 0,
      events,
    };
  } catch {
    return { hasEvent: false, events: [] };
  }
}

/**
 * Get abbreviated event label for display
 * Re-exports centralized function for backward compatibility
 */
export function getEventLabel(events: string[]): string {
  return getEventLabelFromConstants(events);
}
