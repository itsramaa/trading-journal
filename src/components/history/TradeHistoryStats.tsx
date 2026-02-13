/**
 * Trade History Stats - Header stats display (trades count, P&L, win rate, enrichment indicator)
 */
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";

interface TradeHistoryStatsProps {
  isLoading: boolean;
  displayedCount: number;
  serverTotalTrades: number;
  totalPnLGross: number;
  totalPnLNet: number;
  winRate: number;
  tradesNeedingEnrichment: number;
  hasActiveFilters: boolean;
  formatCurrency: (value: number) => string;
}

export function TradeHistoryStats({
  isLoading,
  displayedCount,
  serverTotalTrades,
  totalPnLGross,
  totalPnLNet,
  winRate,
  tradesNeedingEnrichment,
  hasActiveFilters,
  formatCurrency,
}: TradeHistoryStatsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 text-sm">
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-12 w-16" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 text-sm">
      <div className="text-center">
        <div className="text-2xl font-bold">
          {displayedCount}
          {serverTotalTrades > displayedCount && (
            <span className="text-sm text-muted-foreground font-normal">/{serverTotalTrades}</span>
          )}
        </div>
        <div className="text-muted-foreground">
          {hasActiveFilters ? 'Filtered' : 'Trades'}
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-center cursor-help">
              <div className={`text-2xl font-bold ${totalPnLGross >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(totalPnLGross)}
              </div>
              <div className="text-muted-foreground text-xs">Gross P&L</div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p><strong>Gross P&L</strong>: {formatCurrency(totalPnLGross)}</p>
              <p className="text-xs text-muted-foreground">Before fees (realized_pnl from Binance)</p>
              <div className="border-t pt-1 mt-1">
                <p><strong>Net P&L</strong>: {formatCurrency(totalPnLNet)}</p>
                <p className="text-xs text-muted-foreground">After commission & funding fees</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="text-center">
        <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
        <div className="text-muted-foreground">Win Rate</div>
      </div>

      {tradesNeedingEnrichment > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center px-3 py-1 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="text-lg font-bold text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {tradesNeedingEnrichment}
                </div>
                <div className="text-xs text-destructive/80">Incomplete</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tradesNeedingEnrichment} trades are missing entry/exit prices.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Enrich Trades" to fetch accurate data from Binance.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
