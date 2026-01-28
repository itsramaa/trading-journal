/**
 * Calendar Page - Economic Calendar
 * Focus on upcoming economic events
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Economic events (mock data)
const UPCOMING_EVENTS = [
  { date: 'Today', time: '14:30', event: 'US CPI (YoY)', impact: 'high', forecast: '3.2%' },
  { date: 'Today', time: '16:00', event: 'Fed Chair Powell Speaks', impact: 'high', forecast: '-' },
  { date: 'Tomorrow', time: '08:00', event: 'UK GDP (QoQ)', impact: 'medium', forecast: '0.2%' },
  { date: 'Tomorrow', time: '12:30', event: 'US Retail Sales', impact: 'medium', forecast: '0.3%' },
  { date: 'Wed', time: '18:00', event: 'FOMC Minutes', impact: 'high', forecast: '-' },
  { date: 'Thu', time: '12:30', event: 'US Jobless Claims', impact: 'medium', forecast: '215K' },
];

const Calendar = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Economic Calendar
            </h1>
            <p className="text-muted-foreground">
              Track upcoming high-impact economic events
            </p>
          </div>
        </div>

        {/* Economic Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </div>
            <CardDescription>
              High-impact economic events affecting market volatility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {UPCOMING_EVENTS.map((event, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0",
                    event.impact === 'high' && "bg-loss",
                    event.impact === 'medium' && "bg-secondary",
                    event.impact === 'low' && "bg-profit"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{event.event}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {event.impact}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{event.date}</span>
                      <span>{event.time} UTC</span>
                      {event.forecast !== '-' && (
                        <span>Forecast: {event.forecast}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          Demo data shown. Connect to a live API for real-time economic calendar.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
