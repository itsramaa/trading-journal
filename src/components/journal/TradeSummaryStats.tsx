/**
 * Trade Summary Stats - P&L summary cards for Trading Journal
 * System-First: Aggregates both Binance and Paper data sources
 * Shows breakdown in subtitle when both sources have data
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Circle, TrendingUp, TrendingDown, CheckCircle, DollarSign, Wifi } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface TradeSummaryStatsProps {
  openPositionsCount: number;
  binancePositionsCount: number;
  unrealizedPnL: number;
  binanceUnrealizedPnL: number | undefined;
  closedTradesCount: number;
  realizedPnL: number;
  isBinanceConnected: boolean;
}

export function TradeSummaryStats({
  openPositionsCount,
  binancePositionsCount,
  unrealizedPnL,
  binanceUnrealizedPnL,
  closedTradesCount,
  realizedPnL,
  isBinanceConnected,
}: TradeSummaryStatsProps) {
  const { formatPnl } = useCurrencyConversion();
  
  // Aggregate both sources - System-First principle
  const binancePnL = binanceUnrealizedPnL ?? 0;
  const paperPnL = unrealizedPnL;
  const displayUnrealizedPnL = binancePnL + paperPnL;

  const displayPositionsCount = binancePositionsCount + openPositionsCount;

  // For breakdown display
  const hasBinanceData = isBinanceConnected && binancePositionsCount > 0;
  const hasPaperData = openPositionsCount > 0;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            Open Positions
            {hasBinanceData && <Wifi className="h-3 w-3 text-profit" aria-hidden="true" />}
          </CardTitle>
          <Circle className="h-4 w-4 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayPositionsCount}</div>
          <p className="text-xs text-muted-foreground">
            {hasBinanceData && hasPaperData 
              ? `${binancePositionsCount} Binance + ${openPositionsCount} Paper`
              : hasBinanceData 
                ? 'From Binance'
                : 'Paper Trading'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            Unrealized P&L
            <InfoTooltip 
              content="Potensi profit/loss dari posisi yang masih terbuka. Nilai ini berubah sesuai harga pasar."
            />
          </CardTitle>
          {displayUnrealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-profit" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" aria-hidden="true" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${displayUnrealizedPnL >= 0 ? "text-profit" : "text-loss"}`}>
            {formatPnl(displayUnrealizedPnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            {hasBinanceData && hasPaperData 
              ? 'Combined: Binance + Paper'
              : hasBinanceData 
                ? 'Live from Binance'
                : 'From paper positions'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Closed Trades</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{closedTradesCount}</div>
          <p className="text-xs text-muted-foreground">Completed trades</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            Realized P&L
            <InfoTooltip 
              content="Profit/loss aktual dari trade yang sudah ditutup. Nilai final setelah posisi closed."
            />
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${realizedPnL >= 0 ? "text-profit" : "text-loss"}`}>
            {formatPnl(realizedPnL)}
          </div>
          <p className="text-xs text-muted-foreground">From closed trades</p>
        </CardContent>
      </Card>
    </div>
  );
}
