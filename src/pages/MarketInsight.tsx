/**
 * Market Bias Page - Regime Classification Engine
 * Single decisional output: Regime, Direction, Expected Move, Risk Mode, Size
 */
import { useMemo, useCallback, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp,
  TrendingDown, 
  RefreshCw,
  Activity,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { 
  useMarketSentiment, 
  BIAS_VALIDITY_MINUTES,
  useMacroAnalysis, 
  useMarketAlerts 
} from "@/features/market-insight";
import { useEconomicCalendar } from "@/features/calendar";
import { 
  BiasExpiryIndicator
} from "@/components/market-insight";
import { RegimeCard } from "@/components/market-insight/RegimeCard";
import { useTradeMode } from "@/hooks/use-trade-mode";
import type { MacroCorrelation } from "@/features/market-insight/types";

const MarketInsight = () => {
  const [retryKey, setRetryKey] = useState(0);
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

  // Pass BTC realized vol to calendar for range floor
  const btcRealizedVol = sentimentData?.volatility?.[0]?.annualizedVolatility;
  const {
    data: calendarData,
    isLoading: calendarLoading,
  } = useEconomicCalendar(btcRealizedVol);

  // Enable market alerts for extreme conditions
  useMarketAlerts({ 
    enabled: true, 
    fearGreedExtremeThreshold: { low: 25, high: 75 },
    showConflictAlerts: true 
  });

  const handleRefresh = useCallback(() => {
    refetchSentiment();
    refetchMacro();
  }, [refetchSentiment, refetchMacro]);

  // Compute validUntil locally based on tradingStyle (fixes race condition)
  const validUntil = useMemo(() => {
    const lastUpdated = sentimentData?.sentiment?.lastUpdated || sentimentData?.lastUpdated;
    if (!lastUpdated) return null;
    const minutes = BIAS_VALIDITY_MINUTES[(tradingStyle as keyof typeof BIAS_VALIDITY_MINUTES)] || BIAS_VALIDITY_MINUTES.short_trade;
    return new Date(new Date(lastUpdated).getTime() + minutes * 60 * 1000).toISOString();
  }, [sentimentData, tradingStyle]);

  const isLoading = sentimentLoading || macroLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        title="Market Bias"
        description="Regime classification engine — decisional market synthesis"
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

      <ErrorBoundary
        title="Market Bias"
        onRetry={() => setRetryKey(k => k + 1)}
      >
        <div key={retryKey} className="space-y-6">
          {validUntil && (
            <BiasExpiryIndicator 
              validUntil={validUntil} 
              onExpired={handleRefresh}
              className="w-fit"
            />
          )}

          {/* Regime Classification — Single decisional card */}
          <RegimeCard 
            sentimentData={sentimentData}
            macroData={macroData}
            calendarData={calendarData}
            tradingStyle={tradingStyle}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            error={sentimentError || macroError || null}
          />

          {/* Condensed Signals List */}
          {!isLoading && sentimentData?.sentiment?.signals && (
            <SignalsGrid signals={sentimentData.sentiment.signals} />
          )}

          {/* Macro Correlations Grid — data only, no AI narrative */}
          {!isLoading && macroData?.macro?.correlations && (
            <MacroGrid correlations={macroData.macro.correlations} />
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
};

/** Condensed signals list — no narrative */
function SignalsGrid({ signals }: { signals: Array<{ asset: string; trend: string; direction: 'up' | 'down' | 'neutral'; price?: number; change24h?: number }> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Key Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {signals.map((signal) => (
            <div key={signal.asset} className="flex items-center justify-between p-2 rounded border">
              <div className="flex items-center gap-2">
                {signal.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-profit" />
                ) : signal.direction === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-loss" />
                ) : (
                  <Activity className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{signal.asset}</span>
                {signal.price && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ${signal.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                )}
                {signal.change24h !== undefined && (
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-mono",
                    signal.change24h >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {signal.change24h >= 0 ? '+' : ''}{signal.change24h.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground text-right max-w-[50%] truncate">{signal.trend}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Macro correlations — raw data grid, no AI summary */
function MacroGrid({ correlations }: { correlations: MacroCorrelation[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Macro Indicators
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {correlations.map((item) => (
            <div key={item.name} className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex items-center gap-1">
                  {item.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-profit" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-loss" />
                  )}
                  <span className={cn(
                    "text-xs font-mono",
                    item.change >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="text-lg font-bold font-mono">
                {typeof item.value === 'number' && item.value > 1000 
                  ? item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : item.value.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{item.impact}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketInsight;
