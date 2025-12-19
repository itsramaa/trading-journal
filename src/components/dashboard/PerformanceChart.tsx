import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { PerformanceDataPoint } from "@/types/portfolio";

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const isPositive = data.length > 1 && data[data.length - 1].value >= data[0].value;
  
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Portfolio value over time</p>
        </div>
        <div className="flex gap-1">
          {['1M', '3M', '1Y', 'ALL'].map((period) => (
            <button
              key={period}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                period === '1Y' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0.2} />
                <stop offset="100%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={formatCurrency} dx={-5} width={55} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-semibold">{formatCurrency(payload[0].value as number)}</p>
              </div>
            ) : null} />
            <Area type="monotone" dataKey="value" stroke={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} strokeWidth={2} fill="url(#performanceGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
