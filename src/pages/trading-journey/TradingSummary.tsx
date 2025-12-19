import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, Calendar } from "lucide-react";

const summaryData = {
  daily: { trades: 5, pnl: 2500000, winRate: 80, rr: 2.1 },
  weekly: { trades: 23, pnl: 8500000, winRate: 65, rr: 1.8 },
  monthly: { trades: 89, pnl: 35000000, winRate: 62, rr: 1.9 },
  yearly: { trades: 450, pnl: 180000000, winRate: 58, rr: 1.7 },
};

const recentTrades = [
  { id: "1", pair: "BTC/USDT", type: "LONG", entry: 42500, exit: 43200, pnl: 1500000, rr: 2.5, result: "win" },
  { id: "2", pair: "ETH/USDT", type: "SHORT", entry: 2280, exit: 2250, pnl: 800000, rr: 1.8, result: "win" },
  { id: "3", pair: "SOL/USDT", type: "LONG", entry: 98, exit: 95, pnl: -500000, rr: -1.2, result: "loss" },
];

export default function TradingSummary() {
  const formatCurrency = (v: number) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}jt` : `Rp${v.toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Summary</h1>
          <p className="text-muted-foreground">Comprehensive trading performance overview</p>
        </div>

        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          {Object.entries(summaryData).map(([period, data]) => (
            <TabsContent key={period} value={period}>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.trades}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">P&L</CardTitle>
                    {data.pnl >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${data.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {data.pnl >= 0 ? "+" : ""}{formatCurrency(data.pnl)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.winRate}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg R:R</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.rr}:1</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <Badge variant={trade.type === "LONG" ? "default" : "secondary"}>{trade.type}</Badge>
                    <span className="font-medium">{trade.pair}</span>
                    <span className="text-sm text-muted-foreground">
                      {trade.entry} → {trade.exit}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">R:R {trade.rr}</span>
                    <span className={`font-bold ${trade.result === "win" ? "text-green-500" : "text-red-500"}`}>
                      {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
