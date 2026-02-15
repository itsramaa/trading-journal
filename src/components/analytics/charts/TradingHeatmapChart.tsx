/**
 * TradingHeatmapChart - Time-based win rate visualization
 * Shows performance patterns by hour of day and day of week
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";
import { Clock, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatWinRate } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { parseISO, getHours, getDay } from "date-fns";
import { getSessionForTime, SESSION_LABELS, type TradingSession } from "@/lib/session-utils";

interface TradeWithTime {
  id: string;
  pnl: number | null;
  realized_pnl?: number | null;
  result: string | null;
  entry_datetime?: string | null;
  trade_date: string;
}

interface TradingHeatmapChartProps {
  trades: TradeWithTime[];
}

interface TimeMetrics {
  label: string;
  winRate: number;
  tradeCount: number;
  totalPnl: number;
  avgPnl: number;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HOUR_LABELS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

// Session label map aligned with database values
const SESSION_LABEL_MAP: Record<TradingSession, string> = {
  sydney: `${SESSION_LABELS.sydney} Session`,
  tokyo: `${SESSION_LABELS.tokyo} Session`,
  london: `${SESSION_LABELS.london} Session`,
  new_york: `${SESSION_LABELS.new_york} Session`,
  other: SESSION_LABELS.other,
};

export function TradingHeatmapChart({ trades }: TradingHeatmapChartProps) {
  const { formatPnl } = useCurrencyConversion();
  const [activeTab, setActiveTab] = useState<'hourly' | 'daily' | 'session'>('daily');

  const metrics = useMemo(() => {
    // Initialize buckets
    const hourlyBuckets: Record<number, { wins: number; total: number; pnl: number }> = {};
    const dailyBuckets: Record<number, { wins: number; total: number; pnl: number }> = {};
    const sessionBuckets: Record<TradingSession, { wins: number; total: number; pnl: number }> = {
      sydney: { wins: 0, total: 0, pnl: 0 },
      tokyo: { wins: 0, total: 0, pnl: 0 },
      london: { wins: 0, total: 0, pnl: 0 },
      new_york: { wins: 0, total: 0, pnl: 0 },
      other: { wins: 0, total: 0, pnl: 0 },
    };

    for (let i = 0; i < 24; i++) hourlyBuckets[i] = { wins: 0, total: 0, pnl: 0 };
    for (let i = 0; i < 7; i++) dailyBuckets[i] = { wins: 0, total: 0, pnl: 0 };

    trades.forEach(trade => {
      const dateStr = trade.entry_datetime || trade.trade_date;
      if (!dateStr) return;

      try {
        const date = parseISO(dateStr);
        const hour = getHours(date);
        const day = getDay(date);
        const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
        const isWin = trade.result === 'win' || pnl > 0;

        // Hourly
        hourlyBuckets[hour].total++;
        if (isWin) hourlyBuckets[hour].wins++;
        hourlyBuckets[hour].pnl += pnl;

        // Daily
        dailyBuckets[day].total++;
        if (isWin) dailyBuckets[day].wins++;
        dailyBuckets[day].pnl += pnl;

        // Session - use UTC-based session detection
        const session = getSessionForTime(date);

        sessionBuckets[session].total++;
        if (isWin) sessionBuckets[session].wins++;
        sessionBuckets[session].pnl += pnl;
      } catch {
        // Skip invalid dates
      }
    });

    // Build chart data
    const hourlyData: TimeMetrics[] = HOUR_LABELS.map((label, i) => ({
      label,
      winRate: hourlyBuckets[i].total > 0 
        ? (hourlyBuckets[i].wins / hourlyBuckets[i].total) * 100 : 0,
      tradeCount: hourlyBuckets[i].total,
      totalPnl: hourlyBuckets[i].pnl,
      avgPnl: hourlyBuckets[i].total > 0 
        ? hourlyBuckets[i].pnl / hourlyBuckets[i].total : 0,
    }));

    const dailyData: TimeMetrics[] = DAYS_OF_WEEK.map((label, i) => ({
      label,
      winRate: dailyBuckets[i].total > 0 
        ? (dailyBuckets[i].wins / dailyBuckets[i].total) * 100 : 0,
      tradeCount: dailyBuckets[i].total,
      totalPnl: dailyBuckets[i].pnl,
      avgPnl: dailyBuckets[i].total > 0 
        ? dailyBuckets[i].pnl / dailyBuckets[i].total : 0,
    }));

    // Include main sessions (exclude 'other' from chart for cleaner view)
    const sessionData: TimeMetrics[] = (['sydney', 'tokyo', 'london', 'new_york'] as TradingSession[]).map(key => ({
      label: SESSION_LABEL_MAP[key],
      winRate: sessionBuckets[key].total > 0 ? (sessionBuckets[key].wins / sessionBuckets[key].total) * 100 : 0,
      tradeCount: sessionBuckets[key].total,
      totalPnl: sessionBuckets[key].pnl,
      avgPnl: sessionBuckets[key].total > 0 ? sessionBuckets[key].pnl / sessionBuckets[key].total : 0,
    }));

    // Find best/worst
    const findBestWorst = (data: TimeMetrics[]) => {
      const withTrades = data.filter(d => d.tradeCount >= 2);
      if (withTrades.length === 0) return { best: null, worst: null };
      
      const best = withTrades.reduce((a, b) => a.winRate > b.winRate ? a : b);
      const worst = withTrades.reduce((a, b) => a.winRate < b.winRate ? a : b);
      return { best, worst };
    };

    return {
      hourlyData,
      dailyData,
      sessionData,
      hourlyBestWorst: findBestWorst(hourlyData),
      dailyBestWorst: findBestWorst(dailyData),
      sessionBestWorst: findBestWorst(sessionData),
    };
  }, [trades]);

  const getBarColor = (winRate: number) => {
    if (winRate >= 60) return 'hsl(var(--chart-2))'; // Green
    if (winRate >= 50) return 'hsl(var(--chart-3))'; // Yellow
    if (winRate >= 40) return 'hsl(var(--chart-4))'; // Orange
    return 'hsl(var(--chart-5))'; // Red
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as TimeMetrics;

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{data.label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Win Rate:</span>
            <span className={cn(
              "font-medium",
              data.winRate >= 50 ? 'text-profit' : 'text-loss'
            )}>
              {formatWinRate(data.winRate)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Trades:</span>
            <span className="font-medium">{data.tradeCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total P&L:</span>
            <span className={cn(
              "font-medium",
              data.totalPnl >= 0 ? 'text-profit' : 'text-loss'
            )}>
              {formatPnl(data.totalPnl)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Avg P&L:</span>
            <span className={cn(
              "font-medium",
              data.avgPnl >= 0 ? 'text-profit' : 'text-loss'
            )}>
              {formatPnl(data.avgPnl)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (data: TimeMetrics[], height: number = 200) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="label" 
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
          interval={activeTab === 'hourly' ? 2 : 0}
        />
        <YAxis 
          domain={[0, 100]}
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
          tickFormatter={(v) => `${v}%`}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <ReferenceLine 
          y={50} 
          stroke="hsl(var(--muted-foreground))" 
          strokeDasharray="5 5"
          label={{ value: '50%', position: 'right', fontSize: 10 }}
        />
        <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.tradeCount > 0 ? getBarColor(entry.winRate) : 'hsl(var(--muted))'}
              opacity={entry.tradeCount > 0 ? 1 : 0.3}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderInsight = (bestWorst: { best: TimeMetrics | null; worst: TimeMetrics | null }) => {
    if (!bestWorst.best && !bestWorst.worst) {
      return (
        <p className="text-xs text-muted-foreground">
          Need more trades (min 2 per period) to show insights
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {bestWorst.best && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-profit/10 text-profit text-xs">
            <TrendingUp className="h-3 w-3" />
            <span>Best: {bestWorst.best.label} ({formatWinRate(bestWorst.best.winRate)})</span>
          </div>
        )}
        {bestWorst.worst && bestWorst.worst.label !== bestWorst.best?.label && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-loss/10 text-loss text-xs">
            <TrendingDown className="h-3 w-3" />
            <span>Worst: {bestWorst.worst.label} ({formatWinRate(bestWorst.worst.winRate)})</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card role="region" aria-label="Time-based trading win rate heatmap">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            Time-Based Win Rate
            <InfoTooltip content="Analyzes when you trade best by showing win rate by day of week, hour of day, and trading session." />
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {trades.length} trades
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <TabsTrigger value="daily" className="text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                By Day
              </TabsTrigger>
            </TooltipTrigger><TooltipContent>Win rate grouped by day of the week (Mon–Sun).</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <TabsTrigger value="hourly" className="text-xs">
                <Clock className="h-3.5 w-3.5 mr-1" />
                By Hour
              </TabsTrigger>
            </TooltipTrigger><TooltipContent>Win rate grouped by hour of the day (00:00–23:00).</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <TabsTrigger value="session" className="text-xs">
                Session
              </TabsTrigger>
            </TooltipTrigger><TooltipContent>Win rate grouped by market session (Sydney, Tokyo, London, NY).</TooltipContent></Tooltip></TooltipProvider>
          </TabsList>

          <TabsContent value="daily" className="space-y-3 mt-4">
            {renderChart(metrics.dailyData, 180)}
            {renderInsight(metrics.dailyBestWorst)}
          </TabsContent>

          <TabsContent value="hourly" className="space-y-3 mt-4">
            {renderChart(metrics.hourlyData, 180)}
            {renderInsight(metrics.hourlyBestWorst)}
          </TabsContent>

          <TabsContent value="session" className="space-y-3 mt-4">
            {renderChart(metrics.sessionData, 180)}
            {renderInsight(metrics.sessionBestWorst)}
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 border-t cursor-help">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                  <span>≥60%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
                  <span>50-59%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
                  <span>40-49%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-5))' }} />
                  <span>&lt;40%</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Green (60%+) = strong edge, Yellow (50-59%) = edge, Orange (40-49%) = weak, Red (&lt;40%) = avoid.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
