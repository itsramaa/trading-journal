/**
 * Portfolio Overview Card - Shows total capital, today's Net P&L, and win rate
 * Positioned as FIRST widget on Dashboard
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Wifi,
  Target,
} from "lucide-react";
import { useBinanceDailyPnl, useBinanceTotalBalance } from "@/hooks/use-binance-daily-pnl";
import { useBinanceWeeklyPnl } from "@/hooks/use-binance-weekly-pnl";
import { formatCurrency, formatPercent, formatWinRate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface PortfolioOverviewCardProps {
  className?: string;
}

export function PortfolioOverviewCard({ className }: PortfolioOverviewCardProps) {
  const { 
    netPnl: todayNetPnl, 
    winRate: todayWinRate, 
    totalTrades: todayTrades,
    isConnected,
    isLoading: dailyLoading,
  } = useBinanceDailyPnl();
  
  const { 
    totalBalance, 
    isLoading: balanceLoading,
  } = useBinanceTotalBalance();
  
  const { 
    totalNet: weeklyNetPnl,
    isLoading: weeklyLoading,
  } = useBinanceWeeklyPnl();

  const isLoading = dailyLoading || balanceLoading || weeklyLoading;

  // Return percentage change for today
  const todayReturnPercent = totalBalance > 0 
    ? (todayNetPnl / totalBalance) * 100 
    : 0;
  
  // Weekly return percentage
  const weeklyReturnPercent = totalBalance > 0 
    ? (weeklyNetPnl / totalBalance) * 100 
    : 0;

  // Not connected state
  if (!isConnected) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect your Binance account in Settings to see portfolio overview.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Portfolio Overview
            </CardTitle>
            <Badge variant="outline" className="text-xs gap-1">
              <Wifi className="h-3 w-3" />
              Binance
            </Badge>
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

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Portfolio Overview
          </CardTitle>
          <Badge variant="outline" className="text-xs gap-1 border-profit/30 text-profit">
            <Wifi className="h-3 w-3" />
            Binance Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-4">
          {/* Total Capital */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Capital</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalBalance, 'USD')}
            </p>
          </div>

          {/* Today's Net P&L */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Today's Net P&L</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold",
                todayNetPnl >= 0 ? 'text-profit' : 'text-loss'
              )}>
                {todayNetPnl >= 0 ? '+' : ''}{formatCurrency(todayNetPnl, 'USD')}
              </p>
              {todayNetPnl !== 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    todayNetPnl >= 0 
                      ? "border-profit/30 text-profit bg-profit/10" 
                      : "border-loss/30 text-loss bg-loss/10"
                  )}
                >
                  {todayNetPnl > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(todayReturnPercent)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayTrades} trade{todayTrades !== 1 ? 's' : ''} today
            </p>
          </div>

          {/* Weekly P&L */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Weekly Net P&L</p>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold",
                weeklyNetPnl >= 0 ? 'text-profit' : 'text-loss'
              )}>
                {weeklyNetPnl >= 0 ? '+' : ''}{formatCurrency(weeklyNetPnl, 'USD')}
              </p>
              {weeklyNetPnl !== 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    weeklyNetPnl >= 0 
                      ? "border-profit/30 text-profit bg-profit/10" 
                      : "border-loss/30 text-loss bg-loss/10"
                  )}
                >
                  {formatPercent(weeklyReturnPercent)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 7 days
            </p>
          </div>

          {/* Win Rate */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Today's Win Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                {formatWinRate(todayWinRate)}
              </p>
              <Target className={cn(
                "h-5 w-5",
                todayWinRate >= 50 ? "text-profit" : todayWinRate > 0 ? "text-loss" : "text-muted-foreground"
              )} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayTrades > 0 ? `${Math.round(todayWinRate * todayTrades / 100)} wins` : 'No trades yet'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
