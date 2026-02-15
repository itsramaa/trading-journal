/**
 * RegimeCard - Unified regime classification display with orchestrated risk output
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ErrorBoundary, AsyncErrorFallback } from "@/components/ui/error-boundary";
import { 
  Gauge, TrendingUp, TrendingDown, Activity, Minus, Shield, Crosshair
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  classifyMarketRegime, REGIME_CONFIG, RISK_MODE_CONFIG, type RegimeOutput 
} from "@/lib/regime-classification";
import { 
  calculateUnifiedPositionSize, deriveVolatilityMultiplier, type UnifiedRiskOutput 
} from "@/lib/unified-risk-orchestrator";
import type { MarketInsightResponse, MacroAnalysisResponse } from "@/features/market-insight/types";
import type { EconomicCalendarResponse } from "@/features/calendar/types";

interface RegimeCardProps {
  sentimentData?: MarketInsightResponse;
  macroData?: MacroAnalysisResponse;
  calendarData?: EconomicCalendarResponse;
  isLoading: boolean;
  onRefresh: () => void;
  error?: Error | null;
}

function RegimeCardContent({ sentimentData, macroData, calendarData, isLoading, onRefresh, error }: RegimeCardProps) {
  const { regime, unified } = useMemo<{ regime: RegimeOutput | null; unified: UnifiedRiskOutput | null }>(() => {
    if (!sentimentData?.sentiment || !macroData?.macro) return { regime: null, unified: null };

    const regimeResult = classifyMarketRegime({
      technicalScore: sentimentData.sentiment.technicalScore,
      onChainScore: sentimentData.sentiment.onChainScore,
      macroScore: sentimentData.sentiment.macroScore,
      fearGreedValue: sentimentData.sentiment.fearGreed.value,
      overallSentiment: sentimentData.sentiment.overall,
      macroSentiment: macroData.macro.overallSentiment,
      volatilityLevel: sentimentData.volatility?.[0]?.level as 'low' | 'medium' | 'high',
      momentum24h: sentimentData.sentiment.signals?.[0]?.change24h,
      // Feed calendar event risk into regime engine
      eventRiskLevel: (calendarData?.impactSummary?.riskLevel as 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH') ?? 'LOW',
    });

    // Derive volatility multiplier from BTC annualized vol
    const btcVol = sentimentData.volatility?.[0]?.annualizedVolatility ?? 50;
    const volMultiplier = deriveVolatilityMultiplier(btcVol);

    const isTrending = regimeResult.regime === 'TRENDING_BULL' || regimeResult.regime === 'TRENDING_BEAR';
    const eventRisk = (calendarData?.impactSummary?.riskLevel as 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH') ?? 'LOW';

    const unifiedResult = calculateUnifiedPositionSize({
      calendarMultiplier: calendarData?.volatilityEngine?.positionSizeMultiplier ?? 1.0,
      regimeMultiplier: regimeResult.sizePercent / 100,
      volatilityMultiplier: volMultiplier,
      regimeIsTrending: isTrending,
      eventRiskLevel: eventRisk,
    });

    return { regime: regimeResult, unified: unifiedResult };
  }, [sentimentData, macroData, calendarData]);

  if (error) {
    return <AsyncErrorFallback error={error} onRetry={onRefresh} title="Failed to load regime analysis" />;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!regime || !unified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />Market Regime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to classify market regime. Please refresh data.</p>
        </CardContent>
      </Card>
    );
  }

  const regimeStyle = REGIME_CONFIG[regime.regime];
  const riskModeStyle = RISK_MODE_CONFIG[regime.riskMode];

  return (
    <Card className={cn("border-2", regimeStyle.bgClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Market Regime</CardTitle>
          </div>
          <Badge className={cn("text-sm font-bold", regimeStyle.colorClass, "bg-background/80 border")}>
            {regimeStyle.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {/* 1. Direction Probability */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/60">
            <div className="flex items-center gap-2">
              {regime.directionProbability > 50 ? (
                <TrendingUp className="h-4 w-4 text-profit" />
              ) : regime.directionProbability < 50 ? (
                <TrendingDown className="h-4 w-4 text-loss" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Direction (24h)</span>
            </div>
            <div className="flex items-center gap-3">
              <Progress 
                value={regime.directionProbability} 
                className={cn(
                  "w-20 h-2",
                  regime.directionProbability > 55 && "[&>div]:bg-profit",
                  regime.directionProbability < 45 && "[&>div]:bg-loss"
                )}
              />
              <span className="text-sm font-bold tabular-nums w-12 text-right">
                {regime.directionProbability}% up
              </span>
            </div>
          </div>

          {/* 2. Expected Range */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/60">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Expected Range</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-loss">{regime.expectedRange.low}%</span>
              <span className="text-muted-foreground">to</span>
              <span className="text-profit">+{regime.expectedRange.high}%</span>
            </div>
          </div>

          {/* 3. Risk Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/60">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Risk Mode</span>
            </div>
            <Badge variant="outline" className={cn("font-bold", riskModeStyle.colorClass)}>
              {riskModeStyle.label}
            </Badge>
          </div>

          {/* 4. Unified Position Size */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/60">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Position Size</span>
            </div>
            <span className={cn(
              "text-sm font-bold",
              unified.finalSizePercent >= 100 ? "text-profit" : unified.finalSizePercent <= 50 ? "text-loss" : "text-muted-foreground"
            )}>
              {unified.finalSizeLabel}
            </span>
          </div>
        </div>

        {/* Breakdown Footer */}
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50 gap-1">
          <span>
            Score {regime.regimeScore} | Tech {regime.breakdown.technical} | Macro {regime.breakdown.macro} | F&G {regime.breakdown.fearGreed}
          </span>
          <span className="font-mono">
            Cal {unified.breakdown.calendarMultiplier.toFixed(1)}x · Reg {unified.breakdown.regimeMultiplier.toFixed(1)}x · Vol {unified.breakdown.volatilityMultiplier.toFixed(1)}x
          </span>
          <Badge variant="outline" className="text-[10px]">
            {regime.alignment} · {unified.dominantFactor} · {unified.mode}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function RegimeCard(props: RegimeCardProps) {
  return (
    <ErrorBoundary title="Market Regime" onRetry={props.onRefresh}>
      <RegimeCardContent {...props} />
    </ErrorBoundary>
  );
}
