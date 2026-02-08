/**
 * Trade Summary Stats - P&L summary cards for Trading Journal
 * System-First: Aggregates both Binance and Paper data sources
 * Shows breakdown in subtitle when both sources have data
 * 
 * P&L Terminology Standard:
 * - Gross P&L: Before fees (realized_pnl from Binance)
 * - Net P&L: After commission & funding fees
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Circle, TrendingUp, TrendingDown, CheckCircle, DollarSign, Wifi } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface TradeSummaryStatsProps {
  openPositionsCount: number;
  binancePositionsCount: number;
  unrealizedPnL: number;
  binanceUnrealizedPnL: number | undefined;
  closedTradesCount: number;
  realizedPnL: number;              // Gross P&L (before fees)
  netPnL?: number;                  // Net P&L (after fees) - optional for backward compatibility
  totalCommission?: number;         // Commission fees
  totalFundingFees?: number;        // Funding fees
  isBinanceConnected: boolean;
}

export function TradeSummaryStats({
  openPositionsCount,
  binancePositionsCount,
  unrealizedPnL,
  binanceUnrealizedPnL,
  closedTradesCount,
  realizedPnL,
  netPnL,
  totalCommission = 0,
  totalFundingFees = 0,
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
  
  // Calculate net if not provided
  const displayNetPnL = netPnL ?? (realizedPnL - totalCommission - totalFundingFees);
  const totalFees = totalCommission + totalFundingFees;

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
      
      {/* Realized P&L with Gross/Net breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            Realized P&L
            <InfoTooltip 
              content="Gross P&L is before fees. Hover for net P&L breakdown including commission and funding fees."
            />
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className={`text-2xl font-bold ${realizedPnL >= 0 ? "text-profit" : "text-loss"}`}>
                    {formatPnl(realizedPnL)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gross (before fees)
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span>Gross P&L:</span>
                    <span className={realizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
                      {formatPnl(realizedPnL)}
                    </span>
                  </div>
                  {totalFees > 0 && (
                    <>
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>Commission:</span>
                        <span>-{formatPnl(totalCommission)}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-muted-foreground">
                        <span>Funding:</span>
                        <span>-{formatPnl(totalFundingFees)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between gap-4 font-medium">
                        <span>Net P&L:</span>
                        <span className={displayNetPnL >= 0 ? 'text-profit' : 'text-loss'}>
                          {formatPnl(displayNetPnL)}
                        </span>
                      </div>
                    </>
                  )}
                  {totalFees === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No fee data available
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
