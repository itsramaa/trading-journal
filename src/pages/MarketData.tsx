/**
 * Market Data Page - Standalone page for market data tab content
 * Primary entry point for Market domain
 * Layout: 1. Market Sentiment (full), 2. Volatility+Whale grid, 3. Trading Opportunities
 * Dynamic symbol fetching for all widgets (same pattern as Volatility Meter)
 */
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MarketSentimentWidget } from "@/components/market";
import { WhaleTrackingWidget } from "@/components/market/WhaleTrackingWidget";
import { VolatilityMeterWidget } from "@/components/dashboard/VolatilityMeterWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, RefreshCw, Target } from "lucide-react";
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
  const selectedOppPair = useMemo(() => `${selectedAsset}/USDT`, [selectedAsset]);

  // Get whale data - already fetched for all requested symbols
  const whaleData = useMemo(() => {
    if (!marketData?.whaleActivity) return [];
    return marketData.whaleActivity.slice(0, 6);
  }, [marketData?.whaleActivity]);

  // Get opportunities data - already fetched for all requested symbols
  const opportunitiesData = useMemo(() => {
    if (!marketData?.opportunities) return [];
    
    // Already sorted by confidence in edge function
    return marketData.opportunities.slice(0, 6);
  }, [marketData?.opportunities]);

  const isSelectedInTop5 = TOP_5_SYMBOLS.includes(selectedPair);

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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Trading Opportunities</CardTitle>
              </div>
              <Badge variant="outline">
                {!isSelectedInTop5 ? `+${selectedAsset}` : 'Top 5'}
              </Badge>
            </div>
            <CardDescription>
              AI-ranked setups based on technicals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : opportunitiesData.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No trading opportunities found</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {opportunitiesData.map((opp, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 rounded-lg border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{opp.pair}</span>
                        <Badge 
                          variant={opp.direction === 'LONG' ? 'default' : opp.direction === 'SHORT' ? 'destructive' : 'secondary'}
                        >
                          {opp.direction}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold">{opp.confidence}%</span>
                        <span className="text-xs text-muted-foreground">conf.</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{opp.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
