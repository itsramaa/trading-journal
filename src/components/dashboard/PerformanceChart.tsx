import { useState, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PerformanceDataPoint, TimePeriod } from "@/types/portfolio";
import { useAppStore, convertCurrency } from "@/store/app-store";
import { getPerformanceData } from "@/lib/demo-data";

interface PerformanceChartProps {
  initialPeriod?: TimePeriod;
  marketFilter?: string;
  onPeriodChange?: (period: TimePeriod) => void;
  onMarketFilterChange?: (market: string) => void;
}

const periods: TimePeriod[] = ['24H', '7D', '1M', '1Y', 'ALL'];
const markets = ['All Markets', 'CRYPTO', 'US', 'ID'];

export function PerformanceChart({ 
  initialPeriod = '1Y',
  marketFilter = 'All Markets',
  onPeriodChange,
  onMarketFilterChange 
}: PerformanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(initialPeriod);
  const [selectedMarket, setSelectedMarket] = useState(marketFilter);
  const { currency, exchangeRate } = useAppStore();

  // Get data based on selected period
  const data = useMemo(() => {
    return getPerformanceData(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  const handleMarketChange = (market: string) => {
    setSelectedMarket(market);
    onMarketFilterChange?.(market);
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
    // Handle different date formats
    if (dateStr.includes('-')) {
      // Format: 2024-01 or Dec 12
      const parts = dateStr.split('-');
      if (parts.length === 2 && parts[0].length === 4) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[parseInt(parts[1]) - 1] || dateStr;
      }
    }
    return dateStr;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Portfolio value over time</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Market Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Filter className="h-3 w-3" />
                {selectedMarket === 'All Markets' ? 'All' : selectedMarket}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {markets.map((market) => (
                <DropdownMenuItem
                  key={market}
                  onClick={() => handleMarketChange(market)}
                  className={cn(selectedMarket === market && "bg-muted")}
                >
                  {market}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Period Selector */}
          <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-md transition-colors",
                  selectedPeriod === period 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-[240px] w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No historical data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? "hsl(var(--profit))" : "hsl(var(--loss))"} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={isPositive ? "hsl(var(--profit))" : "hsl(var(--loss))"} stopOpacity={0} />
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
                <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">{formatDateLabel(label)}</p>
                  <p className="text-sm font-semibold font-mono-numbers">{formatCurrencyValue(payload[0].value as number)}</p>
                </div>
              ) : null} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isPositive ? "hsl(var(--profit))" : "hsl(var(--loss))"} 
                strokeWidth={2} 
                fill="url(#performanceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
