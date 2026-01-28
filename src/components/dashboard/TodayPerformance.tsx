/**
 * Today's Performance - 24H trading stats
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Activity, Trophy, AlertTriangle } from "lucide-react";
import { useDailyPnl } from "@/hooks/use-daily-pnl";

export function TodayPerformance() {
  const {
    tradesOpened,
    tradesClosed,
    realizedPnl,
    winRate,
    wins,
    losses,
    bestTrade,
    worstTrade,
    isLoading,
  } = useDailyPnl();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Today's Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActivity = tradesOpened > 0 || tradesClosed > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Today's Performance
          </CardTitle>
          <Badge variant="outline" className="text-xs">24H</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No trades today</p>
            <p className="text-xs">Start trading to see your daily stats</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main P&L */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">24H P&L</span>
              <div className={`flex items-center gap-1 text-xl font-bold ${realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {realizedPnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
              </div>
            </div>

            {/* Trade Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Trades Opened</p>
                <p className="text-lg font-semibold">{tradesOpened}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Trades Closed</p>
                <p className="text-lg font-semibold">{tradesClosed}</p>
              </div>
            </div>

            {/* Win Rate */}
            {tradesClosed > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm">Win Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{winRate.toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">
                    ({wins}W / {losses}L)
                  </span>
                </div>
              </div>
            )}

            {/* Best/Worst Trade */}
            {tradesClosed > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {bestTrade && (
                  <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Trophy className="h-3 w-3 text-green-500" />
                      Best Trade
                    </div>
                    <p className="font-medium text-sm">{bestTrade.pair}</p>
                    <p className="text-green-500 font-semibold">
                      +${bestTrade.pnl.toFixed(2)}
                    </p>
                  </div>
                )}
                {worstTrade && (
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      Worst Trade
                    </div>
                    <p className="font-medium text-sm">{worstTrade.pair}</p>
                    <p className="text-red-500 font-semibold">
                      ${worstTrade.pnl.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
