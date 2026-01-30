/**
 * Daily P&L Page - Standalone page for daily P&L analysis
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  DollarSign, 
  Wallet, 
  ArrowUpDown, 
  Percent, 
  TrendingUp, 
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
} from "recharts";
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { useBinanceWeeklyPnl } from "@/hooks/use-binance-weekly-pnl";
import { useBinanceWeekComparison } from "@/hooks/use-binance-week-comparison";
import { format } from "date-fns";

export default function DailyPnL() {
  const binanceStats = useBinanceDailyPnl();
  const weeklyStats = useBinanceWeeklyPnl();
  const weekComparison = useBinanceWeekComparison();

  const formatCurrency = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  const ChangeIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    if (value > 0) return <span className="text-profit flex items-center gap-1"><ArrowUp className="h-3 w-3" />+{value.toFixed(1)}{suffix}</span>;
    if (value < 0) return <span className="text-loss flex items-center gap-1"><ArrowDown className="h-3 w-3" />{value.toFixed(1)}{suffix}</span>;
    return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0{suffix}</span>;
  };

  if (!binanceStats.isConnected) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Daily P&L
            </h1>
            <p className="text-muted-foreground">Analyze your daily profit and loss breakdown</p>
          </div>
          <EmptyState
            icon={DollarSign}
            title="Binance not connected"
            description="Connect your Binance account in Settings to see daily P&L analysis."
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
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Daily P&L
          </h1>
          <p className="text-muted-foreground">
            Analyze your daily profit and loss breakdown
          </p>
        </div>

        {/* Week Comparison Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                This Week P&L
                <InfoTooltip content="Total realized profit/loss for the current week from Binance futures trading." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${weekComparison.currentWeek.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(weekComparison.currentWeek.netPnl)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                vs last week: <ChangeIndicator value={weekComparison.change.pnlPercent} suffix="%" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                Net (After Fees)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${weeklyStats.totalNet >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(weeklyStats.totalNet)}
              </div>
              <p className="text-xs text-muted-foreground">Gross: {formatCurrency(weeklyStats.totalGross)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                Trades This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weekComparison.currentWeek.trades}</div>
              <div className="text-xs text-muted-foreground mt-1">
                vs last week: <ChangeIndicator value={weekComparison.change.tradesPercent} suffix="%" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Percent className="h-4 w-4" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weekComparison.currentWeek.winRate.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                vs last week: <ChangeIndicator value={weekComparison.change.winRateChange} suffix="pp" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best/Worst Trades - Above Chart */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-profit/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-profit" />
                Best Trade (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyStats.bestTrade ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{weeklyStats.bestTrade.symbol}</Badge>
                    <span className="text-profit font-bold">{formatCurrency(weeklyStats.bestTrade.pnl)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No winning trades this week</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-loss/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-loss" />
                Worst Trade (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyStats.worstTrade ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{weeklyStats.worstTrade.symbol}</Badge>
                    <span className="text-loss font-bold">{formatCurrency(weeklyStats.worstTrade.pnl)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No losing trades this week</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 7-Day Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">7-Day P&L Trend</CardTitle>
            <CardDescription>Daily profit/loss over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyStats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(v) => format(new Date(v), 'EEE')}
                    className="text-xs"
                  />
                  <YAxis tickFormatter={formatCurrency} className="text-xs" />
                  <Tooltip 
                    formatter={(v: number) => [formatCurrency(v), 'P&L']}
                    labelFormatter={(v) => format(new Date(v), 'MMM dd, yyyy')}
                  />
                  <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
                    {weeklyStats.dailyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        className={entry.netPnl >= 0 ? 'fill-profit' : 'fill-loss'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
