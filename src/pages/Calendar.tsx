/**
 * Calendar Page - Economic Calendar with AI Economic News Analysis
 * Real-time data from Trading Economics API with AI predictions
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Sparkles,
  Newspaper,
  AlertTriangle,
  Shield,
  Clock,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEconomicCalendar } from "@/features/calendar";
import { format } from "date-fns";

const Calendar = () => {
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

  const getImpactColor = (impact: 'bullish' | 'bearish' | 'neutral' | null) => {
    switch (impact) {
      case 'bullish': return 'text-profit';
      case 'bearish': return 'text-loss';
      default: return 'text-muted-foreground';
    }
  };

  const getImpactIcon = (impact: 'bullish' | 'bearish' | 'neutral' | null) => {
    switch (impact) {
      case 'bullish': return <TrendingUp className="h-3 w-3" />;
      case 'bearish': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

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
              Track upcoming high-impact economic events and AI predictions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Impact Alert Banner */}
        {data?.impactSummary?.hasHighImpact && data.impactSummary.riskLevel !== 'LOW' && (
          <Alert variant={data.impactSummary.riskLevel === 'VERY_HIGH' ? 'destructive' : 'default'} className="border-primary/30 bg-primary/5">
            <Shield className="h-4 w-4" />
            <AlertTitle className="font-semibold">
              {data.impactSummary.riskLevel === 'VERY_HIGH' ? 'Very High Impact Day' : 
               data.impactSummary.riskLevel === 'HIGH' ? 'High Impact Event' : 'Upcoming High Impact Events'}
            </AlertTitle>
            <AlertDescription>
              {data.impactSummary.eventCount} high-impact event{data.impactSummary.eventCount > 1 ? 's' : ''} detected. 
              {data.impactSummary.positionAdjustment === 'reduce_50%' && ' Consider reducing position sizes by 50%.'}
              {data.impactSummary.positionAdjustment === 'reduce_30%' && ' Consider reducing position sizes by 30%.'}
              {data.impactSummary.positionAdjustment === 'normal' && ' Stay alert for potential volatility.'}
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
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </div>
            <CardDescription>
              High-impact economic events affecting market volatility
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-16 w-full" />
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
              <div className="space-y-3">
                {data.events.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2 shrink-0",
                      event.importance === 'high' && "bg-loss",
                      event.importance === 'medium' && "bg-secondary",
                      event.importance === 'low' && "bg-profit"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{event.event}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {event.cryptoImpact && (
                            <span className={cn("flex items-center gap-1", getImpactColor(event.cryptoImpact))}>
                              {getImpactIcon(event.cryptoImpact)}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {event.importance}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatEventDate(event.date)}</span>
                        <span>{formatEventTime(event.date)} UTC</span>
                        {event.forecast && <span>Forecast: {event.forecast}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No upcoming events this week.
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Economic News Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Economic News Analysis</CardTitle>
              <Badge variant="outline" className="text-xs">AI Powered</Badge>
            </div>
            <CardDescription>
              AI predictions based on upcoming economic data releases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : data?.events?.filter(e => e.aiPrediction).length ? (
              <div className="space-y-3">
                {data.events
                  .filter(e => e.aiPrediction)
                  .map((event) => (
                    <div key={event.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{event.event}</span>
                        <div className="flex items-center gap-2">
                          {event.cryptoImpact && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                event.cryptoImpact === 'bullish' && "bg-profit/10 text-profit border-profit/30",
                                event.cryptoImpact === 'bearish' && "bg-loss/10 text-loss border-loss/30"
                              )}
                            >
                              {event.cryptoImpact}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatEventDate(event.date)} {formatEventTime(event.date)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.aiPrediction}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>AI predictions will appear for high-impact events.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          Data from Trading Economics API. AI analysis is for informational purposes only and should not be used as sole trading advice.
          {data?.lastUpdated && (
            <span className="block mt-1">
              Last updated: {format(new Date(data.lastUpdated), 'HH:mm:ss')}
            </span>
          )}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
