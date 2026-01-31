/**
 * Market Data Page - Standalone page for market data tab content
 * Primary entry point for Market domain
 * Layout: 1. Market Sentiment (full), 2. Volatility+Whale grid, 3. Trading Opportunities
 * Top 5 for all widgets
 */
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

// Top 5 pairs for default display
const TOP_5_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];

export default function MarketData() {
  const { 
    data: sentimentData, 
    isLoading: sentimentLoading, 
    refetch: refetchSentiment 
  } = useMarketSentiment();

  const getWhaleSignalColor = (signal: WhaleSignal) => {
    switch (signal) {
      case 'ACCUMULATION': return 'bg-profit';
      case 'DISTRIBUTION': return 'bg-loss';
      default: return 'bg-muted-foreground';
    }
  };

  // Get whale data - top 5 pairs only
  const getWhaleData = () => {
    if (!sentimentData?.whaleActivity) return [];
    
    // Filter to top 5 pairs
    return sentimentData.whaleActivity.filter(w => 
      TOP_5_PAIRS.includes(w.asset)
    ).slice(0, 5);
  };

  // Get opportunities data - top 5 pairs only
  const getOpportunitiesData = () => {
    if (!sentimentData?.opportunities) return [];
    
    // Filter to top 5 pairs
    return sentimentData.opportunities.filter(o => 
      TOP_5_PAIRS.includes(o.pair)
    ).slice(0, 5);
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
        />

        {/* 2. Volatility Meter + Whale Tracker - Grid 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          <VolatilityMeterWidget />
          
          {/* AI Whale Tracking - Top 5 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Whale Tracking</CardTitle>
                </div>
                <Badge variant="outline">Top 5</Badge>
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

        {/* 3. Trading Opportunities - Full Width at Bottom - Top 5 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Trading Opportunities</CardTitle>
              </div>
              <Badge variant="outline">Top 5</Badge>
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
