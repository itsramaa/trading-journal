/**
 * Calendar Page - Economic Calendar with AI Macro Analysis
 * Focus on upcoming economic events and macro conditions
 */
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Sparkles,
  DollarSign,
  BarChart3,
  Activity,
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

// Mock macro conditions data
const MACRO_CONDITIONS = {
  overallSentiment: 'cautious' as 'bullish' | 'bearish' | 'cautious',
  correlations: [
    { name: 'DXY (Dollar Index)', value: 104.25, change: -0.15, impact: 'Weaker dollar supportive for risk assets' },
    { name: 'S&P 500', value: 5234.50, change: 0.45, impact: 'Risk-on sentiment in equities' },
    { name: '10Y Treasury', value: 4.42, change: 0.08, impact: 'Rising yields may pressure growth stocks' },
    { name: 'VIX', value: 14.25, change: -0.85, impact: 'Low volatility, complacency risk' },
  ],
  aiSummary: 'Market sedang dalam fase konsolidasi dengan sentimen mixed. DXY melemah sedikit yang mendukung aset berisiko, namun yield treasury naik menandakan kekhawatiran inflasi. VIX rendah menunjukkan potensi volatilitas mendadak. Perhatikan CPI release hari ini yang bisa memicu pergerakan signifikan.',
  lastUpdated: new Date(),
};

const Calendar = () => {
  const [macroLoading, setMacroLoading] = useState(false);
  const [macroData] = useState(MACRO_CONDITIONS);

  const handleRefreshMacro = () => {
    setMacroLoading(true);
    // Simulate API call
    setTimeout(() => setMacroLoading(false), 1500);
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="h-5 w-5 text-profit" />;
      case 'bearish': return <TrendingDown className="h-5 w-5 text-loss" />;
      default: return <Minus className="h-5 w-5 text-secondary" />;
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'Bullish';
      case 'bearish': return 'Bearish';
      default: return 'Cautious';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'bg-profit/10 text-profit border-profit/30';
      case 'bearish': return 'bg-loss/10 text-loss border-loss/30';
      default: return 'bg-secondary/10 text-secondary-foreground border-secondary/30';
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
              Track upcoming high-impact economic events and macro conditions
            </p>
          </div>
        </div>

        {/* AI Macro Conditions Widget */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Macro Analysis</CardTitle>
                <Badge variant="outline" className="text-xs">AI Powered</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshMacro}
                disabled={macroLoading}
              >
                <RefreshCw className={cn("h-4 w-4", macroLoading && "animate-spin")} />
              </Button>
            </div>
            <CardDescription>
              Current macro conditions affecting crypto & forex markets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {macroLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                {/* Overall Sentiment */}
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium",
                  getSentimentColor(macroData.overallSentiment)
                )}>
                  {getSentimentIcon(macroData.overallSentiment)}
                  <span>Market Sentiment: {getSentimentLabel(macroData.overallSentiment)}</span>
                </div>

                {/* Key Correlations Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {macroData.correlations.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.name}</span>
                        <div className="flex items-center gap-1">
                          {item.change >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-profit" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-loss" />
                          )}
                          <span className={cn(
                            "text-xs font-mono",
                            item.change >= 0 ? "text-profit" : "text-loss"
                          )}>
                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-lg font-bold font-mono">{item.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.impact}</p>
                    </div>
                  ))}
                </div>

                {/* AI Summary */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary mb-1">AI Analysis Summary</p>
                      <p className="text-sm leading-relaxed">{macroData.aiSummary}</p>
                    </div>
                  </div>
                </div>

                {/* Warning for high-impact events */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
                  <AlertTriangle className="h-4 w-4 text-secondary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">High-impact event today:</span> US CPI release at 14:30 UTC may cause significant volatility
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

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
          Demo data shown. AI analysis is for informational purposes only and should not be used as sole trading advice.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
