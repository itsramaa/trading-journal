/**
 * Portfolio Overview Card - Clear, scannable metrics at a glance
 */
import { Card, CardContent } from "@/components/ui/card";
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
import { usePositions } from "@/hooks/use-positions";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { formatPercent, formatWinRate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface PortfolioOverviewCardProps {
  className?: string;
}

export function PortfolioOverviewCard({ className }: PortfolioOverviewCardProps) {
  const portfolio = useUnifiedPortfolioData();
  const { positions: activePositions } = usePositions();
  const { format, formatPnl } = useCurrencyConversion();

  const unrealizedPnl = activePositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const hasUnrealized = activePositions.length > 0;

  if (portfolio.isLoading) {
    return (
      <Card className={cn(className)}>
        <CardContent className="pt-5">
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio.hasData) {
    return (
      <Card className={cn(className)}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Wallet className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-base mb-1">No portfolio data yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              Create a paper trading account or connect your exchange to start tracking your performance.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link to="/accounts">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Account
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings?tab=exchange">
                  <Zap className="h-4 w-4 mr-1.5" />
                  Connect Exchange
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayReturnPercent = portfolio.totalCapital > 0 
    ? (portfolio.todayNetPnl / portfolio.totalCapital) * 100 
    : 0;
  
  const weeklyReturnPercent = portfolio.totalCapital > 0 
    ? (portfolio.weeklyNetPnl / portfolio.totalCapital) * 100 
    : 0;

  const metrics = [
    {
      label: "Total Capital",
      sublabel: "Across all accounts",
      value: portfolio.totalCapital > 0 ? (
        <AnimatedNumber value={portfolio.totalCapital} format={(v) => format(v)} />
      ) : <span className="text-muted-foreground">—</span>,
      icon: Wallet,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      label: "Today's Realized P&L",
      sublabel: `${portfolio.todayTrades} trade${portfolio.todayTrades !== 1 ? 's' : ''} today${hasUnrealized ? ` · Unrealized: ${formatPnl(unrealizedPnl)}` : ''}`,
      value: (
        <div className="flex items-center gap-2">
          <AnimatedNumber
            value={portfolio.todayNetPnl}
            format={(v) => formatPnl(v)}
            colorize
          />
          {portfolio.todayNetPnl !== 0 && portfolio.totalCapital > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold h-5 px-1.5",
                portfolio.todayNetPnl >= 0
                  ? "border-profit/30 text-profit bg-profit/10"
                  : "border-loss/30 text-loss bg-loss/10"
              )}
            >
              {portfolio.todayNetPnl > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5 inline" /> : <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />}
              {formatPercent(todayReturnPercent)}
            </Badge>
          )}
        </div>
      ),
      icon: portfolio.todayNetPnl >= 0 ? TrendingUp : TrendingDown,
      iconColor: portfolio.todayNetPnl >= 0 ? "text-profit" : "text-loss",
      iconBg: portfolio.todayNetPnl >= 0 ? "bg-profit/10" : "bg-loss/10",
    },
    {
      label: "Weekly Net P&L",
      sublabel: "Last 7 days",
      value: (
        <div className="flex items-center gap-2">
          <AnimatedNumber
            value={portfolio.weeklyNetPnl}
            format={(v) => formatPnl(v)}
            colorize
          />
          {portfolio.weeklyNetPnl !== 0 && portfolio.totalCapital > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold h-5 px-1.5",
                portfolio.weeklyNetPnl >= 0
                  ? "border-profit/30 text-profit bg-profit/10"
                  : "border-loss/30 text-loss bg-loss/10"
              )}
            >
              {formatPercent(weeklyReturnPercent)}
            </Badge>
          )}
        </div>
      ),
      icon: portfolio.weeklyNetPnl >= 0 ? TrendingUp : TrendingDown,
      iconColor: portfolio.weeklyNetPnl >= 0 ? "text-profit" : "text-loss",
      iconBg: portfolio.weeklyNetPnl >= 0 ? "bg-profit/10" : "bg-loss/10",
    },
    {
      label: "Today's Win Rate",
      sublabel: portfolio.todayTrades > 0 ? `${portfolio.todayWins}W · ${portfolio.todayLosses}L` : "No trades yet",
      value: <span>{formatWinRate(portfolio.todayWinRate)}</span>,
      icon: Target,
      iconColor: portfolio.todayWinRate >= 50 ? "text-profit" : portfolio.todayTrades > 0 ? "text-loss" : "text-muted-foreground",
      iconBg: portfolio.todayWinRate >= 50 ? "bg-profit/10" : portfolio.todayTrades > 0 ? "bg-loss/10" : "bg-muted/50",
    },
  ];

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Portfolio Overview</span>
        </div>
        <div className="flex items-center gap-2">
          {portfolio.source === 'binance' ? (
            <Badge variant="outline" className="text-xs gap-1 border-profit/30 text-profit">
              <Wifi className="h-3 w-3" />
              Binance Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">{portfolio.sourceName}</Badge>
          )}
        </div>
      </div>

      <CardContent className="p-0">
        <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/50">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div key={i} className="px-5 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", metric.iconBg)}>
                    <Icon className={cn("h-3.5 w-3.5", metric.iconColor)} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold tracking-tight font-mono-numbers">
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground">{metric.sublabel}</p>
              </div>
            );
          })}
        </div>

        {/* Connect CTA */}
        {portfolio.source !== 'binance' && portfolio.hasData && (
          <div className="px-5 py-2.5 bg-muted/30 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Want real-time live data?</span>
            <Button variant="ghost" size="sm" asChild className="h-6 text-xs px-2">
              <Link to="/settings?tab=exchange">
                <Zap className="h-3 w-3 mr-1" />
                Connect Binance
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
