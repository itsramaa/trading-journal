import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, Percent, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const performanceData = [
  { date: "Jan", pnl: 15000000, cumulative: 15000000 },
  { date: "Feb", pnl: -5000000, cumulative: 10000000 },
  { date: "Mar", pnl: 25000000, cumulative: 35000000 },
  { date: "Apr", pnl: 18000000, cumulative: 53000000 },
  { date: "May", pnl: -8000000, cumulative: 45000000 },
  { date: "Jun", pnl: 30000000, cumulative: 75000000 },
];

const metrics = {
  winRate: 62,
  profitFactor: 2.1,
  expectancy: 850000,
  sharpeRatio: 1.8,
  maxDrawdown: 15,
  avgRR: 1.9,
  totalTrades: 450,
  avgTradesPerDay: 3.2,
};

export default function Performance() {
  const formatCurrency = (v: number) => v >= 1000000 ? `Rp${(v/1000000).toFixed(0)}jt` : `Rp${v.toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">Deep dive into your trading performance metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.winRate}%</div>
              <Progress value={metrics.winRate} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{metrics.profitFactor}</div>
              <p className="text-xs text-muted-foreground">Gross profit / Gross loss</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expectancy</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.expectancy)}</div>
              <p className="text-xs text-muted-foreground">Per trade average</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{metrics.maxDrawdown}%</div>
              <p className="text-xs text-muted-foreground">Peak to trough</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{metrics.sharpeRatio}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg R:R</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{metrics.avgRR}:1</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Trades</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{metrics.totalTrades}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Trades/Day</CardTitle></CardHeader>
            <CardContent><div className="text-xl font-bold">{metrics.avgTradesPerDay}</div></CardContent>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis tickFormatter={(v) => `${v/1000000}M`} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
