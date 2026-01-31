/**
 * Trading Heatmap - Shows total PNL by day of week and hour
 * Card cells show total PNL, hover shows trade count and win rate
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
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
        totalPnl: 0,
      };

      existing.trades++;
      const pnl = trade.realized_pnl || trade.pnl || 0;
      existing.totalPnl += pnl;
      
      if (pnl > 0) {
        existing.wins++;
      }
      existing.winRate = (existing.wins / existing.trades) * 100;

      grid.set(key, existing);
    });

    return Array.from(grid.values());
  }, [trades]);

  const getCellColor = (cell: HeatmapCell | undefined) => {
    if (!cell || cell.trades === 0) return 'bg-muted/30';
    
    // Color based on PNL
    if (cell.totalPnl > 100) return 'bg-profit/60';
    if (cell.totalPnl > 0) return 'bg-profit/30';
    if (cell.totalPnl > -100) return 'bg-loss/30';
    return 'bg-loss/60';
  };

  const getCellData = (day: number, hour: number) => {
    return heatmapData.find(c => c.dayOfWeek === day && c.hour === hour);
  };

const formatPnlDisplay = (pnl: number) => {
    if (Math.abs(pnl) >= 1000) {
      return `$${pnl >= 0 ? '+' : ''}${(pnl / 1000).toFixed(1)}k`;
    }
    return `$${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}`;
  };

  if (!trades || trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading Heatmap</CardTitle>
          <CardDescription>P&L by time of day and day of week</CardDescription>
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
        <CardDescription>Total P&L by time of day and day of week</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header row */}
              <div className="flex items-center mb-1">
                <div className="w-14 text-xs text-muted-foreground text-left pr-2">Time</div>
                {DAYS.map((day) => (
                  <div key={day} className="w-12 text-xs text-muted-foreground text-center">
                    {day}
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="flex items-center mb-1">
                  <div className="w-14 text-xs text-muted-foreground pr-2">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const cell = getCellData(dayIndex, hour);
                    return (
                      <div key={dayIndex} className="w-12 flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-10 h-10 rounded flex items-center justify-center text-xs font-medium cursor-default",
                                getCellColor(cell)
                              )}
                            >
                              {cell && cell.trades > 0 ? (
                                <span className={cn(
                                  "text-[9px] font-semibold",
                                  cell.totalPnl >= 0 ? "text-profit" : "text-loss"
                                )}>
                                  {formatPnlDisplay(cell.totalPnl)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {cell && cell.trades > 0 ? (
                              <div className="text-xs space-y-1">
                                <div className="font-semibold">{DAYS[dayIndex]} {hour.toString().padStart(2, '0')}:00</div>
                                <div className={cell.totalPnl >= 0 ? "text-profit" : "text-loss"}>
                                  Total P&L: {formatCurrency(cell.totalPnl, 'USD')}
                                </div>
                                <div>Trades: {cell.trades}</div>
                                <div>Win Rate: {cell.winRate.toFixed(0)}%</div>
                              </div>
                            ) : (
                              <span>No trades</span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-loss/60" />
            <span>&lt;-$100</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-loss/30" />
            <span>-$100 to $0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-profit/30" />
            <span>$0 to $100</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-profit/60" />
            <span>&gt;$100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
