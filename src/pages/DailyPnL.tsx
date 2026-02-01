/**
 * Daily P&L Page - System-First Compliant
 * Works with both Binance (enriched) and Paper Trading data
 */
import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Download,
  FileText,
  Activity,
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
import { useUnifiedDailyPnl } from "@/hooks/use-unified-daily-pnl";
import { useUnifiedWeeklyPnl } from "@/hooks/use-unified-weekly-pnl";
import { useUnifiedWeekComparison } from "@/hooks/use-unified-week-comparison";
import { usePerformanceExport } from "@/hooks/use-performance-export";
import { format } from "date-fns";

export default function DailyPnL() {
  const dailyStats = useUnifiedDailyPnl();
  const weeklyStats = useUnifiedWeeklyPnl();
  const weekComparison = useUnifiedWeekComparison();
  const { exportToCSV, exportToPDF } = usePerformanceExport();

  const formatCurrency = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  const ChangeIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    if (value > 0) return <span className="text-profit flex items-center gap-1"><ArrowUp className="h-3 w-3" />+{value.toFixed(1)}{suffix}</span>;
    if (value < 0) return <span className="text-loss flex items-center gap-1"><ArrowDown className="h-3 w-3" />{value.toFixed(1)}{suffix}</span>;
    return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0{suffix}</span>;
  };

  // Symbol breakdown is only available from Binance income endpoint
  // For Paper Trading, this section will be hidden (graceful degradation)
  const symbolBreakdown = useMemo(() => {
    // Symbol breakdown requires Binance-specific bySymbol data
    // The unified hooks don't expose this granular data
    // To show symbol breakdown for Paper, we'd need to aggregate from trade_entries
    // For now, this feature is Binance-only
    return [];
  }, []);

  const handleExportCSV = () => {
    exportToCSV({
      trades: [],
      stats: {
        totalTrades: weeklyStats.totalTrades,
        winRate: weekComparison.currentWeek.winRate,
        profitFactor: 0,
        totalPnl: weeklyStats.totalNet,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdownPercent: 0,
        sharpeRatio: 0,
        avgRR: 0,
        expectancy: 0,
      },
      dateRange: { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() },
      weeklyData: weeklyStats.dailyData,
      symbolBreakdown,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      trades: [],
      stats: {
        totalTrades: weeklyStats.totalTrades,
        winRate: weekComparison.currentWeek.winRate,
        profitFactor: 0,
        totalPnl: weeklyStats.totalNet,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdownPercent: 0,
        sharpeRatio: 0,
        avgRR: 0,
        expectancy: 0,
      },
      dateRange: { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() },
      weeklyData: weeklyStats.dailyData,
      symbolBreakdown,
    });
  };

  // System-First: No EmptyState gate - page always renders

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header with Export Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                Daily P&L
              </h1>
              <p className="text-muted-foreground">
                Analyze your daily profit and loss breakdown
              </p>
            </div>
            {/* Source Badge */}
            <Badge variant="outline" className="text-xs h-6">
              {dailyStats.source === 'binance' ? '🔗 Live' : '📝 Paper'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Today's P&L Summary */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Today's P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Realized P&L</p>
                <p className={`text-2xl font-bold ${dailyStats.grossPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(dailyStats.grossPnl)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {dailyStats.source === 'binance' 
                    ? `-$${dailyStats.totalCommission.toFixed(2)}`
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trades Today</p>
                <p className="text-2xl font-bold">{dailyStats.totalTrades}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{dailyStats.winRate.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Comparison Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                This Week P&L
                <InfoTooltip content="Total realized profit/loss for the current week from your trading activity." />
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

        {/* Symbol Breakdown - Only shown when data available (Binance) */}
        {symbolBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Symbol Breakdown</CardTitle>
              <CardDescription>P&L performance by trading pair (7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {symbolBreakdown.map((item: any) => (
                  <div key={item.symbol} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{item.symbol}</Badge>
                      <span className="text-sm text-muted-foreground">{item.trades} trades</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">Fees</p>
                        <p className="text-muted-foreground">-${item.fees.toFixed(2)}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-muted-foreground text-xs">Net P&L</p>
                        <p className={`font-bold ${item.net >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {item.net >= 0 ? '+' : ''}{formatCurrency(item.net)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
