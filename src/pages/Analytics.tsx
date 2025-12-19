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
import { cn } from "@/lib/utils";

const monthlyReturns = [
  { month: "Jan", return: 5.2 },
  { month: "Feb", return: 3.1 },
  { month: "Mar", return: -2.4 },
  { month: "Apr", return: 8.7 },
  { month: "May", return: 4.2 },
  { month: "Jun", return: -1.8 },
  { month: "Jul", return: 6.9 },
  { month: "Aug", return: 4.4 },
  { month: "Sep", return: -2.1 },
  { month: "Oct", return: 4.9 },
  { month: "Nov", return: 3.5 },
  { month: "Dec", return: 2.8 },
];

const drawdownData = [
  { date: "Jan", value: 0 },
  { date: "Feb", value: -2 },
  { date: "Mar", value: -8 },
  { date: "Apr", value: -3 },
  { date: "May", value: -1 },
  { date: "Jun", value: -5 },
  { date: "Jul", value: 0 },
  { date: "Aug", value: -2 },
  { date: "Sep", value: -6 },
  { date: "Oct", value: -3 },
  { date: "Nov", value: -1 },
  { date: "Dec", value: 0 },
];

const riskMetrics = [
  { metric: "Volatility", value: 85 },
  { metric: "Sharpe", value: 72 },
  { metric: "Sortino", value: 78 },
  { metric: "Beta", value: 65 },
  { metric: "Alpha", value: 80 },
  { metric: "Max DD", value: 60 },
];

const assetPerformance = [
  { symbol: "NVDA", return: 94.4, benchmark: 25 },
  { symbol: "BTC", return: 50.0, benchmark: 45 },
  { symbol: "ETH", return: 46.0, benchmark: 40 },
  { symbol: "AAPL", return: 20.3, benchmark: 25 },
  { symbol: "VOO", return: 17.1, benchmark: 20 },
  { symbol: "BBCA", return: 13.5, benchmark: 10 },
];

const Analytics = () => {
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
                  <p className="text-sm text-muted-foreground">Annualized Return</p>
                  <p className="text-2xl font-bold text-profit">+37.4%</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-profit-muted">
                  <TrendingUp className="h-5 w-5 text-profit" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-2xl font-bold">1.85</p>
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
                  <p className="text-2xl font-bold text-loss">-8.2%</p>
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
                  <p className="text-sm text-muted-foreground">Volatility</p>
                  <p className="text-2xl font-bold">18.5%</p>
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
                    <Badge className="bg-profit-muted text-profit hover:bg-profit-muted">1.85</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Sortino Ratio</p>
                        <p className="text-sm text-muted-foreground">Downside risk-adjusted</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">2.12</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-loss-muted">
                        <AlertTriangle className="h-5 w-5 text-loss" />
                      </div>
                      <div>
                        <p className="font-medium">Value at Risk (95%)</p>
                        <p className="text-sm text-muted-foreground">Daily potential loss</p>
                      </div>
                    </div>
                    <Badge className="bg-loss-muted text-loss hover:bg-loss-muted">-$7,823</Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Beta</p>
                        <p className="text-sm text-muted-foreground">Market correlation</p>
                      </div>
                    </div>
                    <Badge variant="secondary">1.15</Badge>
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
                              {asset.return >= 0 ? "+" : ""}{asset.return}%
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
                            style={{ width: `${Math.min(asset.return, 100)}%` }}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
