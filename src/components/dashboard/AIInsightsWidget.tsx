/**
 * AI Insights Widget for Dashboard
 * Shows AI-generated portfolio analysis and recommendations
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
} from "lucide-react";
import { useDashboardInsights, type DashboardInsights } from "@/features/ai/useDashboardInsights";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useAccounts } from "@/hooks/use-accounts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIInsightsWidgetProps {
  className?: string;
}

export function AIInsightsWidget({ className }: AIInsightsWidgetProps) {
  const { getInsights, isLoading, error, insights } = useDashboardInsights();
  const { data: trades = [] } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const { data: accounts = [] } = useAccounts();
  
  const [hasLoaded, setHasLoaded] = useState(false);

  // Calculate portfolio and risk status
  const portfolioData = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const openTrades = trades.filter(t => t.status === 'open');
    const deployedCapital = openTrades.reduce((sum, t) => sum + (t.quantity * t.entry_price), 0);
    
    // Calculate daily loss (simplified - trades from today)
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = trades.filter(t => t.trade_date === today && t.status === 'closed');
    const currentDailyLoss = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    return {
      portfolioStatus: {
        totalBalance,
        deployedCapital,
        openPositions: openTrades.length,
      },
      riskStatus: {
        currentDailyLoss: Math.min(currentDailyLoss, 0),
        maxDailyLoss: totalBalance * 0.05, // 5% default
        tradingAllowed: Math.abs(currentDailyLoss) < totalBalance * 0.05,
      },
      recentTrades: trades.slice(0, 20).map(t => ({
        pair: t.pair,
        direction: t.direction,
        result: t.result || 'pending',
        pnl: t.pnl || 0,
        date: t.trade_date,
      })),
      strategies: strategies.map(s => {
        const stratTrades = trades.filter(t => t.id); // Would need trade_entry_strategies join
        const wins = stratTrades.filter(t => t.result === 'win').length;
        return {
          name: s.name,
          trades: stratTrades.length,
          winRate: stratTrades.length > 0 ? (wins / stratTrades.length * 100) : 0,
        };
      }),
    };
  }, [accounts, trades, strategies]);

  const handleRefresh = async () => {
    const result = await getInsights(portfolioData);
    if (result) {
      toast.success("AI insights refreshed");
    } else if (error) {
      toast.error(error);
    }
    setHasLoaded(true);
  };

  // Auto-load on mount if we have data
  useEffect(() => {
    if (!hasLoaded && trades.length > 0 && accounts.length > 0) {
      handleRefresh();
    }
  }, [trades.length, accounts.length, hasLoaded]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'cautious':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'bearish': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'cautious': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <span className="capitalize">{insights.overallSentiment}</span>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>

            {/* Risk Alerts */}
            {insights.riskAlerts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Alerts
                </div>
                <div className="space-y-1">
                  {insights.riskAlerts.map((alert, i) => (
                    <p key={i} className="text-sm text-yellow-600/90 pl-6">
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

            {/* Best Setups */}
            {insights.bestSetups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4 text-primary" />
                  Top Setups
                </div>
                <div className="space-y-2">
                  {insights.bestSetups.slice(0, 2).map((setup, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <span className="font-medium text-sm">{setup.pair}</span>
                        <p className="text-xs text-muted-foreground">{setup.strategy}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {setup.confidence}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ask AI Button */}
            <Button variant="outline" size="sm" className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Ask AI for Details
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
