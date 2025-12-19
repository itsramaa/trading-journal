import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { StrategyFilter } from "@/components/trading/StrategySelector";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, DollarSign, Percent, AlertTriangle } from "lucide-react";
import { 
  demoTrades, 
  demoStrategies, 
  filterTradesByDateRange, 
  calculateTradingStats,
  getTradeStrategies
} from "@/lib/trading-data";

export default function TradingSummary() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);

  const filteredTrades = useMemo(() => {
    let trades = filterTradesByDateRange(demoTrades, dateRange.from, dateRange.to);
    
    if (selectedStrategyIds.length > 0) {
      trades = trades.filter(trade => 
        trade.strategyIds.some(id => selectedStrategyIds.includes(id))
      );
    }
    
    return trades;
  }, [dateRange, selectedStrategyIds]);

  const stats = useMemo(() => calculateTradingStats(filteredTrades), [filteredTrades]);

  const formatCurrency = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Summary</h1>
            <p className="text-muted-foreground">Comprehensive trading performance overview</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <StrategyFilter 
            selectedIds={selectedStrategyIds} 
            onChange={setSelectedStrategyIds}
            strategies={demoStrategies}
          />
        </div>

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
                {stats.totalPnl >= 0 ? "+" : ""}{formatCurrency(stats.totalPnl)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(stats.avgPnl)}/trade
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
                Profit Factor: {stats.profitFactor.toFixed(2)}
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
                Expectancy: {formatCurrency(stats.expectancy)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.maxDrawdown.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sharpeRatio.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.profitFactor.toFixed(2)}</div>
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
                filteredTrades.slice(0, 10).map((trade) => {
                  const strategies = getTradeStrategies(trade);
                  return (
                    <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <Badge variant={trade.direction === "LONG" ? "default" : "secondary"}>
                          {trade.direction}
                        </Badge>
                        <span className="font-medium">{trade.pair}</span>
                        <span className="text-sm text-muted-foreground">
                          {trade.entry} → {trade.exit}
                        </span>
                        <div className="hidden md:flex gap-1">
                          {strategies.slice(0, 2).map(s => (
                            <Badge key={s.id} variant="outline" className="text-xs">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">R:R {trade.rr.toFixed(2)}</span>
                        <span className={`font-bold ${trade.result === "win" ? "text-green-500" : "text-red-500"}`}>
                          {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
