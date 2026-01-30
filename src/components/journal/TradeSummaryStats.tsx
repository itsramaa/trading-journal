/**
 * Trade Summary Stats - P&L summary cards for Trading Journal
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Circle, TrendingUp, TrendingDown, CheckCircle, DollarSign, Wifi } from "lucide-react";

interface TradeSummaryStatsProps {
  openPositionsCount: number;
  binancePositionsCount: number;
  unrealizedPnL: number;
  binanceUnrealizedPnL: number | undefined;
  closedTradesCount: number;
  realizedPnL: number;
  isBinanceConnected: boolean;
  formatCurrency: (value: number, currency: string) => string;
}

export function TradeSummaryStats({
  openPositionsCount,
  binancePositionsCount,
  unrealizedPnL,
  binanceUnrealizedPnL,
  closedTradesCount,
  realizedPnL,
  isBinanceConnected,
  formatCurrency,
}: TradeSummaryStatsProps) {
  const displayUnrealizedPnL = isBinanceConnected 
    ? (binanceUnrealizedPnL ?? 0) 
    : unrealizedPnL;
  
  const displayPositionsCount = isBinanceConnected 
    ? binancePositionsCount 
    : openPositionsCount;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            Open Positions
            {isBinanceConnected && <Wifi className="h-3 w-3 text-profit" aria-hidden="true" />}
          </CardTitle>
          <Circle className="h-4 w-4 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayPositionsCount}</div>
          <p className="text-xs text-muted-foreground">
            {isBinanceConnected ? 'From Binance' : 'Paper Trading'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
          {displayUnrealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-profit" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" aria-hidden="true" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${displayUnrealizedPnL >= 0 ? "text-profit" : "text-loss"}`}>
            {formatCurrency(displayUnrealizedPnL, "USD")}
          </div>
          <p className="text-xs text-muted-foreground">
            {isBinanceConnected ? 'Live from Binance' : 'From paper positions'}
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
          <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${realizedPnL >= 0 ? "text-profit" : "text-loss"}`}>
            {formatCurrency(realizedPnL, "USD")}
          </div>
          <p className="text-xs text-muted-foreground">From closed trades</p>
        </CardContent>
      </Card>
    </div>
  );
}
