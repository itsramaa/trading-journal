import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { BarChart3, Sparkles } from "lucide-react";
import { detectStreakZones, detectMilestones, type CurveDataPoint } from "@/lib/equity-annotations";

interface EquityCurveChartProps {
  initialBalance?: number;
  className?: string;
}

export function EquityCurveChart({ initialBalance = 0, className }: EquityCurveChartProps) {
  const { data: trades = [] } = useModeFilteredTrades();
  const { format: formatCurrency } = useCurrencyConversion();
  const [showAnnotations, setShowAnnotations] = useState(true);

  const { curveData, maxDrawdown, maxDrawdownPercent, peakBalance, currentBalance } = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.status === "closed")
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

    if (sorted.length === 0) {
      return { curveData: [] as CurveDataPoint[], maxDrawdown: 0, maxDrawdownPercent: 0, peakBalance: 0, currentBalance: 0 };
    }

    let balance = initialBalance;
    let peak = balance;
    let maxDd = 0;
    let maxDdPercent = 0;

    const data: CurveDataPoint[] = sorted.map((trade) => {
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      balance += pnl;
      if (balance > peak) peak = balance;
      const drawdown = peak - balance;
      const ddPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      if (drawdown > maxDd) {
        maxDd = drawdown;
        maxDdPercent = ddPercent;
      }
      return { date: trade.trade_date, balance, drawdown: -drawdown, pnl };
    });

    return { curveData: data, maxDrawdown: maxDd, maxDrawdownPercent: maxDdPercent, peakBalance: peak, currentBalance: balance };
  }, [trades, initialBalance]);

  const { streakZones, milestones } = useMemo(() => {
    if (curveData.length === 0) return { streakZones: [], milestones: [] };
    return {
      streakZones: detectStreakZones(curveData),
      milestones: detectMilestones(curveData, initialBalance),
    };
  }, [curveData, initialBalance]);

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
            <Button
              variant={showAnnotations ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => setShowAnnotations(!showAnnotations)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Annotations
            </Button>
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
        <div className="h-[280px]" role="img" aria-label={`Equity curve chart showing balance of ${formatCurrency(currentBalance)} with ${maxDrawdownPercent.toFixed(1)}% max drawdown over ${curveData.length} trades`}>
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

              {/* AI Annotations: Streak Zones */}
              {showAnnotations && streakZones.map((zone, i) => (
                <ReferenceArea
                  key={`zone-${i}`}
                  x1={curveData[zone.startIndex]?.date}
                  x2={curveData[zone.endIndex]?.date}
                  fill={zone.type === 'win' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
                  stroke={zone.type === 'win' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                  strokeDasharray="3 3"
                  label={{ value: zone.label, position: 'insideTop', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
              ))}

              {/* AI Annotations: Milestones */}
              {showAnnotations && milestones.map((m, i) => (
                <ReferenceDot
                  key={`ms-${i}`}
                  x={curveData[m.index]?.date}
                  y={m.value}
                  r={5}
                  fill={m.type === 'ath' ? 'hsl(var(--primary))' : m.type === 'max_dd' ? 'hsl(var(--destructive))' : 'hsl(var(--chart-4))'}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  label={{ value: m.label, position: m.type === 'max_dd' ? 'insideBottomRight' : 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
              ))}

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
        <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t" role="group" aria-label="Equity curve summary statistics">
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
