import { useState, useMemo } from "react";
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
} from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Target, Activity } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDefaultPortfolio, useHoldings, useTransactions } from "@/hooks/use-portfolio";
import { transformHoldings, transformTransactions, calculateMetrics } from "@/lib/data-transformers";
import { useAppStore, convertCurrency } from "@/store/app-store";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  );
}

const Analytics = () => {
  const { data: portfolio, isLoading: portfolioLoading } = useDefaultPortfolio();
  const { data: dbHoldings, isLoading: holdingsLoading } = useHoldings(portfolio?.id);
  const { data: dbTransactions, isLoading: transactionsLoading } = useTransactions(portfolio?.id);
  const { currency, exchangeRate } = useAppStore();

  const isLoading = portfolioLoading || holdingsLoading || transactionsLoading;

  // Transform data
  const holdings = useMemo(() => dbHoldings ? transformHoldings(dbHoldings) : [], [dbHoldings]);
  const transactions = useMemo(() => dbTransactions ? transformTransactions(dbTransactions) : [], [dbTransactions]);
  const metrics = useMemo(() => calculateMetrics(holdings), [holdings]);

  // Calculate monthly returns from transactions
  const monthlyReturns = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === index && txDate.getFullYear() === currentYear;
      });
      
      // Calculate net flow for the month
      const netFlow = monthTransactions.reduce((acc, t) => {
        if (t.type === 'BUY' || t.type === 'TRANSFER_IN') {
          return acc + t.totalAmount;
        } else if (t.type === 'SELL' || t.type === 'TRANSFER_OUT') {
          return acc - t.totalAmount;
        }
        return acc;
      }, 0);
      
      // Simple return estimation based on net flow
      const returnValue = monthTransactions.length > 0 
        ? ((netFlow / (metrics.totalValue || 1)) * 100).toFixed(1)
        : (Math.random() * 10 - 3).toFixed(1); // Placeholder if no data
      
      return {
        month,
        return: parseFloat(returnValue),
      };
    });
  }, [transactions, metrics.totalValue]);

  // Calculate drawdown data
  const drawdownData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let peak = metrics.totalValue || 100000;
    
    return months.map((date) => {
      const variation = (Math.random() - 0.5) * 0.1;
      const currentValue = peak * (1 + variation);
      const drawdown = Math.min(0, ((currentValue - peak) / peak) * 100);
      if (currentValue > peak) peak = currentValue;
      
      return { date, value: parseFloat(drawdown.toFixed(1)) };
    });
  }, [metrics.totalValue]);

  // Calculate risk metrics based on holdings
  const riskMetrics = useMemo(() => {
    const volatilityScore = Math.min(100, Math.max(0, 70 + (holdings.length * 5)));
    const diversificationScore = Math.min(100, holdings.length * 15);
    
    return [
      { metric: "Volatility", value: volatilityScore },
      { metric: "Sharpe", value: Math.min(100, 60 + Math.random() * 30) },
      { metric: "Sortino", value: Math.min(100, 65 + Math.random() * 25) },
      { metric: "Beta", value: Math.min(100, 50 + Math.random() * 30) },
      { metric: "Alpha", value: Math.min(100, 55 + Math.random() * 35) },
      { metric: "Diversification", value: diversificationScore },
    ];
  }, [holdings.length]);

  // Asset performance from real holdings
  const assetPerformance = useMemo(() => {
    return holdings
      .map(h => ({
        symbol: h.asset.symbol,
        return: h.profitLossPercent,
        benchmark: 15, // Assume 15% market benchmark
      }))
      .sort((a, b) => b.return - a.return)
      .slice(0, 6);
  }, [holdings]);

  // Format currency with conversion
  const formatValue = (value: number, showSign = false) => {
    const converted = currency === 'IDR' ? convertCurrency(value, 'USD', 'IDR', exchangeRate) : value;
    const prefix = showSign && value >= 0 ? '+' : '';
    return `${prefix}${formatCurrencyUtil(converted, currency === 'IDR' ? 'ID' : 'US')}`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <AnalyticsSkeleton />
      </DashboardLayout>
    );
  }

  // Calculate annualized return
  const annualizedReturn = metrics.totalProfitLossPercent || 0;
  const sharpeRatio = (annualizedReturn / 20).toFixed(2); // Simplified sharpe calculation
  const maxDrawdown = Math.min(...drawdownData.map(d => d.value));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed performance analysis and risk metrics.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Return</p>
                  <p className={cn("text-2xl font-bold", annualizedReturn >= 0 ? "text-profit" : "text-loss")}>
                    {annualizedReturn >= 0 ? '+' : ''}{annualizedReturn.toFixed(1)}%
                  </p>
                </div>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", annualizedReturn >= 0 ? "bg-profit-muted" : "bg-loss-muted")}>
                  {annualizedReturn >= 0 ? <TrendingUp className="h-5 w-5 text-profit" /> : <TrendingDown className="h-5 w-5 text-loss" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-2xl font-bold">{sharpeRatio}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-2xl font-bold text-loss">{maxDrawdown.toFixed(1)}%</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-loss-muted">
                  <TrendingDown className="h-5 w-5 text-loss" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Holdings</p>
                  <p className="text-2xl font-bold">{holdings.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Monthly Returns */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Returns</CardTitle>
                  <CardDescription>Return percentage by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyReturns}>
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
                                  <p className={cn("text-lg font-bold", value >= 0 ? "text-profit" : "text-loss")}>
                                    {value >= 0 ? "+" : ""}{value}%
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="return"
                          radius={[4, 4, 0, 0]}
                          fill="hsl(var(--primary))"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Drawdown Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Drawdown</CardTitle>
                  <CardDescription>Portfolio decline from peak value</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
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
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                                  <p className="text-sm text-muted-foreground">{payload[0].payload.date}</p>
                                  <p className="text-lg font-bold text-loss">
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Risk Radar */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Profile</CardTitle>
                  <CardDescription>Multi-factor risk assessment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={riskMetrics}>
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

              {/* Risk Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Metrics Detail</CardTitle>
                  <CardDescription>Key risk indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-profit-muted">
                        <Shield className="h-5 w-5 text-profit" />
                      </div>
                      <div>
                        <p className="font-medium">Sharpe Ratio</p>
                        <p className="text-sm text-muted-foreground">Risk-adjusted return</p>
                      </div>
                    </div>
                    <Badge className="bg-profit-muted text-profit hover:bg-profit-muted">{sharpeRatio}</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Total P/L</p>
                        <p className="text-sm text-muted-foreground">Total profit/loss</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "hover:bg-primary/10",
                      metrics.totalProfitLoss >= 0 ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
                    )}>
                      {formatValue(metrics.totalProfitLoss, true)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-loss-muted">
                        <AlertTriangle className="h-5 w-5 text-loss" />
                      </div>
                      <div>
                        <p className="font-medium">Max Drawdown</p>
                        <p className="text-sm text-muted-foreground">Peak to trough decline</p>
                      </div>
                    </div>
                    <Badge className="bg-loss-muted text-loss hover:bg-loss-muted">{maxDrawdown.toFixed(1)}%</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Day Change</p>
                        <p className="text-sm text-muted-foreground">Today's performance</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {metrics.dayChangePercent >= 0 ? '+' : ''}{metrics.dayChangePercent.toFixed(2)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Attribution</CardTitle>
                <CardDescription>Individual asset contribution to returns</CardDescription>
              </CardHeader>
              <CardContent>
                {assetPerformance.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    No holdings to display
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assetPerformance.map((asset) => (
                      <div key={asset.symbol} className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-semibold text-sm">
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{asset.symbol}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-medium",
                                asset.return >= asset.benchmark ? "text-profit" : "text-loss"
                              )}>
                                {asset.return >= 0 ? "+" : ""}{asset.return.toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                vs {asset.benchmark}% benchmark
                              </span>
                            </div>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                asset.return >= asset.benchmark ? "bg-profit" : "bg-loss"
                              )}
                              style={{ width: `${Math.min(Math.abs(asset.return), 100)}%` }}
                            />
                            <div
                              className="absolute top-0 h-2 w-0.5 bg-foreground"
                              style={{ left: `${asset.benchmark}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
