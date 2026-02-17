/**
 * Dashboard Analytics Summary - Compact analytics with sparkline
 * Shows 30-day win rate, profit factor, and 14-day P&L trend
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
  BarChart3
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
    
    // Last 30 days for win rate & profit factor
    const thirtyDaysAgo = subDays(new Date(), 30);
    const last30DayTrades = closedTrades.filter(t => 
      isWithinInterval(new Date(t.trade_date), { start: thirtyDaysAgo, end: new Date() })
    );
    
    const getPnl = (t: typeof closedTrades[0]) => t.realized_pnl ?? t.pnl ?? 0;
    
    // Win Rate — exclude breakeven (pnl === 0) from denominator
    const decisiveTrades = last30DayTrades.filter(t => getPnl(t) !== 0);
    const wins = decisiveTrades.filter(t => getPnl(t) > 0);
    const winRate = decisiveTrades.length > 0 
      ? (wins.length / decisiveTrades.length) * 100 
      : 0;
    
    // Win Rate Trend (compare to previous 30 days)
    const sixtyDaysAgo = subDays(new Date(), 60);
    const prev30DayTrades = closedTrades.filter(t => 
      isWithinInterval(new Date(t.trade_date), { start: sixtyDaysAgo, end: thirtyDaysAgo })
    );
    const prevWins = prev30DayTrades.filter(t => getPnl(t) > 0);
    const prevWinRate = prev30DayTrades.length > 0 
      ? (prevWins.length / prev30DayTrades.length) * 100 
      : 0;
    const winRateTrend = winRate - prevWinRate;
    
    // Profit Factor
    const grossProfit = wins.reduce((sum, t) => sum + getPnl(t), 0);
    const losses = last30DayTrades.filter(t => getPnl(t) < 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + getPnl(t), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    // 14-day sparkline data
    const fourteenDaysAgo = subDays(new Date(), 14);
    const sparklineData: SparklineData[] = [];
    let cumulative = 0;
    
    // Group trades by date for last 14 days
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTrades = closedTrades.filter(t => 
        format(new Date(t.trade_date), 'yyyy-MM-dd') === dateStr
      );
      const dayPnl = dayTrades.reduce((sum, t) => sum + getPnl(t), 0);
      cumulative += dayPnl;
      
      sparklineData.push({
        date: format(date, 'MMM dd'),
        pnl: dayPnl,
        cumulative,
      });
    }
    
    const totalPnl14d = cumulative;
    
    return {
      winRate,
      winRateTrend,
      profitFactor,
      sparklineData,
      totalPnl14d,
      trades30d: last30DayTrades.length,
    };
  }, [trades]);

  // Show empty state if not enough data
  if (analyticsData.trades30d < 3) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Log 3+ trades this month to unlock 30-day performance analytics</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProfitFactorColor = (pf: number) => {
    if (pf >= 2) return 'text-profit';
    if (pf >= 1.5) return 'text-foreground';
    if (pf >= 1) return 'text-[hsl(var(--chart-4))]';
    return 'text-loss';
  };

  return (
    <Card className="h-full">
      <CardContent className="pt-4 h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">30-Day Performance</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 px-2">
            <Link to="/performance" className="flex items-center gap-1 text-xs text-muted-foreground">
              Details <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Win Rate */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">30D Win Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{analyticsData.winRate.toFixed(0)}%</span>
              {analyticsData.winRateTrend !== 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs px-1",
                    analyticsData.winRateTrend > 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                  )}
                >
                  {analyticsData.winRateTrend > 0 ? '+' : ''}{analyticsData.winRateTrend.toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Profit Factor */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Profit Factor</span>
            </div>
            <span className={cn("text-xl font-bold", getProfitFactorColor(analyticsData.profitFactor))}>
              {analyticsData.profitFactor === Infinity ? '∞' : analyticsData.profitFactor.toFixed(2)}
            </span>
          </div>

          {/* 14-Day P&L with Sparkline */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {analyticsData.totalPnl14d >= 0 ? (
                <TrendingUp className="h-4 w-4 text-profit" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
              <span className="text-xs text-muted-foreground">14D P&L</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xl font-bold",
                analyticsData.totalPnl14d >= 0 ? "text-profit" : "text-loss"
              )}>
                {formatPnl(analyticsData.totalPnl14d)}
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline Chart */}
        <div className="h-12 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analyticsData.sparklineData}>
              <defs>
                <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={analyticsData.totalPnl14d >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={analyticsData.totalPnl14d >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-2 text-xs shadow-md">
                        <p className="text-muted-foreground">{payload[0].payload.date}</p>
                        <p className={cn(
                          "font-medium",
                          payload[0].payload.cumulative >= 0 ? "text-profit" : "text-loss"
                        )}>
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
                stroke={analyticsData.totalPnl14d >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"}
                strokeWidth={2}
                fill="url(#sparklineGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
