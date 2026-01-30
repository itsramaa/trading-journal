/**
 * Market Insight Page - AI-powered market analysis
 * AI Sentiment, Volatility, Opportunities, Whale Tracking, Macro Analysis
 * Combined Crypto + Macro Analysis per INTEGRATION_GUIDE.md
 * Integrated with real APIs: Binance, CoinGecko, Alternative.me
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, BarChart3, Target, Zap, RefreshCw, Sparkles, Minus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useMarketSentiment, useMacroAnalysis, useCombinedAnalysis, useMarketAlerts } from "@/features/market-insight";
import { CombinedAnalysisCard } from "@/components/market-insight/CombinedAnalysisCard";
import type { WhaleSignal } from "@/features/market-insight/types";

const MarketInsight = () => {
  const { 
    data: sentimentData, 
    isLoading: sentimentLoading, 
    error: sentimentError,
    refetch: refetchSentiment 
  } = useMarketSentiment();
  
  const { 
    data: macroData, 
    isLoading: macroLoading, 
    error: macroError,
    refetch: refetchMacro 
  } = useMacroAnalysis();

  // Combined Crypto + Macro Analysis
  const { 
    data: combinedData, 
    isLoading: combinedLoading 
  } = useCombinedAnalysis();

  // Enable market alerts for extreme conditions
  useMarketAlerts({ 
    enabled: true, 
    fearGreedExtremeThreshold: { low: 25, high: 75 },
    showConflictAlerts: true 
  });

  const handleRefresh = () => {
    refetchSentiment();
    refetchMacro();
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

  const getWhaleSignalColor = (signal: WhaleSignal) => {
    switch (signal) {
      case 'ACCUMULATION': return 'bg-profit';
      case 'DISTRIBUTION': return 'bg-loss';
      default: return 'bg-muted-foreground';
    }
  };

  const isLoading = sentimentLoading || macroLoading;
  const hasError = sentimentError || macroError;

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
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh market insight data"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden="true" />
            Refresh Data
          </Button>
        </div>

        {/* Error State */}
        {hasError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm">
                  Failed to load market data. Please try refreshing.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combined Crypto + Macro Analysis - Top Priority per INTEGRATION_GUIDE */}
        <CombinedAnalysisCard 
          data={combinedData} 
          isLoading={combinedLoading || sentimentLoading || macroLoading} 
        />

        {/* AI Market Sentiment */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Market Sentiment</CardTitle>
              </div>
              {sentimentLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : sentimentData && (
                <Badge 
                  className={cn(
                    sentimentData.sentiment.overall === 'bullish' && "bg-profit text-profit-foreground",
                    sentimentData.sentiment.overall === 'bearish' && "bg-loss text-loss-foreground",
                    sentimentData.sentiment.overall === 'neutral' && "bg-secondary text-secondary-foreground"
                  )}
                >
                  {sentimentData.sentiment.overall.toUpperCase()}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sentimentLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
                <Skeleton className="h-20" />
                <Skeleton className="h-32" />
              </div>
            ) : sentimentData && (
              <>
                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">AI Confidence</span>
                    <div className="flex items-center gap-3">
                      <Progress value={sentimentData.sentiment.confidence} className="w-16 h-2" />
                      <span className="text-sm font-bold">{sentimentData.sentiment.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Fear & Greed</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{sentimentData.sentiment.fearGreed.value}</span>
                      <Badge variant="outline">{sentimentData.sentiment.fearGreed.label}</Badge>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Recommendation</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{sentimentData.sentiment.recommendation}</p>
                </div>

                {/* Market Signals */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Key Signals</h4>
                  <div className="grid gap-2">
                    {sentimentData.sentiment.signals.map((signal, idx) => (
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
                          {signal.price && (
                            <span className="text-xs text-muted-foreground font-mono">
                              ${signal.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground text-right max-w-[60%]">{signal.trend}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Macro Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Macro Analysis</CardTitle>
                <Badge variant="outline" className="text-xs">Live</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchMacro()}
                disabled={macroLoading}
                aria-label="Refresh macro analysis"
              >
                <RefreshCw className={cn("h-4 w-4", macroLoading && "animate-spin")} aria-hidden="true" />
                <span className="sr-only">Refresh macro analysis</span>
              </Button>
            </div>
            <CardDescription>
              Real-time market conditions from Binance & CoinGecko
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {macroLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : macroData && (
              <>
                {/* Overall Sentiment */}
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium",
                  getSentimentColor(macroData.macro.overallSentiment)
                )}>
                  {getSentimentIcon(macroData.macro.overallSentiment)}
                  <span>Market Sentiment: {getSentimentLabel(macroData.macro.overallSentiment)}</span>
                </div>

                {/* Key Correlations Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {macroData.macro.correlations.map((item, idx) => (
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
                      <p className="text-lg font-bold font-mono">
                        {typeof item.value === 'number' && item.value > 1000 
                          ? item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : item.value.toFixed(2)}
                      </p>
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
                      <p className="text-sm leading-relaxed">{macroData.macro.aiSummary}</p>
                    </div>
                  </div>
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
                Real-time volatility from price data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentimentLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : sentimentData?.volatility.map((item, idx) => (
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
                AI-ranked setups based on technicals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentimentLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : sentimentData?.opportunities.map((opp, idx) => (
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
              <Badge variant="outline">Volume Proxy</Badge>
            </div>
            <CardDescription>
              Volume-based whale activity detection from Binance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sentimentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : sentimentData?.whaleActivity.map((whale, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    getWhaleSignalColor(whale.signal)
                  )} />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{whale.asset}</Badge>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          whale.signal === 'ACCUMULATION' && "bg-profit/20 text-profit",
                          whale.signal === 'DISTRIBUTION' && "bg-loss/20 text-loss"
                        )}
                      >
                        {whale.signal}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{whale.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {whale.volumeChange24h > 0 ? '+' : ''}{whale.volumeChange24h.toFixed(1)}% vol
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {whale.confidence}% confidence
                  </p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">
              Based on 24h volume analysis from Binance API
            </p>
          </CardContent>
        </Card>

        {/* Data Quality Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Data quality: {sentimentData?.dataQuality ?? '-'}% • 
            Last updated: {sentimentData?.lastUpdated 
              ? new Date(sentimentData.lastUpdated).toLocaleTimeString() 
              : '-'}
          </span>
          <span>
            Sources: Binance, CoinGecko, Alternative.me
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketInsight;
