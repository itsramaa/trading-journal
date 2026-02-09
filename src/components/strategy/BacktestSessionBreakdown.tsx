import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { Clock, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent, formatWinRate } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { 
  getSessionForTime, 
  SESSION_LABELS, 
  type TradingSession 
} from "@/lib/session-utils";
import type { BacktestTrade } from "@/types/backtest";

interface BacktestSessionBreakdownProps {
  trades: BacktestTrade[];
}

interface SessionStats {
  session: TradingSession;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

// Session colors using design tokens
const SESSION_CHART_COLORS: Record<TradingSession, string> = {
  sydney: 'hsl(var(--chart-1))',
  tokyo: 'hsl(var(--chart-2))',
  london: 'hsl(var(--chart-3))',
  new_york: 'hsl(var(--chart-4))',
  other: 'hsl(var(--muted-foreground))',
};

const SESSION_BG_COLORS: Record<TradingSession, string> = {
  sydney: 'bg-chart-1/10 border-chart-1/30',
  tokyo: 'bg-chart-2/10 border-chart-2/30',
  london: 'bg-chart-3/10 border-chart-3/30',
  new_york: 'bg-chart-4/10 border-chart-4/30',
  other: 'bg-muted border-muted',
};

export function BacktestSessionBreakdown({ trades }: BacktestSessionBreakdownProps) {
  const { format } = useCurrencyConversion();

  const sessionStats = useMemo(() => {
    // Group trades by session
    const sessionGroups: Record<TradingSession, BacktestTrade[]> = {
      sydney: [],
      tokyo: [],
      london: [],
      new_york: [],
      other: [],
    };

    trades.forEach(trade => {
      const session = getSessionForTime(trade.entryTime);
      sessionGroups[session].push(trade);
    });

    // Calculate stats for each session
    const stats: SessionStats[] = [];
    
    (Object.entries(sessionGroups) as [TradingSession, BacktestTrade[]][]).forEach(([session, sessionTrades]) => {
      if (sessionTrades.length === 0) return;

      const wins = sessionTrades.filter(t => t.pnl > 0);
      const losses = sessionTrades.filter(t => t.pnl < 0);
      const totalPnl = sessionTrades.reduce((sum, t) => sum + t.pnl, 0);
      const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
      const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

      stats.push({
        session,
        label: SESSION_LABELS[session],
        trades: sessionTrades.length,
        wins: wins.length,
        losses: losses.length,
        winRate: sessionTrades.length > 0 ? (wins.length / sessionTrades.length) * 100 : 0,
        totalPnl,
        avgPnl: sessionTrades.length > 0 ? totalPnl / sessionTrades.length : 0,
        avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
        avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      });
    });

    // Sort by total P&L descending
    return stats.sort((a, b) => b.totalPnl - a.totalPnl);
  }, [trades]);

  const totalTrades = trades.length;
  const bestSession = sessionStats[0];
  const worstSession = sessionStats[sessionStats.length - 1];

  // Data for pie chart
  const pieData = sessionStats.map(stat => ({
    name: stat.label,
    value: stat.trades,
    session: stat.session,
  }));

  // Data for bar chart
  const barData = sessionStats.map(stat => ({
    name: stat.label,
    pnl: stat.totalPnl,
    winRate: stat.winRate,
    trades: stat.trades,
    session: stat.session,
  }));

  if (sessionStats.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No trades to analyze
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Best Session */}
        {bestSession && (
          <Card className={cn("border", SESSION_BG_COLORS[bestSession.session])}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-profit" />
                <span className="text-sm font-medium">Best Session</span>
              </div>
              <p className="text-lg font-bold">{bestSession.label}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-profit font-mono">{format(bestSession.totalPnl)}</span>
                <span className="text-muted-foreground">{bestSession.trades} trades</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Active Session */}
        {sessionStats.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Most Active</span>
              </div>
              <p className="text-lg font-bold">
                {[...sessionStats].sort((a, b) => b.trades - a.trades)[0]?.label}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="font-mono">
                  {[...sessionStats].sort((a, b) => b.trades - a.trades)[0]?.trades} trades
                </span>
                <span className="text-muted-foreground">
                  {formatNumber(([...sessionStats].sort((a, b) => b.trades - a.trades)[0]?.trades / totalTrades) * 100, 0)}% of total
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Highest Win Rate Session */}
        {sessionStats.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Highest Win Rate</span>
              </div>
              <p className="text-lg font-bold">
                {[...sessionStats].sort((a, b) => b.winRate - a.winRate)[0]?.label}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="font-mono text-profit">
                  {formatWinRate([...sessionStats].sort((a, b) => b.winRate - a.winRate)[0]?.winRate || 0)}
                </span>
                <span className="text-muted-foreground">
                  {[...sessionStats].sort((a, b) => b.winRate - a.winRate)[0]?.wins}W / {[...sessionStats].sort((a, b) => b.winRate - a.winRate)[0]?.losses}L
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* P&L by Session Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">P&L by Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [format(value), 'P&L']}
                  />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.pnl >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trade Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={SESSION_CHART_COLORS[entry.session]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} trades`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Session Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessionStats.map((stat) => (
              <div 
                key={stat.session}
                className={cn(
                  "p-4 rounded-lg border",
                  SESSION_BG_COLORS[stat.session]
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-medium">
                      {stat.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {stat.trades} trades ({formatNumber((stat.trades / totalTrades) * 100, 0)}%)
                    </span>
                  </div>
                  <span className={cn(
                    "font-mono font-medium",
                    stat.totalPnl >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {stat.totalPnl >= 0 ? '+' : ''}{format(stat.totalPnl)}
                  </span>
                </div>

                {/* Win Rate Progress */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span>Win Rate</span>
                    <span className="font-mono">{formatWinRate(stat.winRate)}</span>
                  </div>
                  <Progress 
                    value={stat.winRate} 
                    className="h-2"
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Wins/Losses</span>
                    <p className="font-mono">
                      <span className="text-profit">{stat.wins}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-loss">{stat.losses}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg P&L</span>
                    <p className={cn(
                      "font-mono",
                      stat.avgPnl >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {format(stat.avgPnl)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Win</span>
                    <p className="font-mono text-profit">{format(stat.avgWin)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit Factor</span>
                    <p className="font-mono">
                      {stat.profitFactor === Infinity ? '∞' : formatNumber(stat.profitFactor, 2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
