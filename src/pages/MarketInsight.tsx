/**
 * Market Insight Page - Unified Market Analysis Hub
 * Tabs: AI Analysis | Calendar | Market Data
 * Combines: Sentiment, Macro, Economic Calendar, Volatility, Whale Tracking
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  RefreshCw, 
  AlertTriangle,
  Sparkles,
  Calendar,
  BarChart3
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
  AIAnalysisTab,
  CalendarTab,
  MarketDataTab 
} from "@/components/market-insight";

type TabValue = "analysis" | "calendar" | "market-data";

const MarketInsight = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as TabValue | null;
  const [activeTab, setActiveTab] = useState<TabValue>(tabFromUrl || "analysis");

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && ["analysis", "calendar", "market-data"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
              AI-powered market analysis, economic calendar, and trading opportunities
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

        {/* Combined Crypto + Macro Analysis - Always visible */}
        <CombinedAnalysisCard 
          data={combinedData} 
          isLoading={combinedLoading || sentimentLoading || macroLoading} 
        />

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Analysis</span>
              <span className="sm:hidden">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Economic Calendar</span>
              <span className="sm:hidden">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="market-data" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Market Data</span>
              <span className="sm:hidden">Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-0">
            <AIAnalysisTab 
              sentimentData={sentimentData}
              macroData={macroData}
              isLoading={isLoading}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-0">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="market-data" className="space-y-0">
            <MarketDataTab 
              sentimentData={sentimentData}
              isLoading={sentimentLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MarketInsight;
