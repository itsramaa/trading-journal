/**
 * Economic Event Utilities for Heatmap
 * Consumes data from useEconomicCalendar (single data source)
 * Provides high-impact event date mapping for TradingHeatmap overlay
 */
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useEconomicCalendar } from "@/features/calendar/useEconomicCalendar";
import { 
  HIGH_IMPACT_PATTERNS, 
  getEventLabel as getEventLabelFromConstants 
} from "@/lib/constants/economic-calendar";

/**
 * Get a map of dates that have high-impact events
 * Key: 'YYYY-MM-DD', Value: array of event titles
 * 
 * Note: Data scope is "this week only" (Forex Factory free endpoint limitation)
 */
export function useHighImpactEventDates() {
  const { data, isLoading, error } = useEconomicCalendar();

  const eventDateMap = useMemo(() => {
    const map = new Map<string, string[]>();
    
    if (!data?.events) return map;

    data.events.forEach(event => {
      try {
        const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        
        const isHighImpact = HIGH_IMPACT_PATTERNS.some(pattern => 
          event.event.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isHighImpact || event.importance === 'high') {
          if (!existing.includes(event.event)) {
            existing.push(event.event);
            map.set(dateKey, existing);
          }
        }
      } catch {
        // Skip invalid dates
      }
    });

    return map;
  }, [data?.events]);

  return { eventDateMap, isLoading, error };
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
    const dateKey = dateStr.split('T')[0];
    const events = eventDateMap.get(dateKey) || [];
    return { hasEvent: events.length > 0, events };
  } catch {
    return { hasEvent: false, events: [] };
  }
}

/**
 * Get abbreviated event label for display
 */
export function getEventLabel(events: string[]): string {
  return getEventLabelFromConstants(events);
}
