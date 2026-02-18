/**
 * Dashboard Analytics Summary - Compact 30-day analytics with sparkline
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Tooltip 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ChevronRight,
  BarChart3,
  Percent,
} from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { subDays, isWithinInterval, format } from "date-fns";
import { cn } from "@/lib/utils";

interface SparklineData {
  date: string;
  pnl: number;
  cumulative: number;
}

export function DashboardAnalyticsSummary() {
  const { data: trades = [] } = useModeFilteredTrades();
  const { formatPnl } = useCurrencyConversion();

  const analyticsData = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'closed');
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    const last30DayTrades = closedTrades.filter(t => 
      isWithinInterval(new Date(t.trade_date), { start: thirtyDaysAgo, end: new Date() })
    );
    
    const getPnl = (t: typeof closedTrades[0]) => t.realized_pnl ?? t.pnl ?? 0;
    
    const decisiveTrades = last30DayTrades.filter(t => getPnl(t) !== 0);
    const wins = decisiveTrades.filter(t => getPnl(t) > 0);
    const winRate = decisiveTrades.length > 0 
      ? (wins.length / decisiveTrades.length) * 100 
      : 0;
    
    const sixtyDaysAgo = subDays(new Date(), 60);
    const prev30DayTrades = closedTrades.filter(t => 
      isWithinInterval(new Date(t.trade_date), { start: sixtyDaysAgo, end: thirtyDaysAgo })
    );
    const prevWins = prev30DayTrades.filter(t => getPnl(t) > 0);
    const prevWinRate = prev30DayTrades.length > 0 
      ? (prevWins.length / prev30DayTrades.length) * 100 
      : 0;
    const winRateTrend = winRate - prevWinRate;
    
    const grossProfit = wins.reduce((sum, t) => sum + getPnl(t), 0);
    const losses = last30DayTrades.filter(t => getPnl(t) < 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + getPnl(t), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    const sparklineData: SparklineData[] = [];
    let cumulative = 0;
    
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTrades = closedTrades.filter(t => 
        format(new Date(t.trade_date), 'yyyy-MM-dd') === dateStr
      );
      const dayPnl = dayTrades.reduce((sum, t) => sum + getPnl(t), 0);
      cumulative += dayPnl;
      
      sparklineData.push({
        date: format(date, 'MMM d'),
        pnl: dayPnl,
        cumulative,
      });
    }
    
    return {
      winRate,
      winRateTrend,
      profitFactor,
      sparklineData,
      totalPnl14d: cumulative,
      trades30d: last30DayTrades.length,
    };
  }, [trades]);

  if (analyticsData.trades30d < 3) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center py-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">30-Day Performance</p>
              <p className="text-xs">Log 3+ trades this month to unlock analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPfColor = (pf: number) => {
    if (pf >= 2) return 'text-profit';
    if (pf >= 1.5) return 'text-foreground';
    if (pf >= 1) return 'text-[hsl(var(--chart-4))]';
    return 'text-loss';
  };

  const isPositive14d = analyticsData.totalPnl14d >= 0;
  const sparkColor = isPositive14d ? "hsl(var(--profit))" : "hsl(var(--loss))";

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">30-Day Performance</span>
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {analyticsData.trades30d} trades
            </Badge>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-muted-foreground">
            <Link to="/performance" className="flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Win Rate */}
          <div className="p-3 rounded-xl bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">Win Rate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold">{analyticsData.winRate.toFixed(0)}%</span>
              {analyticsData.winRateTrend !== 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1 h-4",
                    analyticsData.winRateTrend > 0 ? "bg-profit/10 text-profit border-profit/30" : "bg-loss/10 text-loss border-loss/30"
                  )}
                >
                  {analyticsData.winRateTrend > 0 ? '+' : ''}{analyticsData.winRateTrend.toFixed(0)}%
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">vs. prev 30d</p>
          </div>

          {/* Profit Factor */}
          <div className="p-3 rounded-xl bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">Profit Factor</span>
            </div>
            <span className={cn("text-lg sm:text-xl font-bold block", getPfColor(analyticsData.profitFactor))}>
              {analyticsData.profitFactor === Infinity ? '∞' : analyticsData.profitFactor.toFixed(2)}
            </span>
            <p className="text-[10px] text-muted-foreground">
              {analyticsData.profitFactor >= 2 ? 'Excellent' : analyticsData.profitFactor >= 1.5 ? 'Good' : analyticsData.profitFactor >= 1 ? 'Average' : 'Below avg'}
            </p>
          </div>

          {/* 14D P&L */}
          <div className="p-3 rounded-xl bg-muted/30 space-y-1">
            <div className="flex items-center gap-1.5">
              {isPositive14d ? (
                <TrendingUp className="h-3.5 w-3.5 text-profit" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-loss" />
              )}
              <span className="text-[11px] text-muted-foreground font-medium">14D P&L</span>
            </div>
            <span className={cn("text-lg sm:text-xl font-bold block font-mono-numbers", isPositive14d ? "text-profit" : "text-loss")}>
              {formatPnl(analyticsData.totalPnl14d)}
            </span>
            <p className="text-[10px] text-muted-foreground">Cumulative</p>
          </div>
        </div>

        {/* Sparkline */}
        <div className="h-[72px]">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">14-Day Equity Curve</p>
          <ResponsiveContainer width="100%" height={52}>
            <AreaChart data={analyticsData.sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sparkColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg px-2.5 py-1.5 text-xs shadow-md">
                        <p className="text-muted-foreground mb-0.5">{payload[0].payload.date}</p>
                        <p className={cn("font-semibold", payload[0].payload.cumulative >= 0 ? "text-profit" : "text-loss")}>
                          {formatPnl(payload[0].payload.cumulative)}
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
                stroke={sparkColor}
                strokeWidth={1.5}
                fill="url(#sparkGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
