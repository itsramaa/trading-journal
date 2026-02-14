/**
 * Daily P&L Page - System-First Compliant
 * Works with both Binance (enriched) and Paper Trading data
 * Uses centralized currency conversion for user's preferred currency
 */

import { PageHeader } from "@/components/ui/page-header";
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
  Activity,
  Info,
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
import { useSymbolBreakdown } from "@/hooks/use-symbol-breakdown";
import { Link } from "react-router-dom";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Extracted to module-level to avoid re-creation on every render
const ChangeIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  if (value > 0) return <span className="text-profit flex items-center gap-1"><ArrowUp className="h-3 w-3" />+{value.toFixed(1)}{suffix}</span>;
  if (value < 0) return <span className="text-loss flex items-center gap-1"><ArrowDown className="h-3 w-3" />{value.toFixed(1)}{suffix}</span>;
  return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0{suffix}</span>;
};

export default function DailyPnL() {
  const dailyStats = useUnifiedDailyPnl();
  const weeklyStats = useUnifiedWeeklyPnl();
  const weekComparison = useUnifiedWeekComparison();
  const { weeklyBreakdown: symbolBreakdown } = useSymbolBreakdown();
  const { formatCompact, format: formatCurrency } = useCurrencyConversion();

  const isLoading = dailyStats.isLoading || weeklyStats.isLoading;
  const hasNoActivity = dailyStats.totalTrades === 0 && weeklyStats.totalTrades === 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={DollarSign}
          title="Daily P&L"
          description="Analyze your daily profit and loss breakdown"
        />
        <MetricsGridSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
          icon={DollarSign}
          title="Daily P&L"
          description="Analyze your daily profit and loss breakdown"
        >
          <Badge variant="outline" className="text-xs h-6">
            {dailyStats.source === 'binance' ? '🔗 Live' : '📝 Paper'}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link to="/export?tab=analytics">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Link>
          </Button>
        </PageHeader>

        {/* Empty State Banner */}
        {hasNoActivity && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No trading activity recorded yet. Start trading to see your P&L breakdown here.
            </AlertDescription>
          </Alert>
        )}

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
                  {formatCompact(dailyStats.grossPnl)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  -{formatCurrency(dailyStats.totalCommission)}
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
                {formatCompact(weekComparison.currentWeek.netPnl)}
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
                {formatCompact(weeklyStats.totalNet)}
              </div>
              <p className="text-xs text-muted-foreground">Gross: {formatCompact(weeklyStats.totalGross)}</p>
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
                    <span className="text-profit font-bold">{formatCompact(weeklyStats.bestTrade.pnl)}</span>
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
                    <span className="text-loss font-bold">{formatCompact(weeklyStats.worstTrade.pnl)}</span>
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
                  <YAxis tickFormatter={(v) => formatCompact(v)} className="text-xs" />
                  <Tooltip 
                    formatter={(v: number) => [formatCompact(v), 'P&L']}
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

        {/* Symbol Breakdown - Shown in both modes when data exists */}
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
                        <p className="text-muted-foreground">-{formatCurrency(item.fees)}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-muted-foreground text-xs">Net P&L</p>
                        <p className={`font-bold ${item.net >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {item.net >= 0 ? '+' : ''}{formatCompact(item.net)}
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
  );
}
