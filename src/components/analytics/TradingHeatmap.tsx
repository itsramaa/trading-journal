/**
 * Trading Heatmap - Shows win rate by day of week and hour
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { cn } from "@/lib/utils";

interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  trades: number;
  wins: number;
  winRate: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = [0, 4, 8, 12, 16, 20];

export function TradingHeatmap() {
  const { data: trades } = useTradeEntries();

  const heatmapData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Initialize grid
    const grid: Map<string, HeatmapCell> = new Map();

    // Process each trade
    trades.forEach((trade) => {
      if (trade.status !== 'closed') return;

      const tradeDate = new Date(trade.trade_date);
      const dayOfWeek = tradeDate.getDay();
      // Round hour to nearest 4-hour block
      const hour = Math.floor(tradeDate.getHours() / 4) * 4;
      
      const key = `${dayOfWeek}-${hour}`;
      const existing = grid.get(key) || {
        dayOfWeek,
        hour,
        trades: 0,
        wins: 0,
        winRate: 0,
      };

      existing.trades++;
      if ((trade.realized_pnl || trade.pnl || 0) > 0) {
        existing.wins++;
      }
      existing.winRate = (existing.wins / existing.trades) * 100;

      grid.set(key, existing);
    });

    return Array.from(grid.values());
  }, [trades]);

  const getCellColor = (cell: HeatmapCell | undefined) => {
    if (!cell || cell.trades === 0) return 'bg-muted/30';
    
    if (cell.winRate >= 70) return 'bg-green-500/60';
    if (cell.winRate >= 55) return 'bg-green-500/30';
    if (cell.winRate >= 45) return 'bg-yellow-500/30';
    if (cell.winRate >= 30) return 'bg-orange-500/30';
    return 'bg-red-500/30';
  };

  const getCellData = (day: number, hour: number) => {
    return heatmapData.find(c => c.dayOfWeek === day && c.hour === hour);
  };

  if (!trades || trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading Heatmap</CardTitle>
          <CardDescription>Win rate by time of day and day of week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No trade data available</p>
            <p className="text-sm">Start logging trades to see patterns</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Heatmap</CardTitle>
        <CardDescription>Win rate by time of day and day of week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-xs text-muted-foreground text-left pb-2 pr-2">Time</th>
                {DAYS.map((day) => (
                  <th key={day} className="text-xs text-muted-foreground text-center pb-2 px-1">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td className="text-xs text-muted-foreground pr-2 py-1">
                    {hour.toString().padStart(2, '0')}:00
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const cell = getCellData(dayIndex, hour);
                    return (
                      <td key={dayIndex} className="p-1">
                        <div
                          className={cn(
                            "w-8 h-8 rounded flex items-center justify-center text-xs font-medium",
                            getCellColor(cell)
                          )}
                          title={cell 
                            ? `${cell.trades} trades, ${cell.winRate.toFixed(0)}% win rate`
                            : 'No trades'
                          }
                        >
                          {cell && cell.trades > 0 ? (
                            <span className="text-foreground/80">{cell.trades}</span>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/30" />
            <span>&lt;30%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500/30" />
            <span>30-45%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500/30" />
            <span>45-55%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/30" />
            <span>55-70%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/60" />
            <span>&gt;70%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
