import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp, Target, BarChart3, AlertTriangle, Trophy, FileText, Calendar, Brain, Grid3X3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useTradingSessions } from "@/hooks/use-trading-sessions";
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

  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const { data: sessions = [], isLoading: sessionsLoading } = useTradingSessions();

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

  const formatCurrency = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">Deep dive into your trading performance metrics</p>
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
              <TabsTrigger value="strategies" className="gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Strategies</span>
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Heatmap</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Sessions</span>
              </TabsTrigger>
              <TabsTrigger value="ai-insights" className="gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">AI Insights</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                    <Progress value={stats.winRate} className="h-2 mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Gross profit / Gross loss</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expectancy</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.expectancy)}</div>
                    <p className="text-xs text-muted-foreground">Per trade average</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
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
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{stats.sharpeRatio.toFixed(2)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg R:R</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{stats.avgRR.toFixed(2)}:1</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Trades</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{stats.totalTrades}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total P&L</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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

            <TabsContent value="strategies" className="space-y-8">
              {strategies.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No strategies defined"
                  description="Create trading strategies and assign them to your trades to see performance breakdowns here."
                />
              ) : (
                <>
                  {/* Strategy Performance Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Strategy Performance
                      </CardTitle>
                      <CardDescription>Performance breakdown by trading strategy</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {strategyPerformance.filter(sp => sp.totalTrades > 0).map((sp) => (
                          <div key={sp.strategy.id} className="p-4 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="font-semibold">
                                  {sp.strategy.name}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {sp.totalTrades} trades
                                </span>
                              </div>
                              <div className={`font-bold ${sp.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                        ))}

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

            {/* Heatmap Tab */}
            <TabsContent value="heatmap" className="space-y-6">
              <TradingHeatmap />
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Trading Sessions
                  </CardTitle>
                  <CardDescription>Your trading session history</CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
                  ) : sessions.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="No sessions recorded"
                      description="Start a trading session from the Dashboard to track your trading activity."
                    />
                  ) : (
                    <div className="space-y-3">
                      {sessions.slice(0, 10).map((session) => (
                        <Link
                          key={session.id}
                          to={`/sessions/${session.id}`}
                          className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {format(new Date(session.session_date), 'EEEE, MMM d, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {session.trades_count} trades • {session.mood}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${session.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {session.pnl >= 0 ? '+' : ''}${session.pnl.toFixed(2)}
                              </div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={star <= session.rating ? 'text-yellow-500' : 'text-muted'}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="ai-insights" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <AIPatternInsights />
                <CryptoRanking />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}