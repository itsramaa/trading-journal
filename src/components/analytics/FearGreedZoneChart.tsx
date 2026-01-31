/**
 * Fear/Greed Zone Performance Chart
 * Bar chart visualization of win rate per Fear/Greed zone
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TrendingUp, Activity } from "lucide-react";
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
import type { PerformanceMetrics, FearGreedZone } from "@/hooks/use-contextual-analytics";
import { cn } from "@/lib/utils";

interface FearGreedZoneChartProps {
  byFearGreed: Record<FearGreedZone, PerformanceMetrics>;
}

const ZONE_CONFIG: Record<FearGreedZone, { label: string; shortLabel: string; color: string; range: string }> = {
  extremeFear: { label: 'Extreme Fear', shortLabel: 'Ext. Fear', color: 'hsl(var(--destructive))', range: '0-20' },
  fear: { label: 'Fear', shortLabel: 'Fear', color: 'hsl(25, 95%, 53%)', range: '21-40' },
  neutral: { label: 'Neutral', shortLabel: 'Neutral', color: 'hsl(var(--muted-foreground))', range: '41-60' },
  greed: { label: 'Greed', shortLabel: 'Greed', color: 'hsl(142, 76%, 36%)', range: '61-80' },
  extremeGreed: { label: 'Extreme Greed', shortLabel: 'Ext. Greed', color: 'hsl(var(--profit))', range: '81-100' },
};

const ZONES_ORDER: FearGreedZone[] = ['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed'];

export function FearGreedZoneChart({ byFearGreed }: FearGreedZoneChartProps) {
  // Transform data for chart
  const chartData = ZONES_ORDER.map(zone => ({
    zone,
    label: ZONE_CONFIG[zone].shortLabel,
    fullLabel: ZONE_CONFIG[zone].label,
    range: ZONE_CONFIG[zone].range,
    winRate: byFearGreed[zone].winRate,
    trades: byFearGreed[zone].trades,
    wins: byFearGreed[zone].wins,
    losses: byFearGreed[zone].losses,
    totalPnl: byFearGreed[zone].totalPnl,
    color: ZONE_CONFIG[zone].color,
  }));
  
  const totalTrades = chartData.reduce((sum, d) => sum + d.trades, 0);
  
  // Find best and worst zones (min 3 trades)
  const validZones = chartData.filter(d => d.trades >= 3);
  const bestZone = validZones.length > 0 
    ? validZones.reduce((a, b) => a.winRate > b.winRate ? a : b) 
    : null;
  const worstZone = validZones.length > 0 
    ? validZones.reduce((a, b) => a.winRate < b.winRate ? a : b) 
    : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <p className="font-medium">{data.fullLabel}</p>
        <p className="text-xs text-muted-foreground mb-2">F&G Index: {data.range}</p>
        <div className="space-y-1 text-sm">
          <p>
            Win Rate: <span className={cn("font-medium", data.winRate >= 50 ? "text-profit" : "text-loss")}>
              {data.winRate.toFixed(1)}%
            </span>
          </p>
          <p className="text-muted-foreground">{data.trades} trades ({data.wins}W / {data.losses}L)</p>
          <p className={cn("font-medium", data.totalPnl >= 0 ? "text-profit" : "text-loss")}>
            P&L: ${data.totalPnl.toFixed(2)}
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
            <TrendingUp className="h-5 w-5" />
            Win Rate by Fear/Greed Zone
          </CardTitle>
          <CardDescription>No trades with Fear/Greed data available</CardDescription>
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
              <TrendingUp className="h-5 w-5" />
              Win Rate by Fear/Greed Zone
              <InfoTooltip content="Shows your win rate performance across different market sentiment zones. The 50% reference line helps identify where you have an edge." />
            </CardTitle>
            <CardDescription>
              Performance breakdown by market sentiment index (0-100)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {bestZone && bestZone.winRate >= 50 && (
              <Badge variant="outline" className="border-profit text-profit">
                Best: {bestZone.fullLabel} ({bestZone.winRate.toFixed(0)}%)
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
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
                maxBarSize={50}
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
        <div className="flex justify-center gap-4 mt-4 pt-3 border-t">
          {chartData.map((data, index) => (
            <div key={index} className="text-center">
              <p className="text-xs text-muted-foreground">{data.label}</p>
              <p className={cn(
                "text-sm font-medium",
                data.trades >= 3 ? "text-foreground" : "text-muted-foreground"
              )}>
                {data.trades} trades
              </p>
            </div>
          ))}
        </div>
        
        {/* Insights */}
        {bestZone && worstZone && bestZone.zone !== worstZone.zone && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm">
              <span className="font-medium">Key Insight:</span>{' '}
              {bestZone.winRate - worstZone.winRate > 20 ? (
                <>
                  You perform <span className="text-profit font-medium">{(bestZone.winRate - worstZone.winRate).toFixed(0)}% better</span> in{' '}
                  {bestZone.fullLabel} markets vs {worstZone.fullLabel}.
                </>
              ) : (
                <>
                  Your performance is relatively consistent across sentiment zones 
                  (range: {worstZone.winRate.toFixed(0)}% - {bestZone.winRate.toFixed(0)}%).
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
