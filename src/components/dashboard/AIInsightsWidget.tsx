/**
 * AI Insights Widget for Dashboard
 * Shows AI-generated portfolio analysis and recommendations
 * Enhanced: Market Regime badge, Correlation warnings, user AI settings
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Lightbulb,
  Target,
  MessageCircle,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Link2,
  Minus,
} from "lucide-react";
import { useDashboardInsights, type DashboardInsights } from "@/features/ai/useDashboardInsights";
import { useAISettingsEnforcement } from "@/hooks/use-ai-settings-enforcement";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useUnifiedPortfolioData } from "@/hooks/use-unified-portfolio-data";
import { useBinancePositions, useBinanceConnectionStatus } from "@/features/binance";
import { useUnifiedMarketScore } from "@/hooks/use-unified-market-score";
import { useAppStore } from "@/store/app-store";
import { checkCorrelationRisk, extractSymbols, type CorrelationWarning } from "@/lib/correlation-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface AIInsightsWidgetProps {
  className?: string;
}

// Calculate win rate per pair from closed trades
function calculatePairStats(trades: any[]) {
  // Only count trades with non-zero PnL (exclude breakeven from denominator)
  const closedTrades = trades.filter(t => t.status === 'closed');
  const pairStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
  
  closedTrades.forEach(trade => {
    const pair = trade.pair;
    const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
    if (pnl === 0) return; // Exclude breakeven from win rate calculation
    if (!pairStats[pair]) {
      pairStats[pair] = { wins: 0, losses: 0, pnl: 0 };
    }
    pairStats[pair].pnl += pnl;
    if (pnl > 0) {
      pairStats[pair].wins++;
    } else {
      pairStats[pair].losses++;
    }
  });
  
  return Object.entries(pairStats).map(([pair, stats]) => {
    const decisive = stats.wins + stats.losses;
    return {
      pair,
      winRate: decisive > 0 ? (stats.wins / decisive) * 100 : 0,
      totalTrades: decisive,
      totalPnl: stats.pnl,
    };
  }).sort((a, b) => b.winRate - a.winRate);
}

export function AIInsightsWidget({ className }: AIInsightsWidgetProps) {
  const { getInsights, isLoading, error, insights, isFeatureEnabled } = useDashboardInsights();
  const { 
    shouldRunAIFeature, 
    filterByConfidence, 
    getConfidenceThreshold,
    isLoading: settingsLoading 
  } = useAISettingsEnforcement();
  const { data: trades = [] } = useModeFilteredTrades();
  const { data: strategies = [] } = useTradingStrategies();
  const portfolio = useUnifiedPortfolioData();
  const { data: positions = [], isLoading: positionsLoading } = useBinancePositions();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { score, bias, scoreLabel, volatilityLabel, isLoading: marketLoading } = useUnifiedMarketScore({ symbol: 'BTCUSDT' });
  const { setChatbotOpen, setChatbotInitialPrompt } = useAppStore();
  
  const [hasLoaded, setHasLoaded] = useState(false);

  // Check if AI feature is enabled based on user settings
  const isDailySuggestionsEnabled = shouldRunAIFeature('daily_suggestions');
  const confidenceThreshold = getConfidenceThreshold();

  // Check correlation risk for open positions (only if configured)
  const isConfigured = connectionStatus?.isConfigured ?? false;
  const correlationWarning = useMemo((): CorrelationWarning | null => {
    if (!isConfigured || !connectionStatus?.isConnected || !positions) return null;
    const activePositions = positions.filter(p => p.positionAmt !== 0);
    if (activePositions.length < 2) return null;
    const symbols = extractSymbols(activePositions);
    return checkCorrelationRisk(symbols);
  }, [positions, connectionStatus, isConfigured]);

  // Calculate pair-specific recommendations
  const pairRecommendations = useMemo(() => {
    const stats = calculatePairStats(trades);
    const focus = stats.filter(s => s.winRate >= 60 && s.totalTrades >= 5);
    const avoid = stats.filter(s => s.winRate < 50 && s.totalTrades >= 5);
    return { focus, avoid };
  }, [trades]);

  // Filter best setups by confidence threshold
  const filteredBestSetups = useMemo(() => {
    if (!insights?.bestSetups) return [];
    return filterByConfidence(insights.bestSetups);
  }, [insights?.bestSetups, filterByConfidence]);

  // Calculate portfolio and risk status using unified data
  const portfolioData = useMemo(() => {
    // Use unified portfolio data (Binance if connected, Paper fallback)
    const totalBalance = portfolio.totalCapital;
    const activePositions = positions.filter(p => p.positionAmt !== 0);
    const deployedCapital = portfolio.source === 'binance' 
      ? activePositions.reduce((sum, p) => sum + (Math.abs(p.notional) / (p.leverage || 1)), 0)
      : trades.filter(t => t.status === 'open').reduce((sum, t) => sum + (t.quantity * t.entry_price), 0);
    
    // Open positions count from appropriate source
    const openPositions = portfolio.source === 'binance'
      ? activePositions.length
      : trades.filter(t => t.status === 'open').length;
    
    // Use unified daily P&L data
    const currentDailyLoss = Math.min(portfolio.todayNetPnl, 0);
    const maxDailyLoss = totalBalance * 0.05;

    return {
      portfolioStatus: {
        totalBalance,
        deployedCapital,
        openPositions,
      },
      riskStatus: {
        currentDailyLoss,
        maxDailyLoss,
        tradingAllowed: Math.abs(currentDailyLoss) < maxDailyLoss,
      },
      recentTrades: trades.slice(0, 20).map(t => ({
        pair: t.pair,
        direction: t.direction,
        result: t.result || 'pending',
        pnl: t.pnl || 0,
        date: t.trade_date,
      })),
      strategies: strategies.map(s => {
        // Calculate actual per-strategy win rate from closed trades
        const strategyTrades = trades.filter(t => {
          if (t.status !== 'closed') return false;
          const pnl = t.realized_pnl ?? t.pnl ?? 0;
          if (pnl === 0) return false;
          // Match by trade_entry_strategies relation or tag/name match
          const tradeStrategies = (t as any).trade_entry_strategies;
          if (Array.isArray(tradeStrategies)) {
            return tradeStrategies.some((ts: any) => ts.strategy_id === s.id);
          }
          // Fallback: check tags for strategy name
          if (Array.isArray(t.tags)) {
            return t.tags.some((tag: string) => tag.toLowerCase() === s.name.toLowerCase());
          }
          return false;
        });
        const wins = strategyTrades.filter(t => (t.realized_pnl ?? t.pnl ?? 0) > 0).length;
        const total = strategyTrades.length;
        return {
          name: s.name,
          trades: total,
          winRate: total > 0 ? (wins / total) * 100 : 0,
        };
      }),
      deploymentCategory: (() => {
        const percent = totalBalance > 0 ? (deployedCapital / totalBalance) * 100 : 0;
        if (percent === 0) return 'none';
        if (percent < 10) return 'light';
        if (percent <= 40) return 'moderate';
        return 'heavy';
      })(),
      source: portfolio.source,
    };
  }, [portfolio, trades, strategies, positions]);

  const handleRefresh = async () => {
    const result = await getInsights(portfolioData);
    if (result) {
      toast.success("AI insights refreshed");
    } else if (error) {
      toast.error(error);
    }
    setHasLoaded(true);
  };

  // Auto-load on mount if we have data and feature is enabled
  useEffect(() => {
    const positionsReady = portfolio.source !== 'binance' || !positionsLoading;
    if (!hasLoaded && (trades.length > 0 || portfolio.hasData) && isDailySuggestionsEnabled && !settingsLoading && positionsReady && !marketLoading) {
      handleRefresh();
    }
  }, [trades.length, portfolio.hasData, hasLoaded, isDailySuggestionsEnabled, settingsLoading, positionsLoading, portfolio.source, marketLoading]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-profit" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-loss" />;
      case 'cautious':
        return <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-profit bg-profit/10 border-profit/30';
      case 'bearish': return 'text-loss bg-loss/10 border-loss/30';
      case 'cautious': return 'text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10 border-[hsl(var(--chart-4))]/30';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  // Render disabled state if AI feature is turned off
  if (!isDailySuggestionsEnabled && !settingsLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              AI Insights
              <Badge variant="secondary" className="text-xs">Disabled</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Settings className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              AI Daily Suggestions is disabled in your settings
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings?tab=ai">
                <Settings className="h-4 w-4 mr-2" />
                Enable in Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
            <Badge variant="outline" className="text-xs">Last 20</Badge>
            <Badge variant="outline" className="text-xs">
              {portfolio.source === 'binance' ? '🔗 Live' : '📝 Paper'}
            </Badge>
            {confidenceThreshold > 75 && (
              <Badge variant="outline" className="text-xs">
                Min {confidenceThreshold}% confidence
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Market Regime Badge */}
            {!marketLoading && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs gap-1",
                  bias === 'LONG_FAVORABLE'
                    ? "border-profit/30 text-profit bg-profit/10" 
                    : bias === 'SHORT_FAVORABLE'
                    ? "border-loss/30 text-loss bg-loss/10"
                    : bias === 'AVOID'
                    ? "border-destructive/30 text-destructive bg-destructive/10"
                    : "border-muted-foreground/30"
                )}
              >
                {bias === 'LONG_FAVORABLE' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : bias === 'SHORT_FAVORABLE' ? (
                  <TrendingDown className="h-3 w-3" />
                ) : bias === 'AVOID' ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                Market: {scoreLabel} | {score}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || !isDailySuggestionsEnabled}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Correlation Warning */}
        {correlationWarning && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
            <Link2 className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-warning">
                Correlation Risk: {correlationWarning.pairs.length} pair{correlationWarning.pairs.length !== 1 ? 's' : ''} ({(correlationWarning.avgCorrelation * 100).toFixed(0)}% avg)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {correlationWarning.pairs.slice(0, 2).map(p => 
                  `${p.pair1.replace('USDT', '')}↔${p.pair2.replace('USDT', '')}`
                ).join(', ')}
                {correlationWarning.pairs.length > 2 && ` +${correlationWarning.pairs.length - 2} more`}
              </p>
            </div>
          </div>
        )}
        {isLoading && !insights && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && !insights && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        )}

        {!insights && !isLoading && !error && (
          <div className="text-center py-4">
            <Sparkles className="h-8 w-8 text-primary/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Get AI-powered insights about your trading portfolio
            </p>
            <Button onClick={handleRefresh} size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Insights
            </Button>
          </div>
        )}

        {insights && (
          <>
            {/* Sentiment Badge */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
              getSentimentColor(insights.overallSentiment)
            )}>
              {getSentimentIcon(insights.overallSentiment)}
              <span>Portfolio Sentiment: <span className="capitalize">{insights.overallSentiment}</span></span>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>

            {/* Risk Alerts */}
            {insights.riskAlerts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--chart-4))]">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Alerts
                </div>
                <div className="space-y-1">
                  {insights.riskAlerts.map((alert, i) => (
                    <p key={i} className="text-sm text-[hsl(var(--chart-4))]/90 pl-6">
                      • {alert}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Recommendations
                </div>
                <div className="space-y-1">
                  {insights.recommendations.slice(0, 3).map((rec, i) => (
                    <p key={i} className="text-sm text-muted-foreground pl-6">
                      • {rec}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Best Setups - Filtered by confidence threshold */}
            {filteredBestSetups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4 text-primary" />
                    Top Setups
                  </div>
                  {insights.bestSetups.length > filteredBestSetups.length && (
                    <span className="text-xs text-muted-foreground">
                      {insights.bestSetups.length - filteredBestSetups.length} filtered out
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {filteredBestSetups.slice(0, 2).map((setup, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <span className="font-medium text-sm">{setup.pair}</span>
                        <p className="text-xs text-muted-foreground">{setup.strategy}</p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          setup.confidence >= 80 && "bg-profit/10 text-profit border-profit/30"
                        )}
                      >
                        {setup.confidence}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show message if all setups were filtered out */}
            {insights.bestSetups.length > 0 && filteredBestSetups.length === 0 && (
              <div className="text-center py-2 text-sm text-muted-foreground">
                No setups meet your confidence threshold ({confidenceThreshold}%)
              </div>
            )}

            {/* Ask AI Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                setChatbotInitialPrompt("Explain my trading insights in detail based on recent performance data");
                setChatbotOpen(true);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Ask AI for Details
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </>
        )}

        {/* Trade Opportunities - Based on Historical Win Rates */}
        {(pairRecommendations.focus.length > 0 || pairRecommendations.avoid.length > 0) && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              Trade Opportunities
            </div>
            
            {/* Focus pairs */}
            {pairRecommendations.focus.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-profit">
                  <ThumbsUp className="h-3 w-3" />
                  <span>Focus on (Historical Win Rate, min 5 trades)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pairRecommendations.focus.slice(0, 4).map((item) => (
                    <Badge 
                      key={item.pair} 
                      variant="outline"
                      className={cn(
                        "text-xs bg-profit/10 text-profit border-profit/30",
                        item.totalTrades < 10 && "opacity-70"
                      )}
                    >
                      {item.pair} ({item.winRate.toFixed(0)}% / {item.totalTrades}t)
                      {item.totalTrades < 10 && " ⚠️"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Avoid pairs */}
            {pairRecommendations.avoid.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-loss">
                  <ThumbsDown className="h-3 w-3" />
                  <span>Consider Avoiding (Low Win Rate)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pairRecommendations.avoid.slice(0, 4).map((item) => (
                    <Badge 
                      key={item.pair} 
                      variant="outline"
                      className="text-xs bg-loss/10 text-loss border-loss/30"
                    >
                      {item.pair} ({item.winRate.toFixed(0)}% / {item.totalTrades}t)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
