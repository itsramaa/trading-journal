/**
 * Performance Analytics - Overview and Strategies
 */
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  AlertTriangle, 
  Trophy, 
  FileText, 
  Download,
  FileSpreadsheet,
  Calendar,
  ChevronDown,
  Check,
  Activity,
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
} from "recharts";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { useBinanceWeeklyPnl } from "@/hooks/use-binance-weekly-pnl";
import { useStrategyPerformance, getQualityScoreLabel } from "@/hooks/use-strategy-performance";
import { usePerformanceExport } from "@/hooks/use-performance-export";
import { useMonthlyPnl } from "@/hooks/use-monthly-pnl";
import { useContextualAnalytics } from "@/hooks/use-contextual-analytics";
import { DrawdownChart } from "@/components/analytics/DrawdownChart";
import { EquityCurveWithEvents } from "@/components/analytics/EquityCurveWithEvents";
import { EventDayComparison } from "@/components/analytics/EventDayComparison";
import { FearGreedZoneChart } from "@/components/analytics/FearGreedZoneChart";
import { VolatilityLevelChart } from "@/components/analytics/VolatilityLevelChart";
import { CombinedContextualScore } from "@/components/analytics/CombinedContextualScore";
import { TradingHeatmapChart } from "@/components/analytics/TradingHeatmapChart";
import { SevenDayStatsCard } from "@/components/analytics/SevenDayStatsCard";
import { SessionPerformanceChart } from "@/components/analytics/SessionPerformanceChart";
import { 
  filterTradesByDateRange, 
  filterTradesByStrategies,
  calculateTradingStats,
  calculateStrategyPerformance,
  generateEquityCurve,
} from "@/lib/trading-calculations";
import { 
  formatWinRate, 
  formatRatio, 
  formatPercentUnsigned,
} from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { format } from "date-fns";
import type { UnifiedMarketContext } from "@/types/market-context";

export default function Performance() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [eventDaysOnly, setEventDaysOnly] = useState(false);
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);

  // Currency conversion hook
  const { formatCompact } = useCurrencyConversion();

  // Data hooks
  const { data: trades, isLoading: tradesLoading } = useModeFilteredTrades();
  const { data: strategies = [] } = useTradingStrategies();
  const binanceStats = useBinanceDailyPnl();
  const weeklyStats = useBinanceWeeklyPnl();
  const strategyPerformanceMap = useStrategyPerformance();
  const { exportToCSV, exportToPDF } = usePerformanceExport();
  const { data: contextualData } = useContextualAnalytics();
  const monthlyStats = useMonthlyPnl();

  // Filter trades (including event day filter)
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    let filtered = filterTradesByDateRange(trades, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    
    // Filter for event days only
    if (eventDaysOnly) {
      filtered = filtered.filter(trade => {
        const context = trade.market_context as unknown as UnifiedMarketContext;
        return context?.events?.hasHighImpactToday === true;
      });
    }
    
    return filtered;
  }, [trades, dateRange, selectedStrategyIds, eventDaysOnly]);

  // Count event day trades for badge
  const eventDayTradeCount = useMemo(() => {
    if (!trades) return 0;
    return trades.filter(trade => {
      const context = trade.market_context as unknown as UnifiedMarketContext;
      return context?.events?.hasHighImpactToday === true;
    }).length;
  }, [trades]);

  const stats = useMemo(() => calculateTradingStats(filteredTrades), [filteredTrades]);
  
  const strategyPerformance = useMemo(() => 
    calculateStrategyPerformance(filteredTrades, strategies),
    [filteredTrades, strategies]
  );

  const equityData = useMemo(() => generateEquityCurve(filteredTrades), [filteredTrades]);

  // Chart-specific formatter for compact currency display (uses user's currency)
  const chartFormatCurrency = (v: number) => formatCompact(v);

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


  if (tradesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Performance Analytics
            </h1>
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
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Performance Analytics
            </h1>
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                {strategies.length > 0 && (
                  <Popover open={strategyDropdownOpen} onOpenChange={setStrategyDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[180px] justify-between">
                        <span className="truncate">
                          {selectedStrategyIds.length === 0 
                            ? "All Strategies" 
                            : selectedStrategyIds.length === 1 
                              ? strategies.find(s => s.id === selectedStrategyIds[0])?.name || "1 selected"
                              : `${selectedStrategyIds.length} strategies`}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search strategies..." />
                        <CommandList>
                          <CommandEmpty>No strategies found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setSelectedStrategyIds([])}
                              className="gap-2"
                            >
                              <Checkbox checked={selectedStrategyIds.length === 0} />
                              <span>All Strategies</span>
                            </CommandItem>
                            {strategies.map((strategy) => (
                              <CommandItem
                                key={strategy.id}
                                onSelect={() => {
                                  setSelectedStrategyIds(prev =>
                                    prev.includes(strategy.id)
                                      ? prev.filter(id => id !== strategy.id)
                                      : [...prev, strategy.id]
                                  );
                                }}
                                className="gap-2"
                              >
                                <Checkbox checked={selectedStrategyIds.includes(strategy.id)} />
                                <span>{strategy.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              
              {/* Event Day Filter */}
              {eventDayTradeCount > 0 && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="event-days-filter"
                    checked={eventDaysOnly}
                    onCheckedChange={setEventDaysOnly}
                  />
                  <Label 
                    htmlFor="event-days-filter" 
                    className="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <Calendar className="h-4 w-4 text-warning" />
                    Event Days Only
                    <Badge variant="secondary" className="ml-1">
                      {eventDayTradeCount}
                    </Badge>
                  </Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
              <TabsTrigger value="monthly" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Monthly</span>
              </TabsTrigger>
              <TabsTrigger value="context" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Context</span>
              </TabsTrigger>
              <TabsTrigger value="strategies" className="gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Strategies</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="space-y-8">
              {/* 7-Day Stats (moved from Dashboard) */}
              <SevenDayStatsCard />

              {/* Section: Key Metrics */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Key Metrics</h3>
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
                    <div className="text-2xl font-bold">{formatWinRate(stats.winRate)}</div>
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
                    <div className="text-2xl font-bold">{chartFormatCurrency(stats.expectancy)}</div>
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
                    <div className="text-2xl font-bold text-destructive">{formatPercentUnsigned(stats.maxDrawdownPercent)}</div>
                    <p className="text-xs text-muted-foreground">Peak to trough</p>
                  </CardContent>
                </Card>
              </div>
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
                  <CardContent><div className="text-xl font-bold">{formatRatio(stats.avgRR)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Trades</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{stats.totalTrades}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      Total P&L
                      <InfoTooltip content="Total P&L from trade_entries. For Binance users, see Daily P&L page for Net P&L breakdown (Gross - Fees + Funding)." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {stats.totalPnl >= 0 ? '+' : ''}{chartFormatCurrency(stats.totalPnl)}
                    </div>
                    {/* Show Net P&L breakdown for Binance users */}
                    {binanceStats.isConnected && binanceStats.grossPnl !== 0 && (
                      <div className="mt-2 pt-2 border-t space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Gross (Today)</span>
                          <span className={binanceStats.grossPnl >= 0 ? 'text-profit' : 'text-loss'}>
                            {chartFormatCurrency(binanceStats.grossPnl)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Fees</span>
                          <span className="text-muted-foreground">-{chartFormatCurrency(binanceStats.totalCommission)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                          <span>Net P&L</span>
                          <span className={binanceStats.netPnl >= 0 ? 'text-profit' : 'text-loss'}>
                            {binanceStats.netPnl >= 0 ? '+' : ''}{chartFormatCurrency(binanceStats.netPnl)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Section: Equity Performance */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Equity Performance</h3>
                <EquityCurveWithEvents
                equityData={equityData} 
                  formatCurrency={chartFormatCurrency} 
                />
              </div>

              {/* Section: Session Performance */}
              {contextualData?.bySession && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Session Performance</h3>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <SessionPerformanceChart bySession={contextualData.bySession} />
                    <TradingHeatmapChart trades={filteredTrades} />
                  </div>
                </div>
              )}

              {/* Section: Risk Analysis */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Risk Analysis</h3>
                <DrawdownChart />
              </div>
            </TabsContent>

            {/* Tab: Context */}
            <TabsContent value="context" className="space-y-8">
              {/* Market Conditions Overview */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Market Conditions Overview
                </h3>
                <CombinedContextualScore trades={filteredTrades} />
              </div>

              {/* Event Impact Analysis */}
              {contextualData && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Event Impact Analysis
                  </h3>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <EventDayComparison 
                      eventDayMetrics={contextualData.byEventProximity.eventDay}
                      normalDayMetrics={contextualData.byEventProximity.normalDay}
                    />
                    <FearGreedZoneChart byFearGreed={contextualData.byFearGreed} />
                  </div>
                </div>
              )}

              {/* Volatility Analysis */}
              {contextualData && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Volatility Analysis
                  </h3>
                  <VolatilityLevelChart byVolatility={contextualData.byVolatility} />
                </div>
              )}
            </TabsContent>

            {/* Tab: Monthly Comparison */}
            <TabsContent value="monthly" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">This Month P&L</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${monthlyStats.currentMonth.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {chartFormatCurrency(monthlyStats.currentMonth.netPnl)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      vs last month: {monthlyStats.change.pnlPercent >= 0 ? '+' : ''}{monthlyStats.change.pnlPercent.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monthlyStats.currentMonth.trades}</div>
                    <p className="text-xs text-muted-foreground">
                      Last month: {monthlyStats.lastMonth.trades}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Win Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monthlyStats.currentMonth.winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      vs last: {monthlyStats.change.winRateChange >= 0 ? '+' : ''}{monthlyStats.change.winRateChange.toFixed(1)}pp
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Win/Loss</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      <span className="text-profit">{chartFormatCurrency(monthlyStats.currentMonth.avgWin)}</span>
                      {' / '}
                      <span className="text-loss">-{chartFormatCurrency(monthlyStats.currentMonth.avgLoss)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rolling 30-Day Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Rolling 30-Day P&L</CardTitle>
                  <CardDescription>Cumulative performance over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyStats.rolling30Days}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} className="text-xs" />
                        <YAxis tickFormatter={chartFormatCurrency} className="text-xs" />
                        <Tooltip formatter={(v: number) => [chartFormatCurrency(v), 'Cumulative P&L']} />
                        <Area 
                          type="monotone" 
                          dataKey="cumulative" 
                          className="fill-primary/20 stroke-primary" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
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
                                  {sp.totalPnl >= 0 ? '+' : ''}{chartFormatCurrency(sp.totalPnl)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Win Rate</span>
                                  <div className="font-medium">{formatWinRate(sp.winRate)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Avg R:R</span>
                                  <div className="font-medium">{formatRatio(sp.avgRR)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Avg P&L</span>
                                  <div className="font-medium">{chartFormatCurrency(sp.avgPnl)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">W/L</span>
                                  <div className="font-medium">{sp.wins}/{sp.losses}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Contribution</span>
                                  <div className="font-medium">{formatWinRate(sp.contribution)}</div>
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
                              <XAxis type="number" tickFormatter={(v) => chartFormatCurrency(v)} />
                              <YAxis 
                                type="category" 
                                dataKey="strategy.name" 
                                width={100}
                                className="text-xs"
                              />
                              <Tooltip formatter={(v: number) => chartFormatCurrency(v)} />
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

          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
