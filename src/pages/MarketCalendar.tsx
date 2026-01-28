import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown, Activity, BarChart3, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

// Economic events (mock data)
const UPCOMING_EVENTS = [
  { date: 'Today', time: '14:30', event: 'US CPI (YoY)', impact: 'high', forecast: '3.2%' },
  { date: 'Today', time: '16:00', event: 'Fed Chair Powell Speaks', impact: 'high', forecast: '-' },
  { date: 'Tomorrow', time: '08:00', event: 'UK GDP (QoQ)', impact: 'medium', forecast: '0.2%' },
  { date: 'Tomorrow', time: '12:30', event: 'US Retail Sales', impact: 'medium', forecast: '0.3%' },
  { date: 'Wed', time: '18:00', event: 'FOMC Minutes', impact: 'high', forecast: '-' },
  { date: 'Thu', time: '12:30', event: 'US Jobless Claims', impact: 'medium', forecast: '215K' },
];

// Mock AI Sentiment Data
const MOCK_SENTIMENT = {
  overall: 'bullish' as 'bullish' | 'bearish' | 'neutral',
  confidence: 78,
  signals: [
    { asset: 'BTC', trend: 'Strong uptrend, above all major MAs', direction: 'up' as 'up' | 'down' | 'neutral' },
    { asset: 'ETH', trend: 'Outperforming BTC, strong momentum', direction: 'up' as 'up' | 'down' | 'neutral' },
    { asset: 'SOL', trend: 'Consolidating near resistance', direction: 'neutral' as 'up' | 'down' | 'neutral' },
  ],
  fearGreed: { value: 62, label: 'Greed' },
  recommendation: 'Market conditions favor long positions with tight stops',
};

// Mock Volatility Data
const MOCK_VOLATILITY = [
  { asset: 'BTC', level: 'medium', value: 42, status: 'Normal range' },
  { asset: 'ETH', level: 'high', value: 68, status: 'Elevated - caution' },
  { asset: 'SOL', level: 'low', value: 28, status: 'Low volatility' },
];

// Mock Trading Opportunities
const MOCK_OPPORTUNITIES = [
  { pair: 'ETH/USDT', confidence: 85, direction: 'LONG', reason: 'Breakout above key resistance with volume' },
  { pair: 'BTC/USDT', confidence: 72, direction: 'LONG', reason: 'Higher low formation, bullish structure' },
  { pair: 'SOL/USDT', confidence: 58, direction: 'WAIT', reason: 'Awaiting confirmation at $145 level' },
];

const MarketCalendar = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar & Market Sentiment</h1>
          <p className="text-muted-foreground">
            AI-powered market analysis and economic calendar
          </p>
        </div>

        {/* AI Market Sentiment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>AI Market Sentiment</CardTitle>
              </div>
              <Badge 
                className={cn(
                  MOCK_SENTIMENT.overall === 'bullish' && "bg-green-500",
                  MOCK_SENTIMENT.overall === 'bearish' && "bg-red-500",
                  MOCK_SENTIMENT.overall === 'neutral' && "bg-yellow-500"
                )}
              >
                {MOCK_SENTIMENT.overall.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>
              Based on technical analysis, market structure, and momentum indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Confidence Score */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">AI Confidence</span>
              <div className="flex items-center gap-3">
                <Progress value={MOCK_SENTIMENT.confidence} className="w-24 h-2" />
                <span className="text-sm font-bold">{MOCK_SENTIMENT.confidence}%</span>
              </div>
            </div>

            {/* Fear & Greed */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Fear & Greed Index</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{MOCK_SENTIMENT.fearGreed.value}</span>
                <Badge variant="outline">{MOCK_SENTIMENT.fearGreed.label}</Badge>
              </div>
            </div>

            {/* Market Signals */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Key Signals</h4>
              {MOCK_SENTIMENT.signals.map((signal, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    {signal.direction === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : signal.direction === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Activity className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{signal.asset}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{signal.trend}</span>
                </div>
              ))}
            </div>

            {/* AI Recommendation */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Recommendation</span>
              </div>
              <p className="text-sm text-muted-foreground">{MOCK_SENTIMENT.recommendation}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* AI Volatility Assessment */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Volatility Assessment</CardTitle>
              </div>
              <CardDescription>
                Current market volatility levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_VOLATILITY.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.asset}</span>
                    <Badge 
                      variant="outline"
                      className={cn(
                        item.level === 'high' && "border-red-500 text-red-500",
                        item.level === 'medium' && "border-yellow-500 text-yellow-500",
                        item.level === 'low' && "border-green-500 text-green-500"
                      )}
                    >
                      {item.level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={item.value} 
                      className={cn(
                        "w-16 h-2",
                        item.level === 'high' && "[&>div]:bg-red-500",
                        item.level === 'medium' && "[&>div]:bg-yellow-500",
                        item.level === 'low' && "[&>div]:bg-green-500"
                      )}
                    />
                    <span className="text-xs text-muted-foreground w-24 text-right">{item.status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Trading Opportunities */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Trading Opportunities</CardTitle>
              </div>
              <CardDescription>
                AI-ranked trading setups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_OPPORTUNITIES.map((opp, idx) => (
                <div key={idx} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{opp.pair}</span>
                      <Badge 
                        variant={opp.direction === 'LONG' ? 'default' : opp.direction === 'SHORT' ? 'destructive' : 'secondary'}
                      >
                        {opp.direction}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold">{opp.confidence}%</span>
                      <span className="text-xs text-muted-foreground">conf.</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{opp.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Economic Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Economic Calendar</CardTitle>
            </div>
            <CardDescription>
              Upcoming high-impact economic events
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
                    "w-2 h-2 rounded-full mt-2",
                    event.impact === 'high' && "bg-red-500",
                    event.impact === 'medium' && "bg-yellow-500",
                    event.impact === 'low' && "bg-green-500"
                  )} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{event.event}</p>
                      <Badge variant="outline" className="text-xs">
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
            <p className="text-xs text-muted-foreground text-center mt-4">
              Data is for demonstration purposes. Connect to a live economic calendar API for real-time events.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MarketCalendar;
