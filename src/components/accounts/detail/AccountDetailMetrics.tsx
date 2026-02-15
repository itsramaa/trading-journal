import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  Percent,
  Wallet,
  Info,
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
  const hasTrades = totalTrades > 0;

  // Derive status subtitle outside JSX for readability
  const getStatusSubtitle = (): string => {
    if (isBinanceVirtual && activePositionsCount > 0) {
      return `${activePositionsCount} open position${activePositionsCount > 1 ? 's' : ''} active. Metrics update after first close.`;
    }
    if (isBinanceVirtual) {
      return 'Open a position to start tracking performance.';
    }
    return 'Start trading or import history.';
  };

  // When no closed trades, show condensed 2-card layout
  if (!hasTrades && !statsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {/* Balance Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold font-mono-numbers">
                  {formatCurrency(displayBalance)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Initial Capital: {formatCurrency(initialBalance)}
            </p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">No closed trades yet</p>
              </div>
              <Info className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getStatusSubtitle()}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* 1. Net P&L */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Net P&L
                <InfoTooltip content="Total profit/loss after all fees (commission + funding). Gross P&L shown below." />
              </p>
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
          <p className="text-xs text-muted-foreground mt-1">
            Gross: {formatPnl(stats?.totalPnlGross || 0)}
          </p>
        </CardContent>
      </Card>

      {/* 2. Return on Capital */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Return on Capital
                <InfoTooltip content="Net P&L ÷ Initial Capital × 100. Measures how efficiently your capital is generating returns." variant="help" />
              </p>
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (
                <p className={`text-xl font-bold ${roc >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {roc >= 0 ? '+' : ''}{roc.toFixed(2)}%
                </p>
              )}
            </div>
            <Percent className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            vs initial capital
          </p>
        </CardContent>
      </Card>

      {/* 3. Win Rate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Win Rate
                <InfoTooltip content="Percentage of profitable trades. Combined with Risk:Reward ratio, this determines overall profitability." />
              </p>
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
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Profit Factor
                <InfoTooltip content="Gross Profits ÷ Gross Losses. Above 1.0 = profitable. 1.5+ is good, 2.0+ is excellent." />
              </p>
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (
                <p className={`text-xl font-bold ${profitFactor >= 1 ? 'text-profit' : 'text-loss'}`}>
                  {profitFactor >= 999 ? '∞' : profitFactor.toFixed(2)}
                </p>
              )}
            </div>
            <Activity className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            W: {formatCurrency(Math.abs(stats?.avgWin || 0))} · L: {formatCurrency(Math.abs(stats?.avgLoss || 0))}
          </p>
        </CardContent>
      </Card>

      {/* 5. Total Trades */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Total Trades
                <InfoTooltip content="Count of closed trades only. Open trades are not included in this metric." />
              </p>
              {statsLoading ? <Skeleton className="h-7 w-12" /> : (
                <p className="text-xl font-bold">{totalTrades}</p>
              )}
            </div>
            <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Avg P&L: {formatPnl(stats?.avgPnlPerTrade || 0)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
