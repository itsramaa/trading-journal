/**
 * Trading Behavior Analytics
 * Shows: Average Trade Duration, Long/Short Ratio, Order Type Performance
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  Clock, 
  ArrowUpDown, 
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { TradeEntry } from "@/hooks/use-trade-entries";

// Extended fields available from DB but not in TradeEntry interface
type TradeWithExtras = TradeEntry & {
  hold_time_minutes?: number | null;
  entry_order_type?: string | null;
};

interface Props {
  trades: TradeEntry[];
}

// Helper to access extended DB fields
const asExtended = (t: TradeEntry) => t as unknown as TradeWithExtras;

interface DirectionStats {
  count: number;
  wins: number;
  pnl: number;
  winRate: number;
  percent: number;
}

interface OrderTypeStats {
  type: string;
  label: string;
  count: number;
  wins: number;
  winRate: number;
  pnl: number;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / 1440);
  const h = Math.round((minutes % 1440) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  'market': 'Market',
  'limit': 'Limit',
  'stop_market': 'Stop Market',
  'stop_limit': 'Stop Limit',
  'take_profit_market': 'TP Market',
  'trailing_stop_market': 'Trailing Stop',
};

export function TradingBehaviorAnalytics({ trades }: Props) {
  const { formatCompact } = useCurrencyConversion();

  const closedTrades = useMemo(() => 
    trades.filter(t => t.status === 'closed'), 
    [trades]
  );

  // === Average Trade Duration ===
  const durationStats = useMemo(() => {
    const withDuration = closedTrades.filter(t => {
      const ext = asExtended(t);
      return ext.hold_time_minutes && ext.hold_time_minutes > 0;
    });
    if (withDuration.length === 0) return null;

    const getDur = (t: TradeEntry) => asExtended(t).hold_time_minutes || 0;
    const total = withDuration.reduce((sum, t) => sum + getDur(t), 0);
    const avg = total / withDuration.length;
    const min = Math.min(...withDuration.map(getDur));
    const max = Math.max(...withDuration.map(getDur));

    // Median
    const sorted = [...withDuration.map(getDur)].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    return { avg, median, min, max, count: withDuration.length };
  }, [closedTrades]);

  // === Long/Short Ratio ===
  const directionStats = useMemo(() => {
    const longs = closedTrades.filter(t => t.direction?.toUpperCase() === 'LONG');
    const shorts = closedTrades.filter(t => t.direction?.toUpperCase() === 'SHORT');
    const total = closedTrades.length;
    if (total === 0) return null;

    const calcStats = (arr: TradeEntry[]): DirectionStats => ({
      count: arr.length,
      wins: arr.filter(t => t.result === 'win').length,
      pnl: arr.reduce((s, t) => s + (t.realized_pnl ?? t.pnl ?? 0), 0),
      winRate: arr.length > 0 ? (arr.filter(t => t.result === 'win').length / arr.length) * 100 : 0,
      percent: (arr.length / total) * 100,
    });

    return { long: calcStats(longs), short: calcStats(shorts) };
  }, [closedTrades]);

  // === Order Type Performance ===
  const orderTypeStats = useMemo(() => {
    const withOrderType = closedTrades.filter(t => asExtended(t).entry_order_type);
    if (withOrderType.length === 0) return null;

    const grouped = new Map<string, TradeEntry[]>();
    withOrderType.forEach(t => {
      const type = (asExtended(t).entry_order_type || '').toLowerCase();
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type)!.push(t);
    });

    const stats: OrderTypeStats[] = [];
    grouped.forEach((entries, type) => {
      const wins = entries.filter(t => t.result === 'win').length;
      stats.push({
        type,
        label: ORDER_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
        count: entries.length,
        wins,
        winRate: (wins / entries.length) * 100,
        pnl: entries.reduce((s, t) => s + (t.realized_pnl ?? t.pnl ?? 0), 0),
      });
    });

    return stats.sort((a, b) => b.count - a.count);
  }, [closedTrades]);

  // Show empty state card if no meaningful data
  if (!durationStats && !directionStats && !orderTypeStats) {
    return (
      <div className="space-y-4" role="region" aria-label="Trading behavior analytics">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Trading Behavior
        </h3>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No behavior data available</p>
              <p className="text-sm">Trade duration, direction ratio, and order type stats appear after closing trades.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Trading behavior analytics including duration, direction ratio, and order type performance">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Trading Behavior
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Average Trade Duration */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Avg Trade Duration
              <InfoTooltip content="Average time positions are held. Based on trades with recorded hold time." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {durationStats ? (
              <div className="space-y-3">
                <div className="text-2xl font-bold">{formatDuration(durationStats.avg)}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Median</span>
                    <div className="font-medium">{formatDuration(durationStats.median)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trades</span>
                    <div className="font-medium">{durationStats.count}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shortest</span>
                    <div className="font-medium">{formatDuration(durationStats.min)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Longest</span>
                    <div className="font-medium">{formatDuration(durationStats.max)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No duration data available</p>
            )}
          </CardContent>
        </Card>

        {/* Long/Short Ratio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              Long / Short Ratio
              <InfoTooltip content="Distribution and performance of long vs short trades. Helps identify directional bias." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {directionStats ? (
              <div className="space-y-3">
                {/* Visual ratio bar */}
                <div className="flex h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-profit transition-all" 
                    style={{ width: `${directionStats.long.percent}%` }}
                  />
                  <div 
                    className="bg-loss transition-all" 
                    style={{ width: `${directionStats.short.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-profit font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Long {directionStats.long.percent.toFixed(0)}%
                  </span>
                  <span className="text-loss font-medium flex items-center gap-1">
                    Short {directionStats.short.percent.toFixed(0)}%
                    <TrendingDown className="h-3 w-3" />
                  </span>
                </div>
                {/* Stats comparison */}
                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
                  <div>
                    <span className="text-muted-foreground">Long WR</span>
                    <div className="font-medium">{directionStats.long.winRate.toFixed(0)}%</div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Short WR</span>
                    <div className="font-medium">{directionStats.short.winRate.toFixed(0)}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Long P&L</span>
                    <div className={cn("font-medium", directionStats.long.pnl >= 0 ? "text-profit" : "text-loss")}>
                      {formatCompact(directionStats.long.pnl)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">Short P&L</span>
                    <div className={cn("font-medium", directionStats.short.pnl >= 0 ? "text-profit" : "text-loss")}>
                      {formatCompact(directionStats.short.pnl)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No trade data available</p>
            )}
          </CardContent>
        </Card>

        {/* Order Type Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Order Type Performance
              <InfoTooltip content="Performance breakdown by entry order type (Market, Limit, etc.)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderTypeStats && orderTypeStats.length > 0 ? (
              <div className="space-y-2">
                {orderTypeStats.slice(0, 4).map((ot) => (
                  <div key={ot.type} className="flex items-center justify-between text-xs p-2 rounded-md border">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {ot.label}
                      </Badge>
                      <span className="text-muted-foreground">{ot.count} trades</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">WR {ot.winRate.toFixed(0)}%</span>
                      <span className={cn("font-medium min-w-[60px] text-right", ot.pnl >= 0 ? "text-profit" : "text-loss")}>
                        {formatCompact(ot.pnl)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No order type data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
