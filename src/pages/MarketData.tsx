/**
 * Market Data Page - Standalone page for market data tab content
 */
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { MarketSentimentWidget, WhaleTrackingWidget, TradingOpportunitiesWidget } from "@/components/market";
import { VolatilityMeterWidget } from "@/components/dashboard/VolatilityMeterWidget";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMultiSymbolMarketInsight } from "@/features/market-insight";
import { cn } from "@/lib/utils";
import { 
  DEFAULT_WATCHLIST_SYMBOLS, 
  DEFAULT_SYMBOL,
  DISPLAY_LIMITS,
  formatDataSources,
  BADGE_LABELS 
} from "@/lib/constants/market-config";

export default function MarketData() {
  const [selectedPair, setSelectedPair] = useState(DEFAULT_SYMBOL);
  
  const symbolsToFetch = useMemo(() => {
    const watchlist = [...DEFAULT_WATCHLIST_SYMBOLS];
    if (selectedPair && !watchlist.includes(selectedPair as any)) {
      return [selectedPair, ...watchlist];
    }
    return watchlist;
  }, [selectedPair]);

  const { 
    data: marketData, 
    isLoading,
    error,
    refetch 
  } = useMultiSymbolMarketInsight(symbolsToFetch);

  const selectedAsset = useMemo(() => selectedPair.replace('USDT', ''), [selectedPair]);

  const whaleData = useMemo(() => {
    if (!marketData?.whaleActivity) return [];
    return marketData.whaleActivity.slice(0, DISPLAY_LIMITS.WHALE_ACTIVITY);
  }, [marketData?.whaleActivity]);

  const opportunitiesData = useMemo(() => {
    if (!marketData?.opportunities) return [];
    return marketData.opportunities.slice(0, DISPLAY_LIMITS.TRADING_OPPORTUNITIES);
  }, [marketData?.opportunities]);

  const isSelectedInWatchlist = (DEFAULT_WATCHLIST_SYMBOLS as readonly string[]).includes(selectedPair);
  const apiError = error instanceof Error ? error : error ? new Error(String(error)) : null;

  return (
    <div className="space-y-6">
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
        defaultSymbol="BTCUSDT" 
        showSymbolSelector={true}
        onSymbolChange={setSelectedPair}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <VolatilityMeterWidget symbols={symbolsToFetch as string[]} />
        
        <WhaleTrackingWidget 
          whaleData={whaleData}
          isLoading={isLoading}
          error={error}
          selectedAsset={selectedAsset}
          isSelectedInWatchlist={isSelectedInWatchlist}
          onRetry={() => refetch()}
        />
      </div>

      <TradingOpportunitiesWidget
        opportunities={opportunitiesData}
        isLoading={isLoading}
        error={apiError}
        selectedAsset={selectedAsset}
        isSelectedInWatchlist={isSelectedInWatchlist}
        onRetry={() => refetch()}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
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
