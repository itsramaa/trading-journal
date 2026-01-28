/**
 * Market Insight Page - AI-powered market analysis
 * AI Sentiment, Volatility, Opportunities, Whale Tracking, Macro Analysis
 */
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, Zap, RefreshCw, Sparkles, Minus, DollarSign, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

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

const MarketInsight = () => {
  const [macroLoading, setMacroLoading] = useState(false);
  const [macroData] = useState(MACRO_CONDITIONS);

  const handleRefreshMacro = () => {
    setMacroLoading(true);
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
              <TrendingUp className="h-6 w-6 text-primary" />
              Market Insight
            </h1>
            <p className="text-muted-foreground">
              AI-powered market analysis and trading opportunities
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {/* AI Market Sentiment - Compact Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Market Sentiment</CardTitle>
              </div>
              <Badge 
                className={cn(
                  MOCK_SENTIMENT.overall === 'bullish' && "bg-profit text-profit-foreground",
                  MOCK_SENTIMENT.overall === 'bearish' && "bg-loss text-loss-foreground",
                  MOCK_SENTIMENT.overall === 'neutral' && "bg-secondary text-secondary-foreground"
                )}
              >
                {MOCK_SENTIMENT.overall.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">AI Confidence</span>
                <div className="flex items-center gap-3">
                  <Progress value={MOCK_SENTIMENT.confidence} className="w-16 h-2" />
                  <span className="text-sm font-bold">{MOCK_SENTIMENT.confidence}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Fear & Greed</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{MOCK_SENTIMENT.fearGreed.value}</span>
                  <Badge variant="outline">{MOCK_SENTIMENT.fearGreed.label}</Badge>
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Recommendation</span>
              </div>
              <p className="text-sm text-muted-foreground">{MOCK_SENTIMENT.recommendation}</p>
            </div>

            {/* Market Signals */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Key Signals</h4>
              <div className="grid gap-2">
                {MOCK_SENTIMENT.signals.map((signal, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {signal.direction === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-profit" />
                      ) : signal.direction === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-loss" />
                      ) : (
                        <Activity className="h-4 w-4 text-secondary" />
                      )}
                      <span className="font-medium">{signal.asset}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{signal.trend}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Macro Analysis - Moved from Calendar */}
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

        {/* Two Column: Volatility + Opportunities */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* AI Volatility Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Volatility Assessment</CardTitle>
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
                        item.level === 'high' && "border-loss text-loss",
                        item.level === 'medium' && "border-secondary text-secondary-foreground",
                        item.level === 'low' && "border-profit text-profit"
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
                        item.level === 'high' && "[&>div]:bg-loss",
                        item.level === 'medium' && "[&>div]:bg-secondary",
                        item.level === 'low' && "[&>div]:bg-profit"
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
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Trading Opportunities</CardTitle>
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

        {/* AI Whale Tracking */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Whale Tracking</CardTitle>
              </div>
              <Badge variant="outline">Beta</Badge>
            </div>
            <CardDescription>
              Monitor large wallet movements and institutional activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mock Whale Data */}
            {[
              { wallet: '0x1a2b...3c4d', asset: 'BTC', amount: '1,250 BTC', action: 'Accumulated', time: '2h ago', impact: 'bullish' },
              { wallet: '0x5e6f...7g8h', asset: 'ETH', amount: '15,000 ETH', action: 'Transferred to Exchange', time: '4h ago', impact: 'bearish' },
              { wallet: '0x9i0j...1k2l', asset: 'SOL', amount: '500,000 SOL', action: 'Staked', time: '6h ago', impact: 'bullish' },
            ].map((whale, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    whale.impact === 'bullish' ? "bg-profit" : "bg-loss"
                  )} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{whale.wallet}</span>
                      <Badge variant="outline" className="text-xs">{whale.asset}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{whale.action} • {whale.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-medium text-sm">{whale.amount}</span>
                  <p className={cn(
                    "text-xs",
                    whale.impact === 'bullish' ? "text-profit" : "text-loss"
                  )}>
                    {whale.impact === 'bullish' ? '↑ Bullish Signal' : '↓ Bearish Signal'}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Whale tracking requires blockchain data API integration.
            </p>
          </CardContent>
        </Card>

        {/* Footer disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          Demo data shown. Connect to a live API for real-time market data.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default MarketInsight;
