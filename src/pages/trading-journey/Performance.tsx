import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { StrategyFilter } from "@/components/trading/StrategySelector";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, AlertTriangle, Trophy, Percent } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { 
  demoTrades, 
  demoStrategies, 
  filterTradesByDateRange, 
  calculateTradingStats,
  calculateStrategyPerformance,
  StrategyPerformance
} from "@/lib/trading-data";

export default function Performance() {
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
  
  const strategyPerformance = useMemo(() => 
    calculateStrategyPerformance(filteredTrades, demoStrategies),
    [filteredTrades]
  );

  // Generate equity curve data from filtered trades
  const equityData = useMemo(() => {
    let cumulative = 0;
    return filteredTrades
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(trade => {
        cumulative += trade.pnl;
        return {
          date: trade.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pnl: trade.pnl,
          cumulative,
        };
      });
  }, [filteredTrades]);

  // Strategy comparison radar data
  const radarData = useMemo(() => {
    return strategyPerformance
      .filter(sp => sp.totalTrades > 0)
      .map(sp => ({
        strategy: sp.strategy.name,
        winRate: sp.winRate,
        avgRR: sp.avgRR * 20, // Scale for visibility
        trades: sp.totalTrades * 10,
        pnl: Math.max(0, (sp.totalPnl / 100) + 50), // Normalize
      }));
  }, [strategyPerformance]);

  const formatCurrency = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

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
          <StrategyFilter 
            selectedIds={selectedStrategyIds} 
            onChange={setSelectedStrategyIds}
            strategies={demoStrategies}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="strategies">Strategy Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
                  <div className="text-2xl font-bold text-green-500">{stats.profitFactor.toFixed(2)}</div>
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
                  <div className="text-2xl font-bold text-destructive">{stats.maxDrawdown.toFixed(1)}%</div>
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
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6">
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
                      No strategy data available for the selected filters
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
