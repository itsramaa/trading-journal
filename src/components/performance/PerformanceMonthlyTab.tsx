/**
 * Performance Monthly Tab - Monthly comparison metrics and rolling 30-day chart
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";

interface MonthlyStats {
  currentMonth: {
    netPnl: number;
    trades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
  };
  lastMonth: {
    trades: number;
  };
  change: {
    pnlPercent: number;
    winRateChange: number;
  };
  rolling30Days: { date: string; cumulative: number }[];
}

interface PerformanceMonthlyTabProps {
  monthlyStats: MonthlyStats;
  formatCurrency: (v: number) => string;
}

export function PerformanceMonthlyTab({ monthlyStats, formatCurrency }: PerformanceMonthlyTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">This Month P&L <InfoTooltip content="Net PnL from all closed trades in the current calendar month." /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyStats.currentMonth.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatCurrency(monthlyStats.currentMonth.netPnl)}
            </div>
            <p className="text-xs text-muted-foreground">
              vs last month: {monthlyStats.change.pnlPercent >= 0 ? '+' : ''}{monthlyStats.change.pnlPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">Monthly Trades <InfoTooltip content="Number of closed trades this month vs last month." /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats.currentMonth.trades}</div>
            <p className="text-xs text-muted-foreground">Last month: {monthlyStats.lastMonth.trades}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">Monthly Win Rate <InfoTooltip content="Win rate for the current month. 'pp' = percentage points difference from last month." /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats.currentMonth.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              vs last: {monthlyStats.change.winRateChange >= 0 ? '+' : ''}{monthlyStats.change.winRateChange.toFixed(1)}pp
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">Avg Win/Loss <InfoTooltip content="Average profit on winning trades and average loss on losing trades this month." /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              <span className="text-profit">{formatCurrency(monthlyStats.currentMonth.avgWin)}</span>
              {' / '}
              <span className="text-loss">-{formatCurrency(monthlyStats.currentMonth.avgLoss)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Rolling 30-Day P&L <InfoTooltip content="Cumulative PnL over the last 30 days showing trend direction and momentum." /></CardTitle>
          <CardDescription>Cumulative performance over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyStats.rolling30Days}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} className="text-xs" />
                <YAxis tickFormatter={formatCurrency} className="text-xs" />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Cumulative P&L']} />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  className="fill-primary/20 stroke-primary" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
