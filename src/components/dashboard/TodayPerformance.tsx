/**
 * Today's Performance - 24H trading stats with full income breakdown
 * System-First: Shows local data immediately, enriched with Binance when available
 * Shows: Gross P&L, Net P&L, Fees, Funding, Rebates
 * Wrapped with error boundary for API timeout handling
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  Trophy, 
  AlertTriangle, 
  Zap,
  ChevronDown,
  Wallet,
  ArrowUpDown,
  FileText
} from "lucide-react";
import { useDailyPnl } from "@/hooks/use-daily-pnl";
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useTradeMode } from "@/hooks/use-trade-mode";
import { WinRateTooltip, InfoTooltip } from "@/components/ui/info-tooltip";

function TodayPerformanceContent() {
  const [isFeeBreakdownOpen, setIsFeeBreakdownOpen] = useState(false);
  const { format, formatPnl } = useCurrencyConversion();
  const { isPaper } = useTradeMode();
  
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected;

  // Use the comprehensive income-based hook
  const binanceStats = useBinanceDailyPnl();
  
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

  // Calculate best/worst from bySymbol data
  const binanceBestWorst = useMemo(() => {
    if (!binanceStats.bySymbol || Object.keys(binanceStats.bySymbol).length === 0) {
      return { best: null, worst: null };
    }
    
    const symbolEntries = Object.entries(binanceStats.bySymbol);
    const sortedByPnl = symbolEntries.sort((a, b) => b[1].pnl - a[1].pnl);
    
    const best = sortedByPnl[0];
    const worst = sortedByPnl[sortedByPnl.length - 1];
    
    return {
      best: best && best[1].pnl > 0 ? { pair: best[0], pnl: best[1].pnl } : null,
      worst: worst && worst[1].pnl < 0 ? { pair: worst[0], pnl: worst[1].pnl } : null,
    };
  }, [binanceStats.bySymbol]);

  // System-First: Only show loading if we have NO data source ready
  // If local data is ready, render it immediately even if Binance is still loading
  const showLoading = localLoading && binanceStats.isLoading;

  if (showLoading) {
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
  // Use Binance stats if connected, has trades, and NOT in Paper mode (M-05)
  const useBinance = !isPaper && isConnected && binanceStats.isConnected && binanceStats.totalTrades > 0;
  
  const stats = useBinance ? {
    tradesCount: binanceStats.totalTrades,
    grossPnl: binanceStats.grossPnl,
    netPnl: binanceStats.netPnl,
    winRate: binanceStats.winRate,
    wins: binanceStats.wins,
    losses: binanceStats.losses,
    bestTrade: binanceBestWorst.best,
    worstTrade: binanceBestWorst.worst,
    commission: binanceStats.totalCommission,
    funding: binanceStats.totalFunding,
    rebates: binanceStats.totalRebates,
    hasFeeData: true,
  } : {
    tradesCount: tradesClosed,
    grossPnl: localRealizedPnl,
    netPnl: localRealizedPnl, // No fee data for local
    winRate: localWinRate,
    wins: localWins,
    losses: localLosses,
    bestTrade: localBestTrade,
    worstTrade: localWorstTrade,
    commission: 0,
    funding: 0,
    rebates: 0,
    hasFeeData: false,
  };

  const hasActivity = stats.tradesCount > 0 || tradesOpened > 0;
  const hasSignificantFees = stats.commission > 0 || stats.funding !== 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Today's Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            {useBinance ? (
              <Badge variant="outline" className="text-xs text-profit">
                <Zap className="h-3 w-3 mr-1" />
                Binance
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Journal
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
            {/* Main P&L - Show Net if we have fee data */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                {stats.hasFeeData ? 'Net P&L' : '24H P&L'}
                <InfoTooltip content={stats.hasFeeData 
                  ? "Net Profit & Loss after deducting all trading fees, funding costs, and adding rebates. This is your true take-home profit." 
                  : "Today's realized profit or loss from closed trades in the last 24 hours."} 
                />
              </span>
              <div className={`flex items-center gap-1 text-xl font-bold ${stats.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {stats.netPnl >= 0 ? <TrendingUp className="h-5 w-5" aria-hidden="true" /> : <TrendingDown className="h-5 w-5" aria-hidden="true" />}
                {formatPnl(stats.netPnl)}
              </div>
            </div>

            {/* Gross vs Net comparison (only if we have fee data) */}
            {stats.hasFeeData && hasSignificantFees && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-xs text-muted-foreground">Gross P&L</span>
                <span className={`text-sm font-semibold ${stats.grossPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPnl(stats.grossPnl)}
                </span>
              </div>
            )}

            {/* Fee Breakdown (collapsible) */}
            {stats.hasFeeData && hasSignificantFees && (
              <Collapsible open={isFeeBreakdownOpen} onOpenChange={setIsFeeBreakdownOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between p-2">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wallet className="h-3 w-3" />
                      Fee Breakdown
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isFeeBreakdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 pl-2">
                    {/* Commission */}
                    {stats.commission > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wallet className="h-3 w-3" /> Trading Fees
                        </span>
                        <span className="text-loss">-{format(stats.commission)}</span>
                      </div>
                    )}
                    
                    {/* Funding */}
                    {stats.funding !== 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <ArrowUpDown className="h-3 w-3" /> Funding Fees
                        </span>
                        <span className={stats.funding >= 0 ? 'text-profit' : 'text-loss'}>
                          {formatPnl(stats.funding)}
                        </span>
                      </div>
                    )}
                    
                    {/* Rebates */}
                    {stats.rebates > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Fee Rebates
                        </span>
                        <span className="text-profit">+{format(stats.rebates)}</span>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Trade Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Trades Closed</p>
                <p className="text-lg font-semibold">{stats.tradesCount}</p>
              </div>
              {useBinance && stats.commission > 0 ? (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Fees</p>
                  <p className="text-lg font-semibold text-muted-foreground">
                    {format(stats.commission + Math.abs(stats.funding < 0 ? stats.funding : 0))}
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
                  <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm">Win Rate</span>
                  <WinRateTooltip />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stats.winRate.toFixed(1)}%</span>
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
                      {formatPnl(stats.bestTrade.pnl)}
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
                      {formatPnl(stats.worstTrade.pnl)}
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

/**
 * Exported component wrapped with ErrorBoundary
 */
export function TodayPerformance() {
  return (
    <ErrorBoundary 
      title="Today's Performance" 
      compact={false}
    >
      <TodayPerformanceContent />
    </ErrorBoundary>
  );
}
