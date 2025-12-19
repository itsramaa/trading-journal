import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { PerformanceDataPoint } from "@/types/portfolio";
import { useAppStore, convertCurrency } from "@/store/app-store";
import { format } from "date-fns";

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  onPeriodChange?: (period: string) => void;
  isLoading?: boolean;
}

const periods = ['1M', '3M', '1Y', 'ALL'] as const;

export function PerformanceChart({ data, onPeriodChange, isLoading }: PerformanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1Y');
  const { currency, exchangeRate } = useAppStore();

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  const formatCurrencyValue = (value: number) => {
    const converted = currency === 'IDR' ? convertCurrency(value, 'USD', 'IDR', exchangeRate) : value;
    const symbol = currency === 'IDR' ? 'Rp' : '$';
    
    if (converted >= 1000000000) return `${symbol}${(converted / 1000000000).toFixed(1)}B`;
    if (converted >= 1000000) return `${symbol}${(converted / 1000000).toFixed(1)}M`;
    if (converted >= 1000) return `${symbol}${(converted / 1000).toFixed(0)}K`;
    return `${symbol}${converted.toFixed(0)}`;
  };

  const isPositive = data.length > 1 && data[data.length - 1].value >= data[0].value;
  
  // Format date labels based on period
  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (selectedPeriod === '1M') {
        return format(date, 'MMM d');
      } else if (selectedPeriod === '3M') {
        return format(date, 'MMM d');
      } else {
        return format(date, 'MMM');
      }
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Portfolio value over time</p>
        </div>
        <div className="flex gap-1">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                selectedPeriod === period ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[240px] w-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No historical data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                dy={10}
                tickFormatter={formatDateLabel}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                tickFormatter={formatCurrencyValue} 
                dx={-5} 
                width={55} 
              />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">{formatDateLabel(label)}</p>
                  <p className="text-sm font-semibold">{formatCurrencyValue(payload[0].value as number)}</p>
                </div>
              ) : null} />
              <Area type="monotone" dataKey="value" stroke={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} strokeWidth={2} fill="url(#performanceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
