import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from "recharts";
import { 
  TrendingUp, TrendingDown, Shield, Target, Activity,
  Scale, Trophy, Calculator
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAnalyticsData } from "@/hooks/use-analytics";
import { usePortfolioHistory, useDefaultPortfolio } from "@/hooks/use-portfolio";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";

const Analytics = () => {
  const { analytics, isLoading, hasData } = useAnalyticsData();
  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: history = [] } = usePortfolioHistory(defaultPortfolio?.id, 'ALL');

  // Calculate cumulative returns for chart
  const cumulativeReturns = useMemo(() => {
    let cumulative = 0;
    return analytics.monthlyReturns.map(m => {
      cumulative += m.return;
      return { ...m, cumulative: parseFloat(cumulative.toFixed(1)) };
    });
  }, [analytics.monthlyReturns]);

  // Drawdown calculation from history
  const drawdownData = useMemo(() => {
    if (history.length === 0) return [];
    
    let peak = 0;
    return history.map(h => {
      const value = Number(h.total_value);
      if (value > peak) peak = value;
      const drawdown = peak > 0 ? ((value - peak) / peak) * 100 : 0;
      const date = new Date(h.recorded_at);
      return { 
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        value: parseFloat(drawdown.toFixed(1)) 
      };
    });
  }, [history]);

  // Risk rating based on metrics
  const getRiskRating = (sharpe: number) => {
    if (sharpe >= 2) return { label: 'Excellent', color: 'text-profit' };
    if (sharpe >= 1.5) return { label: 'Good', color: 'text-chart-2' };
    if (sharpe >= 1) return { label: 'Average', color: 'text-chart-4' };
    return { label: 'Below Average', color: 'text-loss' };
  };

  const riskRating = getRiskRating(analytics.sharpeRatio);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Advanced performance metrics and risk analysis.</p>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Advanced performance metrics and risk analysis.</p>
          </div>
          <EmptyState
            icon={TrendingUp}
            title="No portfolio data yet"
            description="Add holdings to your portfolio to see analytics and performance metrics."
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Advanced performance metrics and risk analysis.
          </p>
        </div>

        {/* Key Metrics - 8 Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          {/* Total Return */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Return</p>
              </div>
              <p className={cn(
                "text-xl font-bold font-mono-numbers",
                analytics.totalProfitLossPercent >= 0 ? "text-profit" : "text-loss"
              )}>
                {analytics.totalProfitLossPercent >= 0 ? '+' : ''}{analytics.totalProfitLossPercent.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* CAGR */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">CAGR</p>
              </div>
              <p className={cn(
                "text-xl font-bold font-mono-numbers",
                analytics.cagr >= 0 ? "text-profit" : "text-loss"
              )}>
                {analytics.cagr >= 0 ? '+' : ''}{analytics.cagr.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Sharpe Ratio */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sharpe</p>
              </div>
              <p className="text-xl font-bold font-mono-numbers">{analytics.sharpeRatio.toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Sortino Ratio */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sortino</p>
              </div>
              <p className="text-xl font-bold font-mono-numbers">{analytics.sortinoRatio.toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Volatility */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Volatility</p>
              </div>
              <p className="text-xl font-bold font-mono-numbers">{analytics.volatility.toFixed(1)}%</p>
            </CardContent>
          </Card>

          {/* Max Drawdown */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Max DD</p>
              </div>
              <p className="text-xl font-bold font-mono-numbers text-loss">{analytics.maxDrawdown.toFixed(1)}%</p>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</p>
              </div>
              <p className="text-xl font-bold font-mono-numbers">{analytics.winRate.toFixed(0)}%</p>
            </CardContent>
          </Card>

          {/* Calmar Ratio */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Calmar</p>
              </div>
              <p className="text-xl font-bold font-mono-numbers">{analytics.calmarRatio.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Rating Summary */}
        <Card className="border-border/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risk-Adjusted Performance</p>
                  <div className="flex items-center gap-2">
                    <p className={cn("text-lg font-bold", riskRating.color)}>{riskRating.label}</p>
                    <Badge variant="outline">Sharpe {analytics.sharpeRatio.toFixed(2)}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Alpha</p>
                  <p className={cn("text-lg font-bold", analytics.alpha >= 0 ? "text-profit" : "text-loss")}>
                    {analytics.alpha >= 0 ? '+' : ''}{analytics.alpha.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Beta</p>
                  <p className="text-lg font-bold">{analytics.beta.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profit Factor</p>
                  <p className="text-lg font-bold">{analytics.profitFactor.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Monthly Returns</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          {/* Monthly Returns Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Monthly Returns Bar Chart */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Monthly Returns</CardTitle>
                  <CardDescription>Return percentage by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {analytics.monthlyReturns.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.monthlyReturns}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const value = payload[0].value as number;
                                return (
                                  <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                                    <p className="text-sm text-muted-foreground">{payload[0].payload.month}</p>
                                    <p className={cn("text-lg font-bold font-mono-numbers", value >= 0 ? "text-profit" : "text-loss")}>
                                      {value >= 0 ? "+" : ""}{value.toFixed(1)}%
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                            {analytics.monthlyReturns.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.return >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No monthly data available yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cumulative Returns */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Cumulative Returns</CardTitle>
                  <CardDescription>Running total of returns over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {cumulativeReturns.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cumulativeReturns}>
                          <defs>
                            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                                    <p className="text-sm text-muted-foreground">{payload[0].payload.month}</p>
                                    <p className="text-lg font-bold font-mono-numbers text-primary">
                                      {Number(payload[0].value) >= 0 ? '+' : ''}{payload[0].value}%
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="cumulative"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCumulative)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No cumulative data available yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Returns Table */}
            {analytics.monthlyReturns.length > 0 && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Monthly Returns Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                    {analytics.monthlyReturns.map((m) => (
                      <div 
                        key={m.month}
                        className={cn(
                          "rounded-lg p-3 text-center",
                          m.return >= 0 ? "bg-profit/10" : "bg-loss/10"
                        )}
                      >
                        <p className="text-xs text-muted-foreground mb-1">{m.month}</p>
                        <p className={cn(
                          "text-sm font-bold font-mono-numbers",
                          m.return >= 0 ? "text-profit" : "text-loss"
                        )}>
                          {m.return >= 0 ? '+' : ''}{m.return.toFixed(1)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Risk Analysis Tab */}
          <TabsContent value="risk" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Risk Radar */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Risk Profile</CardTitle>
                  <CardDescription>Multi-factor risk assessment (0-100 scale)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={analytics.riskMetrics}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Radar
                          name="Score"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Drawdown Chart */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Drawdown</CardTitle>
                  <CardDescription>Portfolio decline from peak value</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    {drawdownData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={drawdownData}>
                          <defs>
                            <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--loss))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--loss))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `${v}%`}
                            domain={['auto', 0]}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                                    <p className="text-sm text-muted-foreground">{payload[0].payload.date}</p>
                                    <p className="text-lg font-bold font-mono-numbers text-loss">
                                      {payload[0].value}%
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--loss))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorDrawdown)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No historical data available yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-2xl font-bold">{analytics.sharpeRatio.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Risk-adjusted return</p>
                    </div>
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", 
                      analytics.sharpeRatio >= 1.5 ? "bg-profit-muted" : "bg-chart-4/10"
                    )}>
                      <Shield className={cn("h-6 w-6", analytics.sharpeRatio >= 1.5 ? "text-profit" : "text-chart-4")} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sortino Ratio</p>
                      <p className="text-2xl font-bold">{analytics.sortinoRatio.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Downside risk-adjusted</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-2/10">
                      <Target className="h-6 w-6 text-chart-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-2xl font-bold text-loss">{analytics.maxDrawdown.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Peak to trough decline</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-loss-muted">
                      <TrendingDown className="h-6 w-6 text-loss" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Volatility</p>
                      <p className="text-2xl font-bold">{analytics.volatility.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Annualized std deviation</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-4/10">
                      <Activity className="h-6 w-6 text-chart-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attribution Tab */}
          <TabsContent value="attribution" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Performance Attribution</CardTitle>
                <CardDescription>Individual asset contribution to portfolio returns</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.assetPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.assetPerformance.map((asset) => (
                      <div key={asset.symbol} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-semibold text-sm text-primary">
                              {asset.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium">{asset.symbol}</p>
                              <p className="text-sm text-muted-foreground">{asset.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Weight</p>
                                <p className="font-mono-numbers">{asset.weight.toFixed(1)}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Return</p>
                                <p className={cn(
                                  "font-mono-numbers font-medium",
                                  asset.return >= 0 ? "text-profit" : "text-loss"
                                )}>
                                  {asset.return >= 0 ? '+' : ''}{asset.return.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Contribution</p>
                                <p className={cn(
                                  "font-mono-numbers font-medium",
                                  asset.contribution >= 0 ? "text-profit" : "text-loss"
                                )}>
                                  {asset.contribution >= 0 ? '+' : ''}{asset.contribution.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(100, Math.abs(asset.contribution) * 10)} 
                          className={cn("h-2", asset.contribution < 0 && "[&>div]:bg-loss")}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No holdings data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Win/Loss Stats */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Win/Loss Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-bold font-mono-numbers">{analytics.winRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={analytics.winRate} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="rounded-lg bg-profit/10 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Avg Win</p>
                      <p className="text-lg font-bold text-profit font-mono-numbers">
                        {analytics.avgWin >= 0 ? '+' : ''}{analytics.avgWin.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-loss/10 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Avg Loss</p>
                      <p className="text-lg font-bold text-loss font-mono-numbers">{analytics.avgLoss.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Ratios */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Performance Ratios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <Badge variant="outline" className="font-mono-numbers">{analytics.sharpeRatio.toFixed(2)}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Sortino Ratio</span>
                    <Badge variant="outline" className="font-mono-numbers">{analytics.sortinoRatio.toFixed(2)}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Calmar Ratio</span>
                    <Badge variant="outline" className="font-mono-numbers">{analytics.calmarRatio.toFixed(2)}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Profit Factor</span>
                    <Badge variant="outline" className="font-mono-numbers">{analytics.profitFactor.toFixed(2)}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Beta</span>
                    <Badge variant="outline" className="font-mono-numbers">{analytics.beta.toFixed(2)}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Alpha Generation */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Alpha & Beta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={cn("text-center p-4 rounded-lg", analytics.alpha >= 0 ? "bg-profit/10" : "bg-loss/10")}>
                    <p className="text-sm text-muted-foreground mb-1">Alpha (Excess Return)</p>
                    <p className={cn("text-3xl font-bold font-mono-numbers", analytics.alpha >= 0 ? "text-profit" : "text-loss")}>
                      {analytics.alpha >= 0 ? '+' : ''}{analytics.alpha.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Annualized outperformance vs benchmark</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground mb-1">Beta (Market Sensitivity)</p>
                    <p className="text-3xl font-bold font-mono-numbers">{analytics.beta.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.beta > 1 ? 'More volatile than market' : 'Less volatile than market'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
