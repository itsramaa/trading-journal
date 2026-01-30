/**
 * Trading Heatmap Page - Standalone page for heatmap analysis
 */
import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Grid3X3, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { TradingHeatmap } from "@/components/analytics/TradingHeatmap";

export default function TradingHeatmapPage() {
  const { data: trades, isLoading } = useTradeEntries();

  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);

  // Calculate heatmap insights
  const heatmapInsights = useMemo(() => {
    if (closedTrades.length === 0) return null;
    
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grid: Map<string, { day: string; hour: number; trades: number; wins: number }> = new Map();
    
    closedTrades.forEach((trade) => {
      const d = new Date(trade.trade_date);
      const day = DAYS[d.getDay()];
      const hour = Math.floor(d.getHours() / 4) * 4;
      const key = `${day}-${hour}`;
      const existing = grid.get(key) || { day, hour, trades: 0, wins: 0 };
      existing.trades++;
      if ((trade.realized_pnl || trade.pnl || 0) > 0) existing.wins++;
      grid.set(key, existing);
    });
    
    const slots = Array.from(grid.values())
      .map(s => ({ ...s, winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0 }))
      .filter(s => s.trades >= 3);
    
    if (slots.length === 0) return null;
    
    const sorted = [...slots].sort((a, b) => b.winRate - a.winRate);
    const byVolume = [...slots].sort((a, b) => b.trades - a.trades);
    
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      mostActive: byVolume[0],
    };
  }, [closedTrades]);

  const formatTimeSlot = (hour: number) => {
    const start = hour.toString().padStart(2, '0');
    const end = ((hour + 4) % 24).toString().padStart(2, '0');
    return `${start}:00-${end}:00`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Grid3X3 className="h-6 w-6 text-primary" />
              Trading Heatmap
            </h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            Trading Heatmap
          </h1>
          <p className="text-muted-foreground">
            Analyze your trading performance by time of day and day of week
          </p>
        </div>

        {closedTrades.length === 0 ? (
          <EmptyState
            icon={Grid3X3}
            title="No trade data"
            description="Complete some trades to see your trading heatmap."
          />
        ) : (
          <>
            {/* Heatmap Insights */}
            {heatmapInsights && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-profit/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-profit" />
                      Best Time to Trade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{heatmapInsights.best.day} {formatTimeSlot(heatmapInsights.best.hour)}</div>
                    <p className="text-sm text-muted-foreground">
                      {heatmapInsights.best.winRate.toFixed(0)}% win rate ({heatmapInsights.best.trades} trades)
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-loss/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-loss" />
                      Worst Time to Trade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{heatmapInsights.worst.day} {formatTimeSlot(heatmapInsights.worst.hour)}</div>
                    <p className="text-sm text-muted-foreground">
                      {heatmapInsights.worst.winRate.toFixed(0)}% win rate ({heatmapInsights.worst.trades} trades)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Most Active Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{heatmapInsights.mostActive.day} {formatTimeSlot(heatmapInsights.mostActive.hour)}</div>
                    <p className="text-sm text-muted-foreground">
                      {heatmapInsights.mostActive.trades} trades executed
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Heatmap Component */}
            <TradingHeatmap />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
