/**
 * Market Data Page - Standalone page for market data tab content
 * Primary entry point for Market domain
 * Layout: 1. Market Sentiment (full), 2. Volatility+Whale grid, 3. Trading Opportunities
 * Dynamic symbol fetching for all widgets (same pattern as Volatility Meter)
 */
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MarketSentimentWidget, WhaleTrackingWidget, TradingOpportunitiesWidget } from "@/components/market";
import { VolatilityMeterWidget } from "@/components/dashboard/VolatilityMeterWidget";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMultiSymbolMarketInsight } from "@/features/market-insight";
import { cn } from "@/lib/utils";

// Base top 5 symbols (USDT format for API)
const TOP_5_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];

export default function MarketData() {
  // Selected pair from Market Sentiment widget
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  
  // Compute symbols to fetch - Top 5 + selected if not in top 5 (same pattern as Volatility)
  const symbolsToFetch = useMemo(() => {
    if (selectedPair && !TOP_5_SYMBOLS.includes(selectedPair)) {
      return [selectedPair, ...TOP_5_SYMBOLS];
    }
    return TOP_5_SYMBOLS;
  }, [selectedPair]);

  // Use new hook that passes symbols to edge function (dynamic fetching)
  const { 
    data: marketData, 
    isLoading,
    error,
    refetch 
  } = useMultiSymbolMarketInsight(symbolsToFetch);

  // Derived formats for selected pair
  const selectedAsset = useMemo(() => selectedPair.replace('USDT', ''), [selectedPair]);

  // Get whale data - already fetched for all requested symbols
  const whaleData = useMemo(() => {
    if (!marketData?.whaleActivity) return [];
    return marketData.whaleActivity.slice(0, 6);
  }, [marketData?.whaleActivity]);

  // Get opportunities data - already fetched for all requested symbols
  const opportunitiesData = useMemo(() => {
    if (!marketData?.opportunities) return [];
    return marketData.opportunities.slice(0, 6);
  }, [marketData?.opportunities]);

  const isSelectedInTop5 = TOP_5_SYMBOLS.includes(selectedPair);
  const apiError = error instanceof Error ? error : error ? new Error(String(error)) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Market Data
            </h1>
            <p className="text-muted-foreground">
              Volatility analysis, trading opportunities, and whale tracking
            </p>
          </div>
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
        </div>

        {/* 1. Market Sentiment - Full Width at Top */}
        <MarketSentimentWidget 
          defaultSymbol="BTCUSDT" 
          showSymbolSelector={true}
          onSymbolChange={setSelectedPair}
        />

        {/* 2. Volatility Meter + Whale Tracker - Grid 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          <VolatilityMeterWidget symbols={symbolsToFetch} />
          
          <WhaleTrackingWidget 
            whaleData={whaleData}
            isLoading={isLoading}
            error={error}
            selectedAsset={selectedAsset}
            isSelectedInTop5={isSelectedInTop5}
            onRetry={() => refetch()}
          />
        </div>

        {/* 3. Trading Opportunities - Full Width at Bottom - Top 5 + selected */}
        <TradingOpportunitiesWidget
          opportunities={opportunitiesData}
          isLoading={isLoading}
          error={apiError}
          selectedAsset={selectedAsset}
          isSelectedInTop5={isSelectedInTop5}
          onRetry={() => refetch()}
        />

        {/* Data Quality Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Data quality: {marketData?.dataQuality ?? '-'}% • 
            Last updated: {marketData?.lastUpdated 
              ? new Date(marketData.lastUpdated).toLocaleTimeString() 
              : '-'}
          </span>
          <span>
            Sources: Binance, CoinGecko, Alternative.me
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
