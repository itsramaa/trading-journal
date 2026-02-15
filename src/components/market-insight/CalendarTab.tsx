/**
 * Calendar Tab Component - Economic Calendar with AI Predictions
 * Extracted from Calendar.tsx for use in Market Insight tabbed interface
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Shield,
  Clock,
  Minus,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEconomicCalendar } from "@/features/calendar";
import { format } from "date-fns";
import { 
  RISK_LEVELS, 
  RISK_LEVEL_CONFIG,
  POSITION_ADJUSTMENTS,
  IMPORTANCE_CONFIG,
  getPositionAdjustment 
} from "@/lib/constants/economic-calendar";

interface CalendarTabProps {
  hideTitle?: boolean;
}

export function CalendarTab({ hideTitle = false }: CalendarTabProps) {
  const { data, isLoading, isError, refetch, isFetching } = useEconomicCalendar();

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return format(date, 'EEE');
  };

  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const getImpactIcon = (impact: 'bullish' | 'bearish' | 'neutral' | null) => {
    switch (impact) {
      case 'bullish': return <TrendingUp className="h-3 w-3" />;
      case 'bearish': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      {/* Header with Refresh - conditionally show title */}
      {!hideTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Economic Calendar</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh economic calendar data"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      )}
      
      {/* Refresh button when title hidden */}
      {hideTitle && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh economic calendar data"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      )}

      {/* Impact Alert Banner */}
      {data?.impactSummary?.hasHighImpact && data.impactSummary.riskLevel !== RISK_LEVELS.LOW && (
        <Alert 
          variant={data.impactSummary.riskLevel === RISK_LEVELS.VERY_HIGH ? 'destructive' : 'default'} 
          className="border-primary/30 bg-primary/5"
        >
          <Shield className="h-4 w-4" />
          <AlertTitle className="font-semibold">
            {RISK_LEVEL_CONFIG[data.impactSummary.riskLevel as keyof typeof RISK_LEVEL_CONFIG]?.label || 'Impact Alert'}
          </AlertTitle>
          <AlertDescription>
            {data.impactSummary.eventCount} high-impact event{data.impactSummary.eventCount > 1 ? 's' : ''} detected. 
            {getPositionAdjustment(data.impactSummary.positionAdjustment)}
          </AlertDescription>
        </Alert>
      )}

      {/* Today's Key Release */}
      {isLoading ? (
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : data?.todayHighlight?.hasEvent && data.todayHighlight.event ? (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Today's Key Release</CardTitle>
              </div>
              {data.todayHighlight.timeUntil && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {data.todayHighlight.timeUntil}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{data.todayHighlight.event.event}</span>
                <Badge>{data.todayHighlight.event.importance}</Badge>
              </div>
              
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forecast:</span>
                  <span className="font-mono font-medium">{data.todayHighlight.event.forecast || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous:</span>
                  <span className="font-mono">{data.todayHighlight.event.previous || 'N/A'}</span>
                </div>
                {data.todayHighlight.event.actual && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual:</span>
                    <span className="font-mono font-bold">{data.todayHighlight.event.actual}</span>
                  </div>
                )}
              </div>

              {data.todayHighlight.event.aiPrediction && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="font-medium">AI Prediction:</p>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {data.todayHighlight.event.aiPrediction}
                    </p>
                    {data.todayHighlight.event.cryptoImpact && (
                      <div className="flex items-center gap-2 mt-2">
                        {getImpactIcon(data.todayHighlight.event.cryptoImpact)}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            data.todayHighlight.event.cryptoImpact === 'bullish' && "bg-profit/10 text-profit border-profit/30",
                            data.todayHighlight.event.cryptoImpact === 'bearish' && "bg-loss/10 text-loss border-loss/30"
                          )}
                        >
                          Crypto: {data.todayHighlight.event.cryptoImpact}
                        </Badge>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : !isLoading && (
        <Card className="border-muted">
          <CardContent className="py-8 text-center text-muted-foreground">
            No high-impact events scheduled for today.
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
            <Badge variant="outline" className="text-xs">AI Powered</Badge>
          </div>
          <CardDescription>
            High-impact economic events with AI predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Failed to load economic calendar.</p>
              <Button variant="link" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : data?.events && data.events.length > 0 ? (
            <div className="space-y-3" role="list" aria-label="Upcoming economic events">
              {data.events.map((event) => (
                <Collapsible key={event.id}>
                  <div 
                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    role="listitem"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full mt-2 shrink-0",
                          IMPORTANCE_CONFIG[event.importance]?.dotColor || 'bg-muted'
                        )} 
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{event.event}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {event.cryptoImpact && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs flex items-center gap-1",
                                  event.cryptoImpact === 'bullish' && "bg-profit/10 text-profit border-profit/30",
                                  event.cryptoImpact === 'bearish' && "bg-loss/10 text-loss border-loss/30",
                                  event.cryptoImpact === 'neutral' && "bg-muted text-muted-foreground"
                                )}
                              >
                                {getImpactIcon(event.cryptoImpact)}
                                <span>{event.cryptoImpact}</span>
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {event.importance}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{formatEventDate(event.date)}</span>
                          <span>{formatEventTime(event.date)} UTC</span>
                          <span>{event.country}</span>
                        </div>
                        
                        {/* Forecast / Previous / Actual data row */}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Forecast:</span>
                            <span className="font-mono font-medium">{event.forecast || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Previous:</span>
                            <span className="font-mono">{event.previous || 'N/A'}</span>
                          </div>
                          {event.actual && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Actual:</span>
                              <span className="font-mono font-bold text-foreground">{event.actual}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Historical Crypto Correlation Stats */}
                        {event.historicalStats && event.historicalStats.sampleSize > 0 && (
                          <div className="mt-2 text-xs p-2 rounded bg-primary/5 border border-primary/20 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge 
                                variant={event.historicalStats.probMoveGt2Pct >= 70 ? "destructive" : "outline"} 
                                className="text-[10px] h-4 px-1.5"
                              >
                                {event.historicalStats.probMoveGt2Pct}% prob BTC move &gt;2% in 2h
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] h-4 px-1.5 ${
                                  event.historicalStats.upsideBias >= 60 
                                    ? 'border-profit/40 text-profit' 
                                    : event.historicalStats.upsideBias <= 40 
                                      ? 'border-loss/40 text-loss' 
                                      : ''
                                }`}
                              >
                                {event.historicalStats.upsideBias}% historical upside bias
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                              <span>
                                Median move: <span className="font-mono font-medium text-foreground">+{event.historicalStats.medianBtcMove2h.toFixed(1)}%</span>
                              </span>
                              <span>
                                Worst case: <span className="font-mono font-medium text-loss">{event.historicalStats.worstCase2h.toFixed(1)}%</span>
                              </span>
                              <span>(n={event.historicalStats.sampleSize})</span>
                            </div>
                          </div>
                        )}
                        
                        {event.aiPrediction && (
                          <div className="mt-2">
                            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors group">
                              <Sparkles className="h-3 w-3" />
                              <span>AI Prediction</span>
                              <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                              <div className="pl-4 border-l-2 border-primary/30">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {event.aiPrediction}
                                </p>
                              </div>
                            </CollapsibleContent>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No upcoming events this week.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        Data from Forex Factory. AI analysis is for informational purposes only.
        {data?.lastUpdated && (
          <span className="block mt-1">
            Last updated: {format(new Date(data.lastUpdated), 'HH:mm:ss')}
          </span>
        )}
      </p>
    </div>
  );
}
