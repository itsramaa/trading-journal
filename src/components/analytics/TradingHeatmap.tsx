/**
 * Trading Heatmap Component - Shows total PNL by day of week and hour
 * Accepts optional filtered trades, otherwise fetches all trades
 * Card cells show total PNL, hover shows trade count and win rate
 * Event overlay shows high-impact economic events (FOMC, CPI, NFP)
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useHighImpactEventDates, isHighImpactEventDay, getEventLabel } from "@/hooks/use-economic-events";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { format, subDays, parseISO, startOfWeek, addDays } from "date-fns";
import { Calendar } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

// Generic trade type for the heatmap - only needs these fields
interface HeatmapTrade {
  trade_date: string;
  status: string;
  realized_pnl?: number | null;
  pnl?: number | null;
}

interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  dateKey?: string; // For event matching
  hasEvent?: boolean;
  eventLabels?: string[];
}

interface TradingHeatmapProps {
  trades?: HeatmapTrade[];
  className?: string;
  showEventOverlay?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = [0, 4, 8, 12, 16, 20];

export function TradingHeatmap({ trades: externalTrades, className, showEventOverlay = true }: TradingHeatmapProps) {
  const { data: fetchedTrades } = useTradeEntries();
  const { eventDateMap, isLoading: eventsLoading } = useHighImpactEventDates({
    startDate: subDays(new Date(), 90),
    endDate: new Date(),
  });
  
  // Use external trades if provided, otherwise use fetched
  const trades = externalTrades || fetchedTrades;

  const heatmapData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Only process closed trades if using fetched data
    const closedTrades = externalTrades 
      ? trades // Already filtered externally
      : trades.filter(t => t.status === 'closed');

    // Initialize grid
    const grid: Map<string, HeatmapCell> = new Map();

    // Track unique dates for event matching
    const tradeDates = new Set<string>();

    // Process each trade
    closedTrades.forEach((trade) => {
      const tradeDate = new Date(trade.trade_date);
      const dayOfWeek = tradeDate.getDay();
      // Round hour to nearest 4-hour block
      const hour = Math.floor(tradeDate.getHours() / 4) * 4;
      const dateKey = format(tradeDate, 'yyyy-MM-dd');
      
      tradeDates.add(dateKey);
      
      const key = `${dayOfWeek}-${hour}`;
      const existing = grid.get(key) || {
        dayOfWeek,
        hour,
        trades: 0,
        wins: 0,
        winRate: 0,
        totalPnl: 0,
        hasEvent: false,
        eventLabels: [],
      };

      existing.trades++;
      const pnl = trade.realized_pnl || trade.pnl || 0;
      existing.totalPnl += pnl;
      
      // Check if this trade date has events
      if (showEventOverlay && eventDateMap.size > 0) {
        const { hasEvent, events } = isHighImpactEventDay(dateKey, eventDateMap);
        if (hasEvent) {
          existing.hasEvent = true;
          events.forEach(e => {
            if (!existing.eventLabels?.includes(e)) {
              existing.eventLabels?.push(e);
            }
          });
        }
      }
      
      if (pnl > 0) {
        existing.wins++;
      }
      existing.winRate = (existing.wins / existing.trades) * 100;

      grid.set(key, existing);
    });

    return Array.from(grid.values());
  }, [trades, externalTrades, showEventOverlay, eventDateMap]);

  // Calculate dynamic color thresholds based on data
  const { maxPnl, minPnl } = useMemo(() => {
    if (heatmapData.length === 0) return { maxPnl: 100, minPnl: -100 };
    const pnls = heatmapData.map(c => c.totalPnl);
    return {
      maxPnl: Math.max(...pnls, 100),
      minPnl: Math.min(...pnls, -100),
    };
  }, [heatmapData]);

  const getCellColor = (cell: HeatmapCell | undefined) => {
    if (!cell || cell.trades === 0) return 'bg-muted/30';
    
    const pnl = cell.totalPnl;
    
    // Dynamic thresholds based on data range
    if (pnl >= maxPnl * 0.5) return 'bg-profit/70';
    if (pnl > 0) return 'bg-profit/35';
    if (pnl >= minPnl * 0.5) return 'bg-loss/35';
    return 'bg-loss/70';
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

  // Session labels for rows
  const getSessionLabel = (hour: number) => {
    if (hour < 8) return 'Asia';
    if (hour < 16) return 'London';
    return 'NY';
  };

  if (!trades || trades.length === 0) {
    return (
      <Card className={className}>
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
    <Card className={className}>
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
                <div className="w-20 text-xs text-muted-foreground text-left pr-2">Time</div>
                {DAYS.map((day) => (
                  <div key={day} className="w-14 text-xs text-muted-foreground text-center font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Data rows */}
              {HOURS.map((hour, hourIdx) => (
                <div key={hour} className="flex items-center mb-1">
                  <div className="w-20 text-xs text-muted-foreground pr-2 flex items-center gap-1">
                    <span className="w-10">{hour.toString().padStart(2, '0')}:00</span>
                    {(hourIdx === 0 || hour === 8 || hour === 16) && (
                      <span className="text-[9px] text-muted-foreground/60">
                        {getSessionLabel(hour)}
                      </span>
                    )}
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const cell = getCellData(dayIndex, hour);
                    const hasEvent = cell?.hasEvent;
                    const eventLabel = hasEvent && cell?.eventLabels ? getEventLabel(cell.eventLabels) : '';
                    
                    return (
                      <div key={dayIndex} className="w-14 flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-12 h-12 rounded-md flex flex-col items-center justify-center text-xs font-medium cursor-default transition-all hover:scale-105 relative",
                                getCellColor(cell),
                                hasEvent && "ring-2 ring-warning ring-offset-1 ring-offset-background"
                              )}
                            >
                              {/* Event indicator badge */}
                              {hasEvent && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="w-3 h-3 bg-warning rounded-full flex items-center justify-center">
                                    <Calendar className="w-2 h-2 text-warning-foreground" />
                                  </div>
                                </div>
                              )}
                              
                              {cell && cell.trades > 0 ? (
                                <span className={cn(
                                  "text-[10px] font-semibold",
                                  cell.totalPnl >= 0 ? "text-profit" : "text-loss"
                                )}>
                                  {formatPnlDisplay(cell.totalPnl)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">-</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="p-3">
                            {cell && cell.trades > 0 ? (
                              <div className="text-xs space-y-1">
                                <div className="font-semibold text-sm">
                                  {DAYS[dayIndex]} {hour.toString().padStart(2, '0')}:00 - {((hour + 4) % 24).toString().padStart(2, '0')}:00
                                </div>
                                
                                {/* Event Warning */}
                                {hasEvent && cell.eventLabels && cell.eventLabels.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-warning bg-warning/10 rounded px-1.5 py-0.5">
                                    <Calendar className="w-3 h-3" />
                                    <span className="font-medium">
                                      {cell.eventLabels.length === 1 
                                        ? cell.eventLabels[0] 
                                        : `${cell.eventLabels.length} events: ${cell.eventLabels.slice(0, 2).join(', ')}${cell.eventLabels.length > 2 ? '...' : ''}`
                                      }
                                    </span>
                                  </div>
                                )}
                                
                                <div className={cn("font-medium", cell.totalPnl >= 0 ? "text-profit" : "text-loss")}>
                                  Total P&L: {formatCurrency(cell.totalPnl, 'USD')}
                                </div>
                                <div>Trades: {cell.trades}</div>
                                <div>Wins: {cell.wins} ({cell.winRate.toFixed(0)}%)</div>
                                <div className="text-muted-foreground pt-1 border-t">
                                  Avg: {formatCurrency(cell.totalPnl / cell.trades, 'USD')}/trade
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No trades in this period</span>
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
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-loss/70" />
            <span>High Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-loss/35" />
            <span>Low Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted/30" />
            <span>No Data</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-profit/35" />
            <span>Low Profit</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-profit/70" />
            <span>High Profit</span>
          </div>
          {showEventOverlay && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l">
              <div className="w-4 h-4 rounded ring-2 ring-warning ring-offset-1 ring-offset-background flex items-center justify-center">
                <Calendar className="w-2.5 h-2.5 text-warning" />
              </div>
              <span>High-Impact Event</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
