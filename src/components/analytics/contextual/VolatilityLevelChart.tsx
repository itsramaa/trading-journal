/**
 * Volatility Level Performance Chart
 * Bar chart visualization of win rate per volatility level
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { PerformanceMetrics, VolatilityLevel } from "@/hooks/use-contextual-analytics";
import { cn } from "@/lib/utils";
import { formatWinRate } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface VolatilityLevelChartProps {
  byVolatility: Record<VolatilityLevel, PerformanceMetrics>;
}

const VOLATILITY_CONFIG: Record<VolatilityLevel, { 
  label: string; 
  description: string; 
  color: string;
  icon: typeof Activity;
}> = {
  low: { 
    label: 'Low', 
    description: 'Calm market conditions',
    color: 'hsl(142, 76%, 36%)', // green
    icon: TrendingDown,
  },
  medium: { 
    label: 'Medium', 
    description: 'Normal volatility',
    color: 'hsl(var(--primary))', // primary/blue
    icon: Minus,
  },
  high: { 
    label: 'High', 
    description: 'Elevated volatility',
    color: 'hsl(var(--destructive))', // red
    icon: TrendingUp,
  },
};

const LEVELS_ORDER: VolatilityLevel[] = ['low', 'medium', 'high'];

export function VolatilityLevelChart({ byVolatility }: VolatilityLevelChartProps) {
  const { format: formatCurrency } = useCurrencyConversion();
  // Transform data for chart
  const chartData = LEVELS_ORDER.map(level => ({
    level,
    label: VOLATILITY_CONFIG[level].label,
    description: VOLATILITY_CONFIG[level].description,
    winRate: byVolatility[level].winRate,
    trades: byVolatility[level].trades,
    wins: byVolatility[level].wins,
    losses: byVolatility[level].losses,
    totalPnl: byVolatility[level].totalPnl,
    avgPnl: byVolatility[level].avgPnl,
    profitFactor: byVolatility[level].profitFactor,
    color: VOLATILITY_CONFIG[level].color,
  }));
  
  const totalTrades = chartData.reduce((sum, d) => sum + d.trades, 0);
  
  // Find best and worst levels (min 3 trades)
  const validLevels = chartData.filter(d => d.trades >= 3);
  const bestLevel = validLevels.length > 0 
    ? validLevels.reduce((a, b) => a.winRate > b.winRate ? a : b) 
    : null;
  const worstLevel = validLevels.length > 0 
    ? validLevels.reduce((a, b) => a.winRate < b.winRate ? a : b) 
    : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="font-medium">{data.label} Volatility</p>
        <p className="text-xs text-muted-foreground mb-2">{data.description}</p>
        <div className="space-y-1 text-sm">
          <p>
            Win Rate: <span className={cn("font-medium", data.winRate >= 50 ? "text-profit" : "text-loss")}>
              {formatWinRate(data.winRate)}
            </span>
          </p>
          <p className="text-muted-foreground">{data.trades} trades ({data.wins}W / {data.losses}L)</p>
          <p className={cn("font-medium", data.totalPnl >= 0 ? "text-profit" : "text-loss")}>
            P&L: {formatCurrency(data.totalPnl)}
          </p>
          <p className="text-muted-foreground">
            Avg: {formatCurrency(data.avgPnl)} | PF: {data.profitFactor.toFixed(2)}
          </p>
        </div>
      </div>
    );
  };

  if (totalTrades === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Win Rate by Volatility
          </CardTitle>
          <CardDescription>No trades with volatility data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <Activity className="h-8 w-8 mr-2 opacity-50" />
            Complete trades with market context to see this chart
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
              <Activity className="h-5 w-5" />
              Win Rate by Volatility
              <InfoTooltip content="Shows your win rate performance across different volatility conditions (ATR-based). The 50% reference line helps identify where you have an edge." />
            </CardTitle>
            <CardDescription>
              Performance breakdown by market volatility level
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {bestLevel && bestLevel.winRate >= 50 && (
              <Badge variant="outline" className="border-profit text-profit">
                Best: {bestLevel.label} ({formatWinRate(bestLevel.winRate)})
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={50} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3" 
                label={{ 
                  value: '50%', 
                  position: 'right',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
              <Bar 
                dataKey="winRate" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.trades > 0 ? entry.color : 'hsl(var(--muted))'}
                    opacity={entry.trades >= 3 ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Trade Count Legend */}
        <div className="flex justify-center gap-8 mt-4 pt-3 border-t">
          {chartData.map((data, index) => {
            const Icon = VOLATILITY_CONFIG[data.level].icon;
            return (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{data.label}</p>
                </div>
                <p className={cn(
                  "text-sm font-medium",
                  data.trades >= 3 ? "text-foreground" : "text-muted-foreground"
                )}>
                  {data.trades} trades
                </p>
              </div>
            );
          })}
        </div>
        
        {/* Insights */}
        {bestLevel && worstLevel && bestLevel.level !== worstLevel.level && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm">
              <span className="font-medium">Key Insight:</span>{' '}
              {bestLevel.winRate - worstLevel.winRate > 15 ? (
                <>
                  You perform <span className="text-profit font-medium">{Math.round(bestLevel.winRate - worstLevel.winRate)}% better</span> in{' '}
                  {bestLevel.label} volatility vs {worstLevel.label} volatility.
                  {worstLevel.level === 'high' && (
                    <> Consider reducing position sizes during high volatility.</>
                  )}
                </>
              ) : (
                <>
                  Your performance is relatively consistent across volatility levels 
                  (range: {formatWinRate(worstLevel.winRate)} - {formatWinRate(bestLevel.winRate)}).
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
