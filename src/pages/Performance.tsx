/**
 * Performance Analytics - Consolidated performance hub with 5 tabs
 * Overview | Daily P&L | Strategies | Heatmap | AI Insights
 */
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  TrendingUp, 
  TrendingDown,
  Target, 
  BarChart3, 
  AlertTriangle, 
  Trophy, 
  FileText, 
  Brain, 
  Grid3X3,
  DollarSign,
  Wallet,
  ArrowUpDown,
  Percent,
  Flame,
  Calendar,
  Download,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { useBinanceWeeklyPnl } from "@/hooks/use-binance-weekly-pnl";
import { useBinanceWeekComparison } from "@/hooks/use-binance-week-comparison";
import { useStrategyPerformance, getQualityScoreLabel } from "@/hooks/use-strategy-performance";
import { usePerformanceExport } from "@/hooks/use-performance-export";
import { TradingHeatmap } from "@/components/analytics/TradingHeatmap";
import { DrawdownChart } from "@/components/analytics/DrawdownChart";
import { AIPatternInsights } from "@/components/analytics/AIPatternInsights";
import { CryptoRanking } from "@/components/analytics/CryptoRanking";
import { 
  filterTradesByDateRange, 
  filterTradesByStrategies,
  calculateTradingStats,
  calculateStrategyPerformance,
  generateEquityCurve,
} from "@/lib/trading-calculations";
import { format } from "date-fns";

export default function Performance() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);

  // Data hooks
  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const binanceStats = useBinanceDailyPnl();
  const weeklyStats = useBinanceWeeklyPnl();
  const weekComparison = useBinanceWeekComparison();
  const strategyPerformanceMap = useStrategyPerformance();
  const { exportToCSV, exportToPDF } = usePerformanceExport();

  // Filter trades
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    let filtered = filterTradesByDateRange(trades, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    return filtered;
  }, [trades, dateRange, selectedStrategyIds]);

  const stats = useMemo(() => calculateTradingStats(filteredTrades), [filteredTrades]);
  
  const strategyPerformance = useMemo(() => 
    calculateStrategyPerformance(filteredTrades, strategies),
    [filteredTrades, strategies]
  );

  const equityData = useMemo(() => generateEquityCurve(filteredTrades), [filteredTrades]);

  // Symbol breakdown for pie chart
  const symbolBreakdown = useMemo(() => {
    if (!binanceStats.isConnected || !binanceStats.bySymbol) return [];
    return Object.entries(binanceStats.bySymbol)
      .filter(([symbol]) => symbol !== 'N/A')
      .map(([symbol, data]) => ({
        name: symbol,
        value: Math.abs(data.pnl),
        pnl: data.pnl,
        trades: data.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [binanceStats]);

  const formatCurrency = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!trades) return;
    
    const symbolBreakdownExport = binanceStats.isConnected && binanceStats.bySymbol
      ? Object.entries(binanceStats.bySymbol)
          .filter(([symbol]) => symbol !== 'N/A')
          .map(([symbol, data]) => ({
            symbol,
            trades: data.count,
            pnl: data.pnl,
            fees: data.fees,
            funding: data.funding,
            net: data.pnl - data.fees + data.funding + data.rebates,
          }))
      : undefined;
    
    exportToCSV({
      trades: filteredTrades.map(t => ({
        id: t.id,
        pair: t.pair,
        direction: t.direction,
        entry_price: t.entry_price,
        exit_price: t.exit_price,
        quantity: t.quantity,
        pnl: t.pnl,
        trade_date: t.trade_date,
        status: t.status,
        fees: t.fees,
      })),
      stats,
      dateRange,
      symbolBreakdown: symbolBreakdownExport,
      weeklyData: weeklyStats.dailyData,
    });
  };

  const handleExportPDF = () => {
    if (!trades) return;
    
    const symbolBreakdownExport = binanceStats.isConnected && binanceStats.bySymbol
      ? Object.entries(binanceStats.bySymbol)
          .filter(([symbol]) => symbol !== 'N/A')
          .map(([symbol, data]) => ({
            symbol,
            trades: data.count,
            pnl: data.pnl,
            fees: data.fees,
            funding: data.funding,
            net: data.pnl - data.fees + data.funding + data.rebates,
          }))
      : undefined;
    
    exportToPDF({
      trades: filteredTrades.map(t => ({
        id: t.id,
        pair: t.pair,
        direction: t.direction,
        entry_price: t.entry_price,
        exit_price: t.exit_price,
        quantity: t.quantity,
        pnl: t.pnl,
        trade_date: t.trade_date,
        status: t.status,
        fees: t.fees,
      })),
      stats,
      dateRange,
      symbolBreakdown: symbolBreakdownExport,
      weeklyData: weeklyStats.dailyData,
    });
  };

  // Change indicator helper
  const ChangeIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    if (value > 0) return <span className="text-profit flex items-center gap-1"><ArrowUp className="h-3 w-3" />+{value.toFixed(1)}{suffix}</span>;
    if (value < 0) return <span className="text-loss flex items-center gap-1"><ArrowDown className="h-3 w-3" />{value.toFixed(1)}{suffix}</span>;
    return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0{suffix}</span>;
  };

  if (tradesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
            <p className="text-muted-foreground">Deep dive into your trading performance metrics</p>
          </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
            <p className="text-muted-foreground">Deep dive into your trading performance metrics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          {strategies.length > 0 && (
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
          )}
        </div>

        {trades && trades.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No trades recorded"
            description="Start logging your trades in the Trading Journal to see performance analytics here."
          />
        ) : (
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="flex-wrap">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="daily" className="gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Daily P&L</span>
              </TabsTrigger>
              <TabsTrigger value="strategies" className="gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Strategies</span>
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Heatmap</span>
              </TabsTrigger>
              <TabsTrigger value="ai-insights" className="gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">AI Insights</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="space-y-8">
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Win Rate
                      <InfoTooltip content="Percentage of winning trades. 50%+ indicates more wins than losses. Aim for 55-65% with proper R:R." />
                    </CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                    <Progress value={stats.winRate} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Profit Factor
                      <InfoTooltip content="Gross Profit ÷ Gross Loss. Above 1.5 is good, above 2.0 is excellent. Below 1.0 means you're losing money." />
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-profit" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-profit">
                      {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Gross profit / Gross loss</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Expectancy
                      <InfoTooltip content="Average expected profit per trade. Positive expectancy means you're profitable over time." />
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.expectancy)}</div>
                    <p className="text-xs text-muted-foreground">Per trade average</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Max Drawdown
                      <InfoTooltip content="Largest peak-to-trough decline in your equity. Lower is better. Above 20% is concerning." />
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.maxDrawdownPercent.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Peak to trough</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Sharpe Ratio
                      <InfoTooltip content="Risk-adjusted return. Above 1.0 is acceptable, above 2.0 is excellent. Measures return per unit of risk." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent><div className="text-xl font-bold">{stats.sharpeRatio.toFixed(2)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Avg R:R
                      <InfoTooltip content="Average Reward-to-Risk ratio. 2:1 means you make $2 for every $1 risked. Higher is better." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent><div className="text-xl font-bold">{stats.avgRR.toFixed(2)}:1</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Trades</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{stats.totalTrades}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total P&L</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Equity Curve */}
              <Card>
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                  <CardDescription>Cumulative P&L over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {equityData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                          <Tooltip 
                            formatter={(v: number) => [formatCurrency(v), 'Cumulative P&L']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="cumulative" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary)/0.2)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No trades to display
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Drawdown Chart */}
              <DrawdownChart />
            </TabsContent>

            {/* Tab 2: Daily P&L (NEW) */}
            <TabsContent value="daily" className="space-y-8">
              {/* Daily P&L Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Gross P&L (24H)
                      <InfoTooltip content="Total realized profit/loss before fees. Raw trading performance." />
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${binanceStats.grossPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {binanceStats.grossPnl >= 0 ? '+' : ''}{formatCurrency(binanceStats.grossPnl)}
                    </div>
                    <p className="text-xs text-muted-foreground">{binanceStats.totalTrades} trades</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Net P&L (24H)
                      <InfoTooltip content="P&L after all fees deducted. This is your actual take-home profit/loss." />
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${binanceStats.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {binanceStats.netPnl >= 0 ? '+' : ''}{formatCurrency(binanceStats.netPnl)}
                    </div>
                    <p className="text-xs text-muted-foreground">After fees</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Win Rate (24H)
                      <InfoTooltip content="Percentage of winning trades in the last 24 hours." />
                    </CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{binanceStats.winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">{binanceStats.wins}W / {binanceStats.losses}L</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Data Source</CardTitle>
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <Badge variant={binanceStats.isConnected ? "default" : "secondary"}>
                      {binanceStats.isConnected ? "Binance Live" : "Local Data"}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Fee Breakdown */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Trading Fees
                      <InfoTooltip content="Commission paid for executing trades. Higher volume = higher fees." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-loss">-{formatCurrency(binanceStats.totalCommission)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Funding Fees
                      <InfoTooltip content="Periodic funding payments. Positive = received, Negative = paid." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${binanceStats.totalFunding >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {binanceStats.totalFunding >= 0 ? '+' : ''}{formatCurrency(binanceStats.totalFunding)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Rebates
                      <InfoTooltip content="Commission rebates from VIP status or promotions." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-profit">+{formatCurrency(binanceStats.totalRebates)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Transfers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatCurrency(binanceStats.totalTransfers)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Week-over-Week Comparison */}
              {weekComparison.isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Week-over-Week Comparison
                    </CardTitle>
                    <CardDescription>
                      {format(weekComparison.currentWeekRange.start, 'MMM dd')} - {format(weekComparison.currentWeekRange.end, 'MMM dd')} vs {format(weekComparison.previousWeekRange.start, 'MMM dd')} - {format(weekComparison.previousWeekRange.end, 'MMM dd')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 rounded-lg border space-y-2">
                        <div className="text-sm text-muted-foreground">Net P&L</div>
                        <div className="flex items-baseline justify-between">
                          <div className={`text-2xl font-bold ${weekComparison.currentWeek.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {weekComparison.currentWeek.netPnl >= 0 ? '+' : ''}{formatCurrency(weekComparison.currentWeek.netPnl)}
                          </div>
                          <div className="text-sm">
                            <ChangeIndicator value={weekComparison.change.pnlPercent} suffix="%" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last week: {formatCurrency(weekComparison.previousWeek.netPnl)}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border space-y-2">
                        <div className="text-sm text-muted-foreground">Trades</div>
                        <div className="flex items-baseline justify-between">
                          <div className="text-2xl font-bold">{weekComparison.currentWeek.trades}</div>
                          <div className="text-sm">
                            <ChangeIndicator value={weekComparison.change.tradesPercent} suffix="%" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last week: {weekComparison.previousWeek.trades}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border space-y-2">
                        <div className="text-sm text-muted-foreground">Win Rate</div>
                        <div className="flex items-baseline justify-between">
                          <div className="text-2xl font-bold">{weekComparison.currentWeek.winRate.toFixed(1)}%</div>
                          <div className="text-sm">
                            <ChangeIndicator value={weekComparison.change.winRateChange} suffix="%" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last week: {weekComparison.previousWeek.winRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4 mt-4 pt-4 border-t">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Current Week Fees</div>
                        <div className="font-medium text-loss">-{formatCurrency(weekComparison.currentWeek.fees)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Current Week Funding</div>
                        <div className={`font-medium ${weekComparison.currentWeek.funding >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {weekComparison.currentWeek.funding >= 0 ? '+' : ''}{formatCurrency(weekComparison.currentWeek.funding)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Best Trade (This Week)</div>
                        <div className="font-medium text-profit">+{formatCurrency(weekComparison.currentWeek.bestTrade)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Worst Trade (This Week)</div>
                        <div className="font-medium text-loss">{formatCurrency(weekComparison.currentWeek.worstTrade)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {binanceStats.isConnected && weeklyStats.isConnected && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-1">
                        Best Trade (24H)
                        <InfoTooltip content="Your most profitable single trade in the last 24 hours. Analyze what made it successful." />
                      </CardTitle>
                      <Trophy className="h-4 w-4 text-profit" />
                    </CardHeader>
                    <CardContent>
                      {weeklyStats.bestTrade && weeklyStats.bestTrade.pnl > 0 ? (
                        <>
                          <div className="text-2xl font-bold text-profit">
                            +{formatCurrency(weeklyStats.bestTrade.pnl)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {weeklyStats.bestTrade.symbol} • {format(new Date(weeklyStats.bestTrade.time), 'MMM dd HH:mm')}
                          </p>
                        </>
                      ) : (
                        <div className="text-muted-foreground">No winning trades</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-1">
                        Worst Trade (24H)
                        <InfoTooltip content="Your largest losing trade in the last 24 hours. Review to identify mistakes and prevent future losses." />
                      </CardTitle>
                      <AlertTriangle className="h-4 w-4 text-loss" />
                    </CardHeader>
                    <CardContent>
                      {weeklyStats.worstTrade && weeklyStats.worstTrade.pnl < 0 ? (
                        <>
                          <div className="text-2xl font-bold text-loss">
                            {formatCurrency(weeklyStats.worstTrade.pnl)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {weeklyStats.worstTrade.symbol} • {format(new Date(weeklyStats.worstTrade.time), 'MMM dd HH:mm')}
                          </p>
                        </>
                      ) : (
                        <div className="text-muted-foreground">No losing trades</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 7-Day P&L Trend Chart */}
              {binanceStats.isConnected && weeklyStats.dailyData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      7-Day P&L Trend
                    </CardTitle>
                    <CardDescription>Daily gross and net P&L over the past week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyStats.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs"
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              formatCurrency(value),
                              name === 'grossPnl' ? 'Gross P&L' : 'Net P&L'
                            ]}
                            labelFormatter={(label) => format(new Date(label), 'EEEE, MMM dd')}
                          />
                          <Bar dataKey="grossPnl" name="grossPnl" radius={[4, 4, 0, 0]}>
                            {weeklyStats.dailyData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.grossPnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
                      <div>
                        <span className="text-muted-foreground">7-Day Total: </span>
                        <span className={`font-bold ${weeklyStats.totalGross >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {weeklyStats.totalGross >= 0 ? '+' : ''}{formatCurrency(weeklyStats.totalGross)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Net (after fees): </span>
                        <span className={`font-bold ${weeklyStats.totalNet >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {weeklyStats.totalNet >= 0 ? '+' : ''}{formatCurrency(weeklyStats.totalNet)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trades: </span>
                        <span className="font-bold">{weeklyStats.totalTrades}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Symbol Breakdown Table */}
              {binanceStats.isConnected && Object.keys(binanceStats.bySymbol).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Symbol Breakdown (24H)
                    </CardTitle>
                    <CardDescription>P&L and fees by trading pair</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">Symbol</th>
                            <th className="text-right py-2 font-medium">Trades</th>
                            <th className="text-right py-2 font-medium">P&L</th>
                            <th className="text-right py-2 font-medium">Fees</th>
                            <th className="text-right py-2 font-medium">Funding</th>
                            <th className="text-right py-2 font-medium">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(binanceStats.bySymbol)
                            .filter(([symbol]) => symbol !== 'N/A')
                            .sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
                            .slice(0, 10)
                            .map(([symbol, data]) => {
                              const net = data.pnl - data.fees + data.funding + data.rebates;
                              return (
                                <tr key={symbol} className="border-b last:border-0">
                                  <td className="py-2 font-medium">{symbol}</td>
                                  <td className="text-right py-2">{data.count}</td>
                                  <td className={`text-right py-2 ${data.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {data.pnl >= 0 ? '+' : ''}{formatCurrency(data.pnl)}
                                  </td>
                                  <td className="text-right py-2 text-loss">-{formatCurrency(data.fees)}</td>
                                  <td className={`text-right py-2 ${data.funding >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {data.funding >= 0 ? '+' : ''}{formatCurrency(data.funding)}
                                  </td>
                                  <td className={`text-right py-2 font-medium ${net >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {net >= 0 ? '+' : ''}{formatCurrency(net)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!binanceStats.isConnected && (
                <EmptyState
                  icon={Wallet}
                  title="Binance Not Connected"
                  description="Connect your Binance API in Settings to see real-time daily P&L data."
                />
              )}
            </TabsContent>

            {/* Tab 3: Strategies */}
            <TabsContent value="strategies" className="space-y-8">
              {strategies.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No strategies defined"
                  description="Create trading strategies and assign them to your trades to see performance breakdowns here."
                />
              ) : (
                <>
                  {/* Strategy Performance Table with AI Quality Score */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Strategy Performance
                      </CardTitle>
                      <CardDescription>Performance breakdown by trading strategy with AI Quality Score</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {strategyPerformance.filter(sp => sp.totalTrades > 0).map((sp) => {
                          const aiPerf = strategyPerformanceMap.get(sp.strategy.id);
                          const qualityLabel = aiPerf ? getQualityScoreLabel(aiPerf.aiQualityScore) : null;
                          
                          return (
                            <div key={sp.strategy.id} className="p-4 rounded-lg border space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className="font-semibold">
                                    {sp.strategy.name}
                                  </Badge>
                                  {qualityLabel && (
                                    <Badge className={qualityLabel.colorClass}>
                                      AI: {aiPerf?.aiQualityScore ?? 0} - {qualityLabel.label}
                                    </Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">
                                    {sp.totalTrades} trades
                                  </span>
                                </div>
                                <div className={`font-bold ${sp.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                  {sp.totalPnl >= 0 ? '+' : ''}{formatCurrency(sp.totalPnl)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Win Rate</span>
                                  <div className="font-medium">{sp.winRate.toFixed(1)}%</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Avg R:R</span>
                                  <div className="font-medium">{sp.avgRR.toFixed(2)}:1</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Avg P&L</span>
                                  <div className="font-medium">{formatCurrency(sp.avgPnl)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">W/L</span>
                                  <div className="font-medium">{sp.wins}/{sp.losses}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Contribution</span>
                                  <div className="font-medium">{sp.contribution.toFixed(1)}%</div>
                                </div>
                              </div>
                              
                              <Progress value={sp.winRate} className="h-2" />
                            </div>
                          );
                        })}

                        {strategyPerformance.filter(sp => sp.totalTrades > 0).length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            No strategy data available. Assign strategies to your trades to see performance here.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Strategy Comparison Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Strategy Comparison</CardTitle>
                      <CardDescription>P&L contribution by strategy</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        {strategyPerformance.filter(sp => sp.totalTrades > 0).length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={strategyPerformance.filter(sp => sp.totalTrades > 0)}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                              <YAxis 
                                type="category" 
                                dataKey="strategy.name" 
                                width={100}
                                className="text-xs"
                              />
                              <Tooltip formatter={(v: number) => formatCurrency(v)} />
                              <Bar dataKey="totalPnl" radius={4}>
                                {strategyPerformance.filter(sp => sp.totalTrades > 0).map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.totalPnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} 
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            No strategy data to display
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab 4: Heatmap */}
            <TabsContent value="heatmap" className="space-y-6">
              <TradingHeatmap />
            </TabsContent>

            {/* Tab 5: AI Insights */}
            <TabsContent value="ai-insights" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <AIPatternInsights />
                <CryptoRanking />
              </div>

              {/* Trade Distribution Pie Chart */}
              {symbolBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Trade Distribution by Pair (24H)
                    </CardTitle>
                    <CardDescription>Volume distribution across trading pairs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={symbolBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="hsl(var(--primary))"
                            dataKey="value"
                          >
                            {symbolBreakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`hsl(var(--chart-${(index % 5) + 1}))`} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string, props: any) => [
                              `${props.payload.trades} trades, ${formatCurrency(props.payload.pnl)}`,
                              name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
