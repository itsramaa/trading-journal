import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface EquityCurveChartProps {
  initialBalance?: number;
  className?: string;
}

export function EquityCurveChart({ initialBalance = 0, className }: EquityCurveChartProps) {
  const { data: trades = [] } = useTradeEntries();
  const { format: formatCurrency } = useCurrencyConversion();

  const { curveData, maxDrawdown, maxDrawdownPercent, peakBalance, currentBalance } = useMemo(() => {
    // Sort by trade_date ascending
    const sorted = [...trades]
      .filter((t) => t.status === "closed")
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

    if (sorted.length === 0) {
      return { curveData: [], maxDrawdown: 0, maxDrawdownPercent: 0, peakBalance: 0, currentBalance: 0 };
    }

    let balance = initialBalance;
    let peak = balance;
    let maxDd = 0;
    let maxDdPercent = 0;

    const data = sorted.map((trade) => {
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      balance += pnl;
      if (balance > peak) peak = balance;
      const drawdown = peak - balance;
      const ddPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      if (drawdown > maxDd) {
        maxDd = drawdown;
        maxDdPercent = ddPercent;
      }
      return {
        date: trade.trade_date,
        balance,
        drawdown: -drawdown,
        pnl,
      };
    });

    return {
      curveData: data,
      maxDrawdown: maxDd,
      maxDrawdownPercent: maxDdPercent,
      peakBalance: peak,
      currentBalance: balance,
    };
  }, [trades, initialBalance]);

  if (curveData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Close at least one trade to see your equity curve.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isProfit = currentBalance >= initialBalance;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              Equity Curve
            </CardTitle>
            <CardDescription>{curveData.length} trades</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-sm font-semibold font-mono-numbers ${isProfit ? "text-profit" : "text-loss"}`}>
                {formatCurrency(currentBalance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Max Drawdown</p>
              <Badge variant="destructive" className="text-xs font-mono-numbers">
                {maxDrawdownPercent.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curveData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  try { return format(parseISO(v), "dd MMM"); } catch { return v; }
                }}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1">
                      <p className="font-medium">{format(parseISO(d.date), "dd MMM yyyy")}</p>
                      <p>Balance: <span className="font-mono-numbers">{formatCurrency(d.balance)}</span></p>
                      <p>Trade P&L: <span className={`font-mono-numbers ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                        {d.pnl >= 0 ? "+" : ""}{formatCurrency(d.pnl)}
                      </span></p>
                      {d.drawdown < 0 && (
                        <p>Drawdown: <span className="text-loss font-mono-numbers">{formatCurrency(d.drawdown)}</span></p>
                      )}
                    </div>
                  );
                }}
              />
              <ReferenceLine y={initialBalance} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#balanceGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="hsl(var(--destructive))"
                strokeWidth={1}
                fill="url(#drawdownGradient)"
                dot={false}
                strokeDasharray="3 3"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Summary stats row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Peak</p>
            <p className="text-sm font-semibold font-mono-numbers">{formatCurrency(peakBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Max Drawdown</p>
            <p className="text-sm font-semibold text-loss font-mono-numbers">
              -{formatCurrency(maxDrawdown)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={`text-sm font-semibold font-mono-numbers ${isProfit ? "text-profit" : "text-loss"}`}>
              {isProfit ? "+" : ""}{formatCurrency(currentBalance - initialBalance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
