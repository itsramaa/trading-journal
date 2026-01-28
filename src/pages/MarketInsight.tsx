/**
 * Market Insight Page - AI-powered market analysis
 * AI Sentiment, Volatility, Opportunities, Whale Tracking
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, Zap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const MarketInsight = () => {
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
