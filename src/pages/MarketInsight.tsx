/**
 * Market Insight Page - Unified Market Analysis Hub
 * Single page view: AI Market Sentiment, AI Macro Analysis, Combined Analysis
 */
import { useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useMarketSentiment, 
  BIAS_VALIDITY_MINUTES,
  useMacroAnalysis, 
  useCombinedAnalysis, 
  useMarketAlerts 
} from "@/features/market-insight";
import { 
  CombinedAnalysisCard,
  AIAnalysisTab,
  BiasExpiryIndicator
} from "@/components/market-insight";
import { useTradeMode } from "@/hooks/use-trade-mode";

const MarketInsight = () => {
  const { tradingStyle } = useTradeMode();
  const { 
    data: sentimentData, 
    isLoading: sentimentLoading, 
    error: sentimentError,
    refetch: refetchSentiment 
  } = useMarketSentiment();
  
  const { 
    data: macroData, 
    isLoading: macroLoading, 
    error: macroError,
    refetch: refetchMacro 
  } = useMacroAnalysis();

  // Combined Crypto + Macro Analysis
  const { 
    data: combinedData, 
    isLoading: combinedLoading 
  } = useCombinedAnalysis();

  // Enable market alerts for extreme conditions
  useMarketAlerts({ 
    enabled: true, 
    fearGreedExtremeThreshold: { low: 25, high: 75 },
    showConflictAlerts: true 
  });

  const handleRefresh = () => {
    refetchSentiment();
    refetchMacro();
  };

  // Compute validUntil locally based on tradingStyle (fixes race condition)
  const validUntil = useMemo(() => {
    const lastUpdated = sentimentData?.sentiment?.lastUpdated || sentimentData?.lastUpdated;
    if (!lastUpdated) return null;
    const minutes = BIAS_VALIDITY_MINUTES[(tradingStyle as keyof typeof BIAS_VALIDITY_MINUTES)] || BIAS_VALIDITY_MINUTES.short_trade;
    return new Date(new Date(lastUpdated).getTime() + minutes * 60 * 1000).toISOString();
  }, [sentimentData, tradingStyle]);

  const isLoading = sentimentLoading || macroLoading;
  const hasError = sentimentError || macroError;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="AI Analysis"
        description="AI-powered market analysis and trading opportunities"
      >
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2" 
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Refresh market insight data"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden="true" />
          Refresh Data
        </Button>
      </PageHeader>
      
      {validUntil && (
        <BiasExpiryIndicator 
          validUntil={validUntil} 
          onExpired={handleRefresh}
          className="w-fit"
        />
      )}

      {/* Error State */}
      {hasError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm">
                Failed to load market data. Please try refreshing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Content - No tabs, direct display */}
      <AIAnalysisTab 
        sentimentData={sentimentData}
        macroData={macroData}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Combined Crypto + Macro Analysis */}
      <CombinedAnalysisCard 
        data={combinedData} 
        isLoading={combinedLoading || sentimentLoading || macroLoading} 
      />
    </div>
  );
};

export default MarketInsight;
