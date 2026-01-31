/**
 * Drawdown Chart - Shows equity drawdown over time
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { format } from "date-fns";
import { formatPercentUnsigned } from "@/lib/formatters";

export function DrawdownChart() {
  const { data: trades } = useTradeEntries();

  const drawdownData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Sort trades by date
    const sortedTrades = [...trades]
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

    if (sortedTrades.length === 0) return [];

    // Calculate cumulative P&L and drawdown
    let cumulative = 0;
    let peak = 0;
    
    return sortedTrades.map((trade) => {
      const pnl = trade.realized_pnl || trade.pnl || 0;
      cumulative += pnl;
      
      // Update peak
      if (cumulative > peak) {
        peak = cumulative;
      }
      
      // Calculate drawdown
      const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
      
      return {
        date: format(new Date(trade.trade_date), 'MMM d'),
        fullDate: trade.trade_date,
        cumulative,
        peak,
        drawdown: -drawdown, // Negative for visual representation
        drawdownPercent: drawdown,
      };
    });
  }, [trades]);

  const maxDrawdown = useMemo(() => {
    if (drawdownData.length === 0) return 0;
    return Math.max(...drawdownData.map(d => d.drawdownPercent));
  }, [drawdownData]);

  if (!trades || trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Drawdown Chart</CardTitle>
          <CardDescription>Track your equity drawdown over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No trade data available</p>
            <p className="text-sm">Start logging trades to see drawdown analysis</p>
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
            <CardTitle>Drawdown Chart</CardTitle>
            <CardDescription>Track your equity drawdown over time</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Max Drawdown</p>
            <p className="text-xl font-bold text-loss">-{formatPercentUnsigned(maxDrawdown)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                domain={['auto', 0]}
              />
              <Tooltip 
                formatter={(value: number) => [`${Math.abs(value).toFixed(2)}%`, 'Drawdown']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Area 
                type="monotone" 
                dataKey="drawdown" 
                stroke="hsl(var(--destructive))" 
                fill="hsl(var(--destructive)/0.2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
