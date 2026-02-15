/**
 * Funding & OI Dashboard - Pure derivatives flow data
 * Extracted from MarketSentimentWidget for the Flow & Liquidity page
 * Displays: Funding rates, OI changes, divergence alerts per symbol
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Percent 
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { 
  FundingRateContext, 
  OIChangeData, 
  FundingPriceDivergence 
} from "@/features/market-insight/types";

interface FundingOIDashboardProps {
  fundingRates?: FundingRateContext[];
  oiChanges?: OIChangeData[];
  divergences?: FundingPriceDivergence[];
  isLoading: boolean;
  className?: string;
}

function FundingOIContent({ 
  fundingRates = [], 
  oiChanges = [], 
  divergences = [],
  isLoading, 
  className 
}: FundingOIDashboardProps) {
  // Hooks must be called before any early returns
  const combinedData = useMemo(() => 
    fundingRates.map(fr => {
      const oi = oiChanges.find(o => o.symbol === fr.symbol);
      const div = divergences.find(d => d.symbol === fr.symbol);
      return { ...fr, oi, divergence: div };
    }),
    [fundingRates, oiChanges, divergences]
  );

  const activeDivergences = useMemo(() => 
    divergences.filter(d => d.hasDivergence),
    [divergences]
  );

  if (isLoading) {
    return (
      <Card className={className} role="region" aria-label="Funding & OI Dashboard">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} role="region" aria-label="Funding & OI Dashboard">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Funding & OI</CardTitle>
          <InfoTooltip content="Real-time derivatives data showing funding rates, open interest changes, and funding/price divergence alerts for watchlist symbols." />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><Badge variant="outline" className="text-xs">Derivatives</Badge></div>
              </TooltipTrigger>
              <TooltipContent><p className="text-sm">Data sourced from Binance Futures perpetual contracts.</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Funding rates, open interest changes, and divergence alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Divergence Alerts */}
        {activeDivergences.length > 0 && (
          <div className="space-y-2">
            {activeDivergences.map(div => (
              <div 
                key={div.symbol}
                className={cn(
                  "p-2 rounded-lg border text-sm",
                  div.type === 'bullish_divergence' 
                    ? "border-profit/30 bg-profit/5" 
                    : "border-loss/30 bg-loss/5"
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className={cn(
                    "h-3.5 w-3.5",
                    div.type === 'bullish_divergence' ? "text-profit" : "text-loss"
                  )} />
                  <span className={cn(
                    div.type === 'bullish_divergence' ? "text-profit" : "text-loss"
                  )}>
                    {div.symbol.replace('USDT', '')} — Funding/Price Divergence
                  </span>
                  <InfoTooltip content="When funding rate direction contradicts price direction, it signals potential mean-reversion. Bullish divergence = negative funding while price rises. Bearish = positive funding while price falls." />
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-5.5">
                  {div.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Per-Symbol Funding + OI Grid */}
        {combinedData.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No derivatives data available</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {combinedData.map(item => (
              <div 
                key={item.symbol} 
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs font-mono">
                    {item.symbol.replace('USDT', '')}
                  </Badge>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Funding:
                        <InfoTooltip content="Periodic fee between longs and shorts. Positive = longs pay shorts (bullish crowding). Negative = shorts pay longs (bearish crowding)." />
                      </span>
                      <span className={cn(
                        "font-mono font-medium",
                        item.rate > 0 ? "text-profit" : item.rate < 0 ? "text-loss" : "text-muted-foreground"
                      )}>
                        {item.rate > 0 ? '+' : ''}{item.rate.toFixed(4)}%
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Badge variant="outline" className="text-[10px] px-1">
                                P{item.percentile90d}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-sm">Funding rate percentile over the last 90 days. P90+ indicates extreme crowding.</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {item.oi && item.oi.oiChange24hPct !== 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          OI 24h:
                          <InfoTooltip content="24-hour change in open interest (total outstanding derivative contracts). Rising OI with rising price = new money entering; falling OI = positions closing." />
                        </span>
                        <span className={cn(
                          "font-mono font-medium",
                          item.oi.oiChange24hPct > 0 ? "text-profit" : "text-loss"
                        )}>
                          {item.oi.oiChange24hPct > 0 ? '+' : ''}{item.oi.oiChange24hPct.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          {item.oi && item.oi.oiChange24hPct > 5 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-profit" />
                          ) : item.oi && item.oi.oiChange24hPct < -5 ? (
                            <TrendingDown className="h-3.5 w-3.5 text-loss" />
                          ) : (
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">
                          {item.oi && item.oi.oiChange24hPct > 5
                            ? "OI surging >5% — significant new positions opening"
                            : item.oi && item.oi.oiChange24hPct < -5
                            ? "OI dropping >5% — significant positions closing"
                            : "OI change within normal range (±5%)"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FundingOIDashboard(props: FundingOIDashboardProps) {
  return (
    <ErrorBoundary title="Funding & OI Dashboard">
      <FundingOIContent {...props} />
    </ErrorBoundary>
  );
}
