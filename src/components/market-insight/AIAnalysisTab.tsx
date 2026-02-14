/**
 * AI Analysis Tab Component - Sentiment & Macro Analysis
 * Extracted from MarketInsight.tsx for tabbed interface
 * Wrapped with error boundary for graceful edge function failure handling
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ErrorBoundary, AsyncErrorFallback } from "@/components/ui/error-boundary";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  RefreshCw, 
  Sparkles, 
  Minus 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketInsightResponse, MacroAnalysisResponse } from "@/features/market-insight/types";

interface AIAnalysisTabProps {
  sentimentData?: MarketInsightResponse;
  macroData?: MacroAnalysisResponse;
  isLoading: boolean;
  onRefresh: () => void;
  error?: Error | null;
}

export function AIAnalysisTab({ 
  sentimentData, 
  macroData, 
  isLoading, 
  onRefresh,
  error 
}: AIAnalysisTabProps) {
  // Handle async data errors gracefully
  if (error) {
    return (
      <AsyncErrorFallback 
        error={error} 
        onRetry={onRefresh}
        title="Failed to load AI analysis"
      />
    );
  }
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
    <ErrorBoundary title="AI Analysis Error" onRetry={onRefresh}>
    <div className="space-y-6">
      {/* AI Market Sentiment */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Market Sentiment</CardTitle>
            </div>
            {isLoading ? (
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
          {isLoading ? (
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
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh macro analysis"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden="true" />
              <span className="sr-only">Refresh macro analysis</span>
            </Button>
          </div>
          <CardDescription>
            Real-time market conditions from Binance & CoinGecko
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
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
    </div>
    </ErrorBoundary>
  );
}
