/**
 * Equity Curve with Event Annotations
 * Shows cumulative P&L with markers for high-impact economic events (FOMC, CPI, etc.)
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Calendar, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { useEconomicCalendar } from "@/features/calendar/useEconomicCalendar";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";

interface EquityDataPoint {
  date: string;
  fullDate: string;
  pnl: number;
  cumulative: number;
  pair: string;
  direction: string;
}

interface EquityCurveWithEventsProps {
  equityData: EquityDataPoint[];
  formatCurrency: (value: number) => string;
}

interface EventAnnotation {
  date: string;
  displayDate: string;
  cumulative: number;
  events: {
    name: string;
    importance: 'high' | 'medium' | 'low';
    country: string;
  }[];
}

// High-impact event keywords to filter
const HIGH_IMPACT_KEYWORDS = [
  'FOMC',
  'Federal Reserve',
  'Interest Rate',
  'CPI',
  'Consumer Price',
  'NFP',
  'Non-Farm',
  'GDP',
  'Unemployment',
  'Retail Sales',
  'PPI',
  'PCE',
  'PMI',
];

function isHighImpactEvent(eventName: string): boolean {
  return HIGH_IMPACT_KEYWORDS.some(keyword => 
    eventName.toLowerCase().includes(keyword.toLowerCase())
  );
}

export function EquityCurveWithEvents({ equityData, formatCurrency }: EquityCurveWithEventsProps) {
  const { data: calendarData } = useEconomicCalendar();

  // Build event annotations for equity curve dates
  const { enrichedData, eventAnnotations, eventDays } = useMemo(() => {
    if (!equityData.length) {
      return { enrichedData: [], eventAnnotations: [], eventDays: new Set<string>() };
    }

    const annotations: EventAnnotation[] = [];
    const eventDaysSet = new Set<string>();
    
    // Get high-impact events from calendar
    const highImpactEvents = calendarData?.events?.filter(event => 
      event.importance === 'high' || isHighImpactEvent(event.event)
    ) || [];

    // Map equity data dates to events
    const enriched = equityData.map(point => {
      const pointDate = startOfDay(parseISO(point.fullDate));
      
      // Find events that match this trade date
      const matchingEvents = highImpactEvents.filter(event => {
        try {
          const eventDate = startOfDay(parseISO(event.date));
          return isSameDay(pointDate, eventDate);
        } catch {
          return false;
        }
      });

      if (matchingEvents.length > 0) {
        const dateKey = format(pointDate, 'yyyy-MM-dd');
        eventDaysSet.add(dateKey);
        
        // Only add annotation if not already added for this date
        if (!annotations.find(a => a.date === dateKey)) {
          annotations.push({
            date: dateKey,
            displayDate: point.date,
            cumulative: point.cumulative,
            events: matchingEvents.map(e => ({
              name: e.event,
              importance: e.importance,
              country: e.country,
            })),
          });
        }

        return {
          ...point,
          hasEvent: true,
          eventCount: matchingEvents.length,
          eventNames: matchingEvents.map(e => e.event).join(', '),
        };
      }

      return {
        ...point,
        hasEvent: false,
        eventCount: 0,
        eventNames: '',
      };
    });

    return { 
      enrichedData: enriched, 
      eventAnnotations: annotations,
      eventDays: eventDaysSet,
    };
  }, [equityData, calendarData]);

  // Custom tooltip to show event info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const dataPoint = payload[0]?.payload;
    
    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="font-medium text-sm mb-1">Date: {label}</p>
        <p className={`text-sm ${dataPoint?.cumulative >= 0 ? 'text-profit' : 'text-loss'}`}>
          Cumulative P&L: {formatCurrency(dataPoint?.cumulative || 0)}
        </p>
        <p className="text-xs text-muted-foreground">
          Trade P&L: {formatCurrency(dataPoint?.pnl || 0)}
        </p>
        {dataPoint?.hasEvent && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-warning">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">Event Day</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dataPoint.eventNames}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (!equityData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Equity Curve
          </CardTitle>
          <CardDescription>Cumulative P&L over time with event annotations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No trades to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Equity Curve
              <InfoTooltip content="Diamond markers indicate high-impact economic events (FOMC, CPI, NFP, etc.) on that trading day." />
            </CardTitle>
            <CardDescription>Cumulative P&L over time with event annotations</CardDescription>
          </div>
          {eventAnnotations.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {eventAnnotations.length} Event {eventAnnotations.length === 1 ? 'Day' : 'Days'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={enrichedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tickFormatter={(v) => formatCurrency(v)} 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary)/0.2)"
                strokeWidth={2}
              />
              {/* Event annotations as reference dots */}
              {eventAnnotations.map((annotation, index) => (
                <ReferenceDot
                  key={`event-${index}`}
                  x={annotation.displayDate}
                  y={annotation.cumulative}
                  r={6}
                  fill="hsl(var(--warning))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  isFront
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Event Legend */}
        {eventAnnotations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning" />
              High-Impact Events on Trading Days
            </p>
            <div className="flex flex-wrap gap-2">
              {eventAnnotations.slice(0, 5).map((annotation, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs gap-1"
                >
                  <span className="font-medium">{annotation.displayDate}:</span>
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {annotation.events[0]?.name}
                    {annotation.events.length > 1 && ` +${annotation.events.length - 1}`}
                  </span>
                </Badge>
              ))}
              {eventAnnotations.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{eventAnnotations.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
