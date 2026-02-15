/**
 * SessionPerformanceChart - Trading performance breakdown by market session
 * Shows win rate, P&L, and trade count for Sydney, Tokyo, London, and New York sessions
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Clock, TrendingUp, TrendingDown, Trophy, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TradingSession, 
  SESSION_LABELS, 
  SESSION_COLORS, 
  formatSessionTimeLocal 
} from "@/lib/session-utils";
import { formatWinRate } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { PerformanceMetrics } from "@/hooks/use-contextual-analytics";

interface SessionPerformanceChartProps {
  bySession: Record<TradingSession, PerformanceMetrics>;
}

// Session order aligned with database values
const SESSION_ORDER: TradingSession[] = ['sydney', 'tokyo', 'london', 'new_york', 'other'];

// Session-specific colors for charts
const SESSION_CHART_COLORS: Record<TradingSession, string> = {
  sydney: 'hsl(var(--chart-1))',
  tokyo: 'hsl(var(--chart-2))',
  london: 'hsl(var(--chart-3))',
  new_york: 'hsl(var(--chart-4))',
  other: 'hsl(var(--muted-foreground))',
};

export function SessionPerformanceChart({ bySession }: SessionPerformanceChartProps) {
  const { formatPnl } = useCurrencyConversion();
  
  // Transform data for chart
  const chartData = useMemo(() => {
    return SESSION_ORDER.map(session => ({
      session,
      name: SESSION_LABELS[session],
      winRate: bySession[session].winRate,
      totalPnl: bySession[session].totalPnl,
      trades: bySession[session].trades,
      avgPnl: bySession[session].avgPnl,
      profitFactor: bySession[session].profitFactor,
      localTimeRange: formatSessionTimeLocal(session),
    }));
  }, [bySession]);

  // Find best and worst sessions
  const { bestSession, worstSession } = useMemo(() => {
    const sessionsWithTrades = SESSION_ORDER.filter(s => bySession[s].trades >= 3);
    
    if (sessionsWithTrades.length === 0) {
      return { bestSession: null, worstSession: null };
    }

    let best = sessionsWithTrades[0];
    let worst = sessionsWithTrades[0];

    sessionsWithTrades.forEach(session => {
      if (bySession[session].winRate > bySession[best].winRate) {
        best = session;
      }
      if (bySession[session].winRate < bySession[worst].winRate) {
        worst = session;
      }
    });

    return { bestSession: best, worstSession: worst };
  }, [bySession]);

  // Total trades across all sessions
  const totalTrades = useMemo(() => 
    SESSION_ORDER.reduce((sum, s) => sum + bySession[s].trades, 0),
    [bySession]
  );

  if (totalTrades < 5) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Performance
          </CardTitle>
          <CardDescription>Performance breakdown by trading session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Need at least 5 trades to analyze session performance</p>
            <p className="text-sm mt-2">Current: {totalTrades} trades</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Performance
              <InfoTooltip content="Trading sessions are determined by UTC time and displayed in your local timezone. Sydney (21:00-06:00 UTC), Tokyo (00:00-09:00 UTC), London (07:00-16:00 UTC), New York (12:00-21:00 UTC)." />
            </CardTitle>
            <CardDescription>Win rate and P&L by trading session (your local time)</CardDescription>
          </div>
          <div className="flex gap-2">
            {bestSession && (
              <Badge className="bg-profit/10 text-profit border-profit/30">
                <Trophy className="h-3 w-3 mr-1" />
                Best: {SESSION_LABELS[bestSession]}
              </Badge>
            )}
            {worstSession && worstSession !== bestSession && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Worst: {SESSION_LABELS[worstSession]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Win Rate Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                tickFormatter={(v) => `${v}%`}
                className="text-xs"
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                className="text-xs"
              />
              <RechartsTooltip 
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  'Win Rate'
                ]}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data ? `${label} (${data.localTimeRange})` : label;
                }}
              />
              <Bar dataKey="winRate" radius={4}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={SESSION_CHART_COLORS[entry.session]}
                    opacity={entry.trades < 3 ? 0.4 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Session Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {chartData.map((data) => (
            <div 
              key={data.session}
              className={`p-4 rounded-lg border ${data.trades < 3 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={SESSION_COLORS[data.session]}>
                    {data.name}
                  </Badge>
                </div>
                {data.totalPnl >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-profit" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-loss" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help">Time (Local)</span>
                  </TooltipTrigger><TooltipContent>Trading session hours converted to your local timezone from UTC.</TooltipContent></Tooltip></TooltipProvider>
                  <span className="font-medium">{data.localTimeRange}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trades</span>
                  <span className="font-medium">{data.trades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="font-medium">{formatWinRate(data.winRate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total P&L</span>
                  <span className={`font-medium ${data.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(data.totalPnl)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg P&L</span>
                  <span className={`font-medium ${data.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(data.avgPnl)}
                  </span>
                </div>
              </div>

              {data.trades >= 3 && (
                <Progress 
                  value={data.winRate} 
                  className="h-1.5 mt-3" 
                />
              )}
              {data.trades < 3 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Need 3+ trades
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
