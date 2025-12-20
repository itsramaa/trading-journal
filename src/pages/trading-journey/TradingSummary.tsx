import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, DollarSign, Percent, AlertTriangle, FileText } from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { 
  filterTradesByDateRange, 
  filterTradesByStrategies,
  calculateTradingStats,
} from "@/lib/trading-calculations";
import { formatCurrency } from "@/lib/formatters";

export default function TradingSummary() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);

  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const { data: userSettings } = useUserSettings();
  const { data: exchangeRate = 15500 } = useExchangeRate();

  const defaultCurrency = userSettings?.default_currency || 'USD';

  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    let filtered = filterTradesByDateRange(trades, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    return filtered;
  }, [trades, dateRange, selectedStrategyIds]);

  const stats = useMemo(() => calculateTradingStats(filteredTrades), [filteredTrades]);

  // Convert USD to user's currency
  const convertCurrency = (value: number) => {
    if (defaultCurrency === 'IDR') {
      return value * exchangeRate;
    }
    return value;
  };

  const formatWithCurrency = (v: number) => {
    const converted = convertCurrency(v);
    return formatCurrency(converted, defaultCurrency);
  };

  if (tradesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Summary</h1>
            <p className="text-muted-foreground">Comprehensive trading performance overview</p>
          </div>
          <MetricsGridSkeleton />
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Summary</h1>
            <p className="text-muted-foreground">Comprehensive trading performance overview</p>
          </div>
        </div>

        {/* Date Filter Only */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {trades && trades.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No trades recorded"
            description="Start logging your trades in the Trading Journal to see performance metrics here."
          />
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTrades}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.wins} wins / {stats.losses} losses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                  {stats.totalPnl >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {stats.totalPnl >= 0 ? "+" : ""}{formatWithCurrency(stats.totalPnl)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatWithCurrency(stats.avgPnl)}/trade
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Profit Factor: {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg R:R</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgRR.toFixed(2)}:1</div>
                  <p className="text-xs text-muted-foreground">
                    Expectancy: {formatWithCurrency(stats.expectancy)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Strategies Filter - Below Summary */}
            {strategies.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Filter by Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {strategies.map((strategy) => (
                      <Badge
                        key={strategy.id}
                        variant={selectedStrategyIds.includes(strategy.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedStrategyIds(prev =>
                            prev.includes(strategy.id)
                              ? prev.filter(id => id !== strategy.id)
                              : [...prev, strategy.id]
                          );
                        }}
                      >
                        {strategy.name}
                      </Badge>
                    ))}
                    {selectedStrategyIds.length > 0 && (
                      <button 
                        className="text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedStrategyIds([])}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {stats.maxDrawdownPercent.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatWithCurrency(stats.maxDrawdown)} peak to trough
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.sharpeRatio.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Annualized</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Largest Win</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    +{formatWithCurrency(stats.largestWin)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg win: {formatWithCurrency(stats.avgWin)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Largest Loss</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    -{formatWithCurrency(stats.largestLoss)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg loss: {formatWithCurrency(stats.avgLoss)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Streak Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Best Win Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{stats.consecutiveWins} trades</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Worst Loss Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.consecutiveLosses} trades</div>
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
                  {filteredTrades.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No trades found for the selected filters
                    </p>
                  ) : (
                    filteredTrades.slice(0, 10).map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <Badge variant={trade.direction === "LONG" ? "default" : "secondary"}>
                            {trade.direction}
                          </Badge>
                          <span className="font-medium">{trade.pair}</span>
                          <span className="text-sm text-muted-foreground">
                            {trade.entry_price} → {trade.exit_price || '-'}
                          </span>
                          <div className="hidden md:flex gap-1">
                            {trade.strategies?.slice(0, 2).map(s => (
                              <Badge key={s.id} variant="outline" className="text-xs">
                                {s.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={trade.result === 'win' ? 'default' : trade.result === 'loss' ? 'destructive' : 'secondary'}>
                            {trade.result || 'pending'}
                          </Badge>
                          <span className={`font-bold ${(trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {(trade.pnl || 0) >= 0 ? "+" : ""}{formatWithCurrency(trade.pnl || 0)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
