import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  Percent,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { TradeStats } from "@/hooks/trading/use-trade-stats";

interface AccountDetailMetricsProps {
  stats: TradeStats | undefined;
  statsLoading: boolean;
  isBinanceVirtual: boolean;
  displayBalance: number;
  initialBalance: number;
  /** Unrealized P&L from exchange (Live only) */
  unrealizedPnl?: number;
  /** Number of active exchange positions (Live only) */
  activePositionsCount?: number;
}

export function AccountDetailMetrics({
  stats,
  statsLoading,
  isBinanceVirtual,
  displayBalance,
  initialBalance,
  unrealizedPnl = 0,
  activePositionsCount = 0,
}: AccountDetailMetricsProps) {
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();

  const netPnl = stats?.totalPnlNet || 0;
  const roc = initialBalance > 0 ? (netPnl / initialBalance) * 100 : 0;
  const winRate = stats?.winRate || 0;
  const profitFactor = stats?.profitFactor || 0;
  const totalTrades = stats?.totalTrades || 0;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* 1. Net P&L */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net P&L</p>
              {statsLoading ? <Skeleton className="h-7 w-24" /> : (
                <p className={`text-xl font-bold ${netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPnl(netPnl)}
                </p>
              )}
            </div>
            {netPnl >= 0 ? (
              <TrendingUp className="h-8 w-8 text-profit/50" />
            ) : (
              <TrendingDown className="h-8 w-8 text-loss/50" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              Gross: {formatPnl(stats?.totalPnlGross || 0)}
            </p>
            {isBinanceVirtual && unrealizedPnl !== 0 && (
              <Badge variant="outline" className={`text-xs ${unrealizedPnl >= 0 ? 'text-profit border-profit/30' : 'text-loss border-loss/30'}`}>
                {formatPnl(unrealizedPnl)} unrealized
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Return on Capital */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Return on Capital</p>
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (
                <p className={`text-xl font-bold ${roc >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {roc >= 0 ? '+' : ''}{roc.toFixed(2)}%
                </p>
              )}
            </div>
            <Percent className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <InfoTooltip content="Net P&L ÷ Initial Capital × 100" variant="help" />
            {' '}vs initial capital
          </p>
        </CardContent>
      </Card>

      {/* 3. Win Rate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (
                <p className="text-xl font-bold">{winRate.toFixed(1)}%</p>
              )}
            </div>
            <Target className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.winCount || 0}W / {stats?.lossCount || 0}L
          </p>
        </CardContent>
      </Card>

      {/* 4. Profit Factor */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (
                <p className={`text-xl font-bold ${profitFactor >= 1 ? 'text-profit' : 'text-loss'}`}>
                  {profitFactor >= 999 ? '∞' : profitFactor.toFixed(2)}
                </p>
              )}
            </div>
            <Activity className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg Win: {formatCurrency(Math.abs(stats?.avgWin || 0))}
          </p>
        </CardContent>
      </Card>

      {/* 5. Total Trades */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              {statsLoading ? <Skeleton className="h-7 w-12" /> : (
                <p className="text-xl font-bold">{totalTrades}</p>
              )}
            </div>
            <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              Avg P&L: {formatPnl(stats?.avgPnlPerTrade || 0)}
            </p>
            {isBinanceVirtual && activePositionsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {activePositionsCount} open
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
