/**
 * RegimeCard - Unified regime classification display with style-aware orchestrated risk output
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ErrorBoundary, AsyncErrorFallback } from "@/components/ui/error-boundary";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from "@/components/ui/tooltip";
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
import { TRADING_STYLE_LABELS, type TradingStyle } from "@/hooks/trading/use-trade-mode";
import type { MarketInsightResponse, MacroAnalysisResponse } from "@/features/market-insight/types";
import type { EconomicCalendarResponse } from "@/features/calendar/types";

interface RegimeCardProps {
  sentimentData?: MarketInsightResponse;
  macroData?: MacroAnalysisResponse;
  calendarData?: EconomicCalendarResponse;
  tradingStyle?: TradingStyle;
  isLoading: boolean;
  onRefresh: () => void;
  error?: Error | null;
}

function RegimeCardContent({ sentimentData, macroData, calendarData, tradingStyle, isLoading, onRefresh, error }: RegimeCardProps) {
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
      eventRiskLevel: (calendarData?.impactSummary?.riskLevel as 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH') ?? 'LOW',
      tradingStyle,
    });

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
      tradingStyle,
    });

    return { regime: regimeResult, unified: unifiedResult };
  }, [sentimentData, macroData, calendarData, tradingStyle]);

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
  const directionLabel = regime.styleContext?.directionLabel ?? 'Direction (24h)';
  const rangeLabel = regime.styleContext?.horizonLabel ? `Expected Range (${regime.styleContext.horizonLabel})` : 'Expected Range';
  const styleLabel = tradingStyle ? TRADING_STYLE_LABELS[tradingStyle] : undefined;

  return (
    <Card className={cn("border-2", regimeStyle.bgClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Market Regime</CardTitle>
            <InfoTooltip content="The classified market state based on a composite of technical, on-chain, macro, and sentiment signals. Determines risk mode and position sizing." />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Badge className={cn("text-sm font-bold cursor-default", regimeStyle.colorClass, "bg-background/80 border")}>
                    {regimeStyle.label}
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">Trending Bullish: Score &gt;65, positive momentum. Trending Bearish: Score &lt;35. Ranging: 35-65 or no clear momentum. High Volatility: Elevated vol override. Risk Off: Extreme event risk override.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
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
                <span className="text-sm font-medium">{directionLabel}</span>
                <InfoTooltip content="Estimated probability of upward price movement over the style-specific horizon. Derived from the composite score. 50% = neutral." />
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
                <span className="text-sm font-medium">{rangeLabel}</span>
                <InfoTooltip content="Estimated price movement range based on ATR, volatility regime, and momentum skew. Scaled to the selected trading style horizon using sqrt-time." />
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
                <InfoTooltip content="Aggressive: Trend + alignment confirmed, normal sizing. Neutral: No strong conviction, reduce 30%. Defensive: Conflict, high vol, or event risk — reduce 50-75%." />
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
                <InfoTooltip content="Unified position size recommendation from the Risk Orchestrator. Blends calendar, regime, and volatility signals. Style-weighted with a hard floor at 25%." />
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
            <div className="flex flex-wrap items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">Score {regime.regimeScore}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Composite market score (0-100). Weighted: Tech 35%, On-Chain 20%, Macro 25%, Fear/Greed 20%. A divergence penalty (max 5pts) applies when factors conflict.</p>
                </TooltipContent>
              </Tooltip>
              <span>|</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">Tech {regime.breakdown.technical}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Technical analysis score (0-100) from price action, trend indicators, and momentum signals.</p>
                </TooltipContent>
              </Tooltip>
              <span>|</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">Macro {regime.breakdown.macro}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Macroeconomic score (0-100) reflecting conditions like DXY, bond yields, and liquidity.</p>
                </TooltipContent>
              </Tooltip>
              <span>|</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">F&G {regime.breakdown.fearGreed}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Fear & Greed Index (0-100). Non-linear transform: extreme values (&lt;20, &gt;80) are treated as contrarian mean-reversion signals.</p>
                </TooltipContent>
              </Tooltip>
              {styleLabel && (
                <>
                  <span>|</span>
                  <span>{styleLabel} context</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 font-mono">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">Cal {unified.breakdown.calendarMultiplier.toFixed(1)}x</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Calendar multiplier (0.25-1.0). Reduces size when high-impact economic events are imminent.</p>
                </TooltipContent>
              </Tooltip>
              <span>·</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">Reg {unified.breakdown.regimeMultiplier.toFixed(1)}x</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Regime multiplier. Derived from risk mode: Aggressive=1.0, Neutral=0.7, Defensive=0.25-0.5.</p>
                </TooltipContent>
              </Tooltip>
              <span>·</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">Vol {unified.breakdown.volatilityMultiplier.toFixed(1)}x</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Volatility multiplier (0.5-1.0). Reduces size when annualized BTC volatility exceeds 80%.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {regime.alignment} · {unified.dominantFactor} · {unified.mode}
            </Badge>
          </div>
        </TooltipProvider>
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
