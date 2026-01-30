/**
 * Today's Performance - 24H trading stats
 * Uses Binance API for real trades when connected, falls back to local DB
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Target, Activity, Trophy, AlertTriangle, Zap } from "lucide-react";
import { useDailyPnl } from "@/hooks/use-daily-pnl";
import { useBinanceTrades, useBinanceConnectionStatus } from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";

export function TodayPerformance() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected;

  // Fetch Binance trades for multiple popular symbols (last 24h approximation)
  const { data: btcTrades } = useBinanceTrades("BTCUSDT", 100);
  const { data: ethTrades } = useBinanceTrades("ETHUSDT", 100);
  
  // Local DB fallback
  const {
    tradesOpened,
    tradesClosed,
    realizedPnl: localRealizedPnl,
    winRate: localWinRate,
    wins: localWins,
    losses: localLosses,
    bestTrade: localBestTrade,
    worstTrade: localWorstTrade,
    isLoading: localLoading,
  } = useDailyPnl();

  // Calculate Binance 24H stats
  const binanceStats = useMemo(() => {
    if (!isConnected) return null;
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Combine all trades and filter to last 24h
    const allTrades = [...(btcTrades || []), ...(ethTrades || [])];
    const todayTrades = allTrades.filter(t => t.time >= oneDayAgo);
    
    if (todayTrades.length === 0) return null;
    
    const totalPnl = todayTrades.reduce((sum, t) => sum + t.realizedPnl, 0);
    const totalCommission = todayTrades.reduce((sum, t) => sum + t.commission, 0);
    const wins = todayTrades.filter(t => t.realizedPnl > 0).length;
    const losses = todayTrades.filter(t => t.realizedPnl < 0).length;
    const winRate = todayTrades.length > 0 ? (wins / todayTrades.length) * 100 : 0;
    
    const sortedByPnl = [...todayTrades].sort((a, b) => b.realizedPnl - a.realizedPnl);
    const bestTrade = sortedByPnl[0];
    const worstTrade = sortedByPnl[sortedByPnl.length - 1];
    
    return {
      totalTrades: todayTrades.length,
      totalPnl,
      totalCommission,
      wins,
      losses,
      winRate,
      bestTrade: bestTrade ? { pair: bestTrade.symbol, pnl: bestTrade.realizedPnl } : null,
      worstTrade: worstTrade ? { pair: worstTrade.symbol, pnl: worstTrade.realizedPnl } : null,
    };
  }, [isConnected, btcTrades, ethTrades]);

  const isLoading = localLoading;

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
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use Binance stats if connected and has trades, otherwise local
  const useBinance = isConnected && binanceStats && binanceStats.totalTrades > 0;
  
  const stats = useBinance ? {
    tradesCount: binanceStats.totalTrades,
    realizedPnl: binanceStats.totalPnl,
    winRate: binanceStats.winRate,
    wins: binanceStats.wins,
    losses: binanceStats.losses,
    bestTrade: binanceStats.bestTrade,
    worstTrade: binanceStats.worstTrade,
    commission: binanceStats.totalCommission,
  } : {
    tradesCount: tradesClosed,
    realizedPnl: localRealizedPnl,
    winRate: localWinRate,
    wins: localWins,
    losses: localLosses,
    bestTrade: localBestTrade,
    worstTrade: localWorstTrade,
    commission: 0,
  };

  const hasActivity = stats.tradesCount > 0 || tradesOpened > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Today's Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            {useBinance && (
              <Badge variant="outline" className="text-xs text-profit">
                <Zap className="h-3 w-3 mr-1" />
                Binance
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">24H</Badge>
          </div>
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
              <div className={`flex items-center gap-1 text-xl font-bold ${stats.realizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {stats.realizedPnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {stats.realizedPnl >= 0 ? '+' : ''}{formatCurrency(stats.realizedPnl, 'USD')}
              </div>
            </div>

            {/* Trade Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Trades Closed</p>
                <p className="text-lg font-semibold">{stats.tradesCount}</p>
              </div>
              {useBinance && stats.commission > 0 ? (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Fees Paid</p>
                  <p className="text-lg font-semibold text-muted-foreground">
                    {formatCurrency(stats.commission, 'USD')}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Trades Opened</p>
                  <p className="text-lg font-semibold">{tradesOpened}</p>
                </div>
              )}
            </div>

            {/* Win Rate */}
            {stats.tradesCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm">Win Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stats.winRate.toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">
                    ({stats.wins}W / {stats.losses}L)
                  </span>
                </div>
              </div>
            )}

            {/* Best/Worst Trade */}
            {stats.tradesCount > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {stats.bestTrade && stats.bestTrade.pnl > 0 && (
                  <div className="p-3 rounded-lg border border-profit/30 bg-profit/5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Trophy className="h-3 w-3 text-profit" />
                      Best Trade
                    </div>
                    <p className="font-medium text-sm">{stats.bestTrade.pair}</p>
                    <p className="text-profit font-semibold">
                      +{formatCurrency(stats.bestTrade.pnl, 'USD')}
                    </p>
                  </div>
                )}
                {stats.worstTrade && stats.worstTrade.pnl < 0 && (
                  <div className="p-3 rounded-lg border border-loss/30 bg-loss/5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <AlertTriangle className="h-3 w-3 text-loss" />
                      Worst Trade
                    </div>
                    <p className="font-medium text-sm">{stats.worstTrade.pair}</p>
                    <p className="text-loss font-semibold">
                      {formatCurrency(stats.worstTrade.pnl, 'USD')}
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
