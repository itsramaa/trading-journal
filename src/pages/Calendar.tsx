/**
 * Calendar Page - Economic Calendar with AI Economic News Analysis
 * Focus on upcoming economic events and AI predictions
 */
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Sparkles,
  Newspaper,
  AlertTriangle
} from "lucide-react";
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

// Mock AI Economic News Predictions
const UPCOMING_NEWS_PREDICTIONS = [
  {
    date: 'Tomorrow',
    time: '08:00',
    event: 'UK GDP (QoQ)',
    aiPrediction: 'Likely to meet consensus. UK economy showing gradual recovery. Minimal crypto impact expected.',
  },
  {
    date: 'Wed',
    time: '18:00',
    event: 'FOMC Minutes',
    aiPrediction: 'Focus on rate cut timeline. Dovish tone could boost risk assets including crypto.',
  },
  {
    date: 'Thu',
    time: '12:30',
    event: 'US Jobless Claims',
    aiPrediction: 'Labor market remains tight. Higher claims could signal cooling, positive for rate cut expectations.',
  },
];

const Calendar = () => {
  const [newsLoading, setNewsLoading] = useState(false);

  const handleRefreshNews = () => {
    setNewsLoading(true);
    setTimeout(() => setNewsLoading(false), 1500);
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
        </div>

        {/* Economic Calendar - Upcoming Events */}
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

        {/* AI Economic News Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Economic News Analysis</CardTitle>
                <Badge variant="outline" className="text-xs">AI Powered</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshNews}
                disabled={newsLoading}
              >
                <RefreshCw className={cn("h-4 w-4", newsLoading && "animate-spin")} />
              </Button>
            </div>
            <CardDescription>
              AI predictions based on upcoming economic data releases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {newsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                {/* Today's Key Release */}
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Today: US CPI (YoY)</span>
                    <Badge>High Impact</Badge>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forecast:</span>
                      <span className="font-mono font-medium">3.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Previous:</span>
                      <span className="font-mono">3.4%</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="font-medium">AI Prediction:</p>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Expected slightly below consensus at 3.1%. Positive surprise could trigger 
                        USD weakness and risk-on rally. Watch for BTC reaction in the first 30 minutes.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-profit" />
                        <Badge variant="outline" className="bg-profit/10 text-profit border-profit/30">
                          If Below: Bullish Crypto
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-loss" />
                        <Badge variant="outline" className="bg-loss/10 text-loss border-loss/30">
                          If Above: Bearish Crypto
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upcoming High-Impact Events with Predictions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Upcoming Events Analysis</h4>
                  {UPCOMING_NEWS_PREDICTIONS.map((news, idx) => (
                    <div key={idx} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{news.event}</span>
                        <span className="text-xs text-muted-foreground">{news.date} {news.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{news.aiPrediction}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          Demo data shown. AI analysis is for informational purposes only and should not be used as sole trading advice.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
