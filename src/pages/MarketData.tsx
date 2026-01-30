/**
 * Market Data Page - Standalone page for market data tab content
 * Primary entry point for Market domain
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MarketDataTab } from "@/components/market-insight/MarketDataTab";
import { MarketSentimentWidget } from "@/components/market";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarketSentiment } from "@/features/market-insight";
import { cn } from "@/lib/utils";

export default function MarketData() {
  const { 
    data: sentimentData, 
    isLoading: sentimentLoading, 
    refetch: refetchSentiment 
  } = useMarketSentiment();

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

        {/* Market Sentiment Widget - Full width at top */}
        <MarketSentimentWidget 
          defaultSymbol="BTCUSDT" 
          showSymbolSelector={true}
        />

        {/* Market Data Content */}
        <MarketDataTab 
          sentimentData={sentimentData}
          isLoading={sentimentLoading}
        />
      </div>
    </DashboardLayout>
  );
}
