/**
 * Market Insight Page - Unified Market Analysis Hub
 * Single page view: AI Market Sentiment, AI Macro Analysis, Combined Analysis
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  useMacroAnalysis, 
  useCombinedAnalysis, 
  useMarketAlerts 
} from "@/features/market-insight";
import { 
  CombinedAnalysisCard,
  AIAnalysisTab
} from "@/components/market-insight";

const MarketInsight = () => {
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

  const isLoading = sentimentLoading || macroLoading;
  const hasError = sentimentError || macroError;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Market Insight
            </h1>
            <p className="text-muted-foreground">
              AI-powered market analysis and trading opportunities
            </p>
          </div>
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
        </div>

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
    </DashboardLayout>
  );
};

export default MarketInsight;
