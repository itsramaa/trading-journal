/**
 * Trading Dashboard Content for unified dashboard
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, FileText } from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { calculateTradingStats } from "@/lib/trading-calculations";

export default function TradingDashboardContent() {
  const { t } = useTranslation();
  const { data: trades = [], isLoading } = useTradeEntries();

  const stats = useMemo(() => calculateTradingStats(trades), [trades]);

  const formatCurrency = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="h-8 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No trades recorded"
        description="Start logging your trades in the Trading Journal to see performance metrics here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trading.totalTrades')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
            <p className="text-xs text-muted-foreground">
              {stats.wins} {t('trading.wins')} / {stats.losses} {t('trading.losses')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trading.totalPnl')}</CardTitle>
            {stats.totalPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}{formatCurrency(stats.totalPnl)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(stats.avgPnl)}/trade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trading.winRate')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {t('trading.profitFactor')}: {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trading.avgRR')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRR.toFixed(2)}:1</div>
            <p className="text-xs text-muted-foreground">
              Expectancy: {formatCurrency(stats.expectancy)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trades.slice(0, 5).map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-4">
                  <Badge variant={trade.direction === "LONG" ? "default" : "secondary"}>
                    {trade.direction}
                  </Badge>
                  <span className="font-medium">{trade.pair}</span>
                  <span className="text-sm text-muted-foreground">
                    {trade.entry_price} → {trade.exit_price || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={trade.result === 'win' ? 'default' : trade.result === 'loss' ? 'destructive' : 'secondary'}>
                    {trade.result || 'pending'}
                  </Badge>
                  <span className={`font-bold ${(trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {(trade.pnl || 0) >= 0 ? "+" : ""}{formatCurrency(trade.pnl || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
