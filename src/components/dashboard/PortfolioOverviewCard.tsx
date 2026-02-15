/**
 * Portfolio Overview Card - System-First Design
 * Shows portfolio data from internal sources (paper accounts, trade entries)
 * Enriched with Binance data when connected
 * 
 * Philosophy: Always renders with available data, exchange is optional enhancement
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Wifi,
  Target,
  Plus,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useUnifiedPortfolioData } from "@/hooks/use-unified-portfolio-data";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { formatPercent, formatWinRate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface PortfolioOverviewCardProps {
  className?: string;
}

export function PortfolioOverviewCard({ className }: PortfolioOverviewCardProps) {
  const portfolio = useUnifiedPortfolioData();
  const { format, formatPnl, currency } = useCurrencyConversion();

  // Loading state
  if (portfolio.isLoading) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Portfolio Overview
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state - Show onboarding CTA
  if (!portfolio.hasData) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">Start Your Trading Analytics</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Create a paper trading account to track your performance, or connect Binance for live data.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link to="/accounts">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Account
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings?tab=exchange">
                  <Zap className="h-4 w-4 mr-1" />
                  Connect Exchange
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate return percentages
  const todayReturnPercent = portfolio.totalCapital > 0 
    ? (portfolio.todayNetPnl / portfolio.totalCapital) * 100 
    : 0;
  
  const weeklyReturnPercent = portfolio.totalCapital > 0 
    ? (portfolio.weeklyNetPnl / portfolio.totalCapital) * 100 
    : 0;

  // Source badge config
  const getSourceBadge = () => {
    if (portfolio.source === 'binance') {
      return (
        <Badge variant="outline" className="text-xs gap-1 border-profit/30 text-profit">
          <Wifi className="h-3 w-3" />
          Binance Live
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs gap-1">
        {portfolio.sourceName}
      </Badge>
    );
  };

  return (
    <Card className={cn("border-primary/20 bg-card/80 backdrop-blur-sm", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            Portfolio Overview
          </CardTitle>
          {getSourceBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-4">
          {/* Total Capital */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Capital</p>
            {portfolio.totalCapital > 0 ? (
              <p className="text-2xl font-bold tracking-tight">
                <AnimatedNumber 
                  value={portfolio.totalCapital} 
                  format={(v) => format(v)} 
                />
              </p>
            ) : (
              <p className="text-lg text-muted-foreground">—</p>
            )}
          </div>

          {/* Today's Net P&L */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Realized P&L</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                portfolio.todayNetPnl >= 0 ? 'text-profit' : 'text-loss'
              )}>
                <AnimatedNumber
                  value={portfolio.todayNetPnl}
                  format={(v) => formatPnl(v)}
                  colorize
                />
              </p>
              {portfolio.todayNetPnl !== 0 && portfolio.totalCapital > 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-semibold",
                    portfolio.todayNetPnl >= 0 
                      ? "border-profit/30 text-profit bg-profit/10" 
                      : "border-loss/30 text-loss bg-loss/10"
                  )}
                >
                  {portfolio.todayNetPnl > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {formatPercent(todayReturnPercent)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolio.todayTrades} trade{portfolio.todayTrades !== 1 ? 's' : ''} today
            </p>
          </div>

          {/* Weekly P&L */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weekly Net P&L</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                portfolio.weeklyNetPnl >= 0 ? 'text-profit' : 'text-loss'
              )}>
                <AnimatedNumber
                  value={portfolio.weeklyNetPnl}
                  format={(v) => formatPnl(v)}
                  colorize
                />
              </p>
              {portfolio.weeklyNetPnl !== 0 && portfolio.totalCapital > 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-semibold",
                    portfolio.weeklyNetPnl >= 0 
                      ? "border-profit/30 text-profit bg-profit/10" 
                      : "border-loss/30 text-loss bg-loss/10"
                  )}
                >
                  {formatPercent(weeklyReturnPercent)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>

          {/* Win Rate */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Win Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tracking-tight">
                {formatWinRate(portfolio.todayWinRate)}
              </p>
              <div className={cn(
                "p-1 rounded-full",
                portfolio.todayWinRate >= 50 ? "bg-profit/10" : portfolio.todayTrades > 0 ? "bg-loss/10" : "bg-muted"
              )}>
                <Target className={cn(
                  "h-4 w-4",
                  portfolio.todayWinRate >= 50 ? "text-profit" : portfolio.todayTrades > 0 ? "text-loss" : "text-muted-foreground"
                )} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolio.todayTrades > 0 
                ? `${portfolio.todayWins}W / ${portfolio.todayLosses}L` 
                : 'No trades yet'}
            </p>
          </div>
        </div>

        {/* Enhancement CTA for non-Binance users */}
        {portfolio.source !== 'binance' && portfolio.hasData && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Want real-time data?
              </span>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to="/settings?tab=exchange">
                  <Zap className="h-3 w-3 mr-1" />
                  Connect Binance for live sync
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
