/**
 * Hook to fetch and cache economic calendar events for analysis
 * Used by Trading Heatmap and other components needing event data
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays, addDays } from "date-fns";

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

// Key high-impact event patterns
const HIGH_IMPACT_PATTERNS = [
  'FOMC',
  'Federal Reserve',
  'Interest Rate Decision',
  'CPI',
  'Consumer Price Index',
  'NFP',
  'Non-Farm Payrolls',
  'Nonfarm Payrolls',
  'Employment Change',
  'GDP',
  'Gross Domestic Product',
  'PCE',
  'Core PCE',
  'Retail Sales',
  'PMI',
];

export function useEconomicEvents(options: UseEconomicEventsOptions = {}) {
  const {
    startDate = subDays(new Date(), 90),
    endDate = addDays(new Date(), 30),
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
        
        // Check if it matches high-impact patterns
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
 */
export function getEventLabel(events: string[]): string {
  if (events.length === 0) return '';
  
  // Priority order for labels
  if (events.some(e => e.includes('FOMC') || e.includes('Federal Reserve'))) return 'FOMC';
  if (events.some(e => e.includes('CPI') || e.includes('Consumer Price'))) return 'CPI';
  if (events.some(e => e.includes('NFP') || e.includes('Payrolls'))) return 'NFP';
  if (events.some(e => e.includes('GDP'))) return 'GDP';
  if (events.some(e => e.includes('PCE'))) return 'PCE';
  
  // Just return count if multiple misc events
  if (events.length > 1) return `${events.length} Events`;
  
  // Abbreviate single event
  const first = events[0];
  if (first.length > 10) {
    return first.substring(0, 8) + '…';
  }
  return first;
}
