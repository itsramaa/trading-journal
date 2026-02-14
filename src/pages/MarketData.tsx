/**
 * Market Data Page - Standalone page for market data tab content
 * Uses global MarketContext for cross-page symbol persistence
 */
import { useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { MarketSentimentWidget, WhaleTrackingWidget, TradingOpportunitiesWidget, VolatilityMeterWidget } from "@/components/market";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMultiSymbolMarketInsight } from "@/features/market-insight";
import { cn } from "@/lib/utils";
import { useMarketContext } from "@/contexts/MarketContext";
import { normalizeError } from "@/lib/error-utils";
import { 
  DEFAULT_WATCHLIST_SYMBOLS, 
  DISPLAY_LIMITS,
  formatDataSources,
} from "@/lib/constants/market-config";

export default function MarketData() {
  const { selectedSymbol, setSelectedSymbol } = useMarketContext();
  
  const symbolsToFetch = useMemo(() => {
    const watchlist = [...DEFAULT_WATCHLIST_SYMBOLS];
    if (selectedSymbol && !watchlist.includes(selectedSymbol as any)) {
      return [selectedSymbol, ...watchlist];
    }
    return watchlist;
  }, [selectedSymbol]);

  const { 
    data: marketData, 
    isLoading,
    error,
    refetch 
  } = useMultiSymbolMarketInsight(symbolsToFetch);

  const selectedAsset = useMemo(() => selectedSymbol.replace('USDT', ''), [selectedSymbol]);

  const whaleData = useMemo(() => {
    if (!marketData?.whaleActivity) return [];
    return marketData.whaleActivity.slice(0, DISPLAY_LIMITS.WHALE_ACTIVITY);
  }, [marketData?.whaleActivity]);

  const opportunitiesData = useMemo(() => {
    if (!marketData?.opportunities) return [];
    return marketData.opportunities.slice(0, DISPLAY_LIMITS.TRADING_OPPORTUNITIES);
  }, [marketData?.opportunities]);

  const isSelectedInWatchlist = (DEFAULT_WATCHLIST_SYMBOLS as readonly string[]).includes(selectedSymbol);
  const normalizedError = normalizeError(error);

  return (
    <div className="space-y-6" role="region" aria-label="Market Data Dashboard">
      <PageHeader
        icon={BarChart3}
        title="Market Data"
        description="Volatility analysis, trading opportunities, and whale tracking"
      >
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2" 
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </PageHeader>

      <MarketSentimentWidget 
        symbol={selectedSymbol}
        showSymbolSelector={true}
        onSymbolChange={setSelectedSymbol}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <VolatilityMeterWidget symbols={symbolsToFetch as string[]} />
        
        <WhaleTrackingWidget 
          whaleData={whaleData}
          isLoading={isLoading}
          error={normalizedError}
          selectedAsset={selectedAsset}
          isSelectedInWatchlist={isSelectedInWatchlist}
          onRetry={() => refetch()}
        />
      </div>

      <TradingOpportunitiesWidget
        opportunities={opportunitiesData}
        isLoading={isLoading}
        error={normalizedError}
        selectedAsset={selectedAsset}
        isSelectedInWatchlist={isSelectedInWatchlist}
        onRetry={() => refetch()}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Data quality: {marketData?.dataQuality ?? '-'}% • 
          Last updated: {marketData?.lastUpdated 
            ? new Date(marketData.lastUpdated).toLocaleTimeString() 
            : '-'}
        </span>
        <span>
          {formatDataSources()}
        </span>
      </div>
    </div>
  );
}
