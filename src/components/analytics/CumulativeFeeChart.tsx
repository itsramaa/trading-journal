/**
 * Cumulative Fee Tracking Chart
 * Shows commission + funding fees accumulated over time
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { DollarSign } from "lucide-react";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface CumulativeFeeChartProps {
  trades: TradeEntry[];
  formatCurrency: (value: number) => string;
}

export function CumulativeFeeChart({ trades, formatCurrency }: CumulativeFeeChartProps) {
  const chartData = useMemo(() => {
    if (!trades.length) return [];

    // Sort by date ascending
    const sorted = [...trades]
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

    let cumulativeCommission = 0;
    let cumulativeFunding = 0;
    let cumulativeTotal = 0;
    let tradeCount = 0;

    return sorted.map((trade) => {
      const commission = Math.abs(trade.commission ?? 0);
      const funding = Math.abs((trade as any).funding_fees ?? 0);
      const fees = commission + funding;
      
      cumulativeCommission += commission;
      cumulativeFunding += funding;
      cumulativeTotal += fees;
      tradeCount += 1;

      return {
        date: trade.trade_date,
        dateLabel: format(new Date(trade.trade_date), 'MMM dd'),
        commission: Number(cumulativeCommission.toFixed(2)),
        funding: Number(cumulativeFunding.toFixed(2)),
        total: Number(cumulativeTotal.toFixed(2)),
        costPerTrade: Number((cumulativeTotal / tradeCount).toFixed(2)),
        tradeCount,
      };
    });
  }, [trades]);

  const latestData = chartData[chartData.length - 1];

  if (!chartData.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-chart-4" />
              Cumulative Fee Tracking
              <InfoTooltip content="Accumulated trading fees over time, broken down by commission and funding fees. Cost-per-trade shows average fee efficiency." />
            </CardTitle>
            <CardDescription>
              Total: {formatCurrency(latestData?.total ?? 0)} across {latestData?.tradeCount ?? 0} trades
              {' · '}Avg cost/trade: {formatCurrency(latestData?.costPerTrade ?? 0)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    commission: 'Commission',
                    funding: 'Funding Fees',
                    total: 'Total Fees',
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload?.[0]?.payload) {
                    const d = payload[0].payload;
                    return `${format(new Date(d.date), 'MMM dd, yyyy')} · Trade #${d.tradeCount} · Avg: ${formatCurrency(d.costPerTrade)}/trade`;
                  }
                  return label;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    commission: 'Commission',
                    funding: 'Funding Fees',
                    total: 'Total Fees',
                  };
                  return labels[value] || value;
                }}
              />
              <Area
                type="monotone"
                dataKey="commission"
                stackId="fees"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="funding"
                stackId="fees"
                stroke="hsl(var(--chart-4))"
                fill="hsl(var(--chart-4))"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--chart-2))"
                fill="none"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
