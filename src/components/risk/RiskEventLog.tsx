/**
 * Risk Event Log - Displays history of risk events
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Shield, XCircle, CheckCircle, Clock } from "lucide-react";
import { useRiskEvents } from "@/hooks/use-risk-events";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const eventTypeConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  warning_70: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Warning (70%)',
  },
  warning_90: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    label: 'Danger (90%)',
  },
  limit_reached: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Limit Reached',
  },
  trading_disabled: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Trading Disabled',
  },
  trading_enabled: {
    icon: CheckCircle,
    color: 'text-green-500',
    label: 'Trading Enabled',
  },
  position_limit_warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Position Limit',
  },
  correlation_warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Correlation Warning',
  },
};

export function RiskEventLog() {
  const { events, isLoading } = useRiskEvents();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Event Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Event Log
        </CardTitle>
        <CardDescription>
          Recent risk events and threshold breaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!events || events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
            <p>No risk events recorded</p>
            <p className="text-sm">Your trading has been within safe limits</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {events.map((event) => {
                const config = eventTypeConfig[event.event_type] || {
                  icon: AlertTriangle,
                  color: 'text-muted-foreground',
                  label: event.event_type,
                };
                const Icon = config.icon;

                return (
                  <div 
                    key={event.id} 
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className={cn("mt-0.5", config.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{event.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          Trigger: <span className="font-medium">{event.trigger_value.toFixed(1)}%</span>
                        </span>
                        <span>
                          Threshold: <span className="font-medium">{event.threshold_value.toFixed(1)}%</span>
                        </span>
                        <span>
                          Date: {format(new Date(event.event_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
