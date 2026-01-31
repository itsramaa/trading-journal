/**
 * Market Data Page - Standalone page for market data tab content
 * Primary entry point for Market domain
 * Layout: 1. Market Sentiment (full), 2. Volatility+Whale grid, 3. Trading Opportunities
 * Top 5 for all widgets + selected pair sync
 */
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MarketSentimentWidget } from "@/components/market";
import { VolatilityMeterWidget } from "@/components/dashboard/VolatilityMeterWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, RefreshCw, Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarketSentiment } from "@/features/market-insight";
import { cn } from "@/lib/utils";
import type { WhaleSignal } from "@/features/market-insight/types";

// Top 5 assets (format used by whale API: 'BTC', 'ETH', etc.)
const TOP_5_ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'];
// Top 5 pairs (format used by volatility API: 'BTCUSDT', etc.)
const TOP_5_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];
// Top 5 opportunity pairs (format used by opportunities API: 'BTC/USDT', etc.)
const TOP_5_OPP_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT'];

export default function MarketData() {
  // Selected pair from Market Sentiment widget
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  
  const { 
    data: sentimentData, 
    isLoading: sentimentLoading, 
    refetch: refetchSentiment 
  } = useMarketSentiment();

  // Derived formats for selected pair
  const selectedAsset = useMemo(() => selectedPair.replace('USDT', ''), [selectedPair]);
  const selectedOppPair = useMemo(() => `${selectedAsset}/USDT`, [selectedAsset]);

  const getWhaleSignalColor = (signal: WhaleSignal) => {
    switch (signal) {
      case 'ACCUMULATION': return 'bg-profit';
      case 'DISTRIBUTION': return 'bg-loss';
      default: return 'bg-muted-foreground';
    }
  };

  // Volatility symbols - add selected pair at top if not in top 5
  const volatilitySymbols = useMemo(() => {
    if (selectedPair && !TOP_5_PAIRS.includes(selectedPair)) {
      return [selectedPair, ...TOP_5_PAIRS];
    }
    return TOP_5_PAIRS;
  }, [selectedPair]);

  // Get whale data - top 5 assets + selected if not in top 5
  // With fallback to any available data if top 5 not present
  const getWhaleData = () => {
    if (!sentimentData?.whaleActivity) return [];
    
    const allWhales = sentimentData.whaleActivity;
    if (allWhales.length === 0) return [];
    
    const isSelectedInTop5 = TOP_5_ASSETS.includes(selectedAsset);
    
    // Get top 5 whale data
    let result = allWhales.filter(w => TOP_5_ASSETS.includes(w.asset));
    
    // Fallback: if no top 5 data, use first 5 available
    if (result.length === 0) {
      result = allWhales.slice(0, 5);
    }
    
    // If selected is NOT in top 5, find it and add to front
    if (!isSelectedInTop5) {
      const selectedWhale = allWhales.find(w => w.asset === selectedAsset);
      if (selectedWhale) {
        result = [selectedWhale, ...result.filter(w => w.asset !== selectedAsset).slice(0, 4)];
      }
    }
    
    return result.slice(0, 5);
  };

  // Get opportunities data - top 5 pairs + selected if not in top 5
  // With fallback to any available data if top 5 not present
  const getOpportunitiesData = () => {
    if (!sentimentData?.opportunities) return [];
    
    const allOpps = sentimentData.opportunities;
    if (allOpps.length === 0) return [];
    
    const isSelectedInTop5 = TOP_5_OPP_PAIRS.includes(selectedOppPair);
    
    // Get top 5 opportunity data
    let result = allOpps.filter(o => TOP_5_OPP_PAIRS.includes(o.pair));
    
    // Fallback: if no top 5 data, use first 5 available
    if (result.length === 0) {
      result = allOpps.slice(0, 5);
    }
    
    // If selected is NOT in top 5, find it and add to front
    if (!isSelectedInTop5) {
      const selectedOpp = allOpps.find(o => o.pair === selectedOppPair);
      if (selectedOpp) {
        result = [selectedOpp, ...result.filter(o => o.pair !== selectedOppPair).slice(0, 4)];
      }
    }
    
    return result.slice(0, 5);
  };

  const whaleData = getWhaleData();
  const opportunitiesData = getOpportunitiesData();

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
            onClick={() => refetchSentiment()}
            disabled={sentimentLoading}
          >
            <RefreshCw className={cn("h-4 w-4", sentimentLoading && "animate-spin")} />
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
          <VolatilityMeterWidget symbols={volatilitySymbols} />
          
          {/* AI Whale Tracking - Top 5 + selected */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Whale Tracking</CardTitle>
                </div>
                <Badge variant="outline">
                  {!TOP_5_ASSETS.includes(selectedAsset) ? `+${selectedAsset}` : 'Top 5'}
                </Badge>
              </div>
              <CardDescription>
                Volume-based whale activity detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentimentLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : whaleData.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No whale activity detected</p>
                </div>
              ) : whaleData.map((whale, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      getWhaleSignalColor(whale.signal)
                    )} />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{whale.asset}</Badge>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            whale.signal === 'ACCUMULATION' && "bg-profit/20 text-profit",
                            whale.signal === 'DISTRIBUTION' && "bg-loss/20 text-loss"
                          )}
                        >
                          {whale.signal}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{whale.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium">
                      {whale.volumeChange24h > 0 ? '+' : ''}{whale.volumeChange24h.toFixed(1)}%
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {whale.confidence}% conf.
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
                {!TOP_5_OPP_PAIRS.includes(selectedOppPair) ? `+${selectedAsset}` : 'Top 5'}
              </Badge>
            </div>
            <CardDescription>
              AI-ranked setups based on technicals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentLoading ? (
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
            Data quality: {sentimentData?.dataQuality ?? '-'}% • 
            Last updated: {sentimentData?.lastUpdated 
              ? new Date(sentimentData.lastUpdated).toLocaleTimeString() 
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
