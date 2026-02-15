/**
 * Risk Adjustment Breakdown Component
 * Visual breakdown of all risk adjustment factors and reasoning
 * Shows how base risk is modified by market conditions
 * 
 * Uses useContextAwareRisk hook for calculation logic (Phase 2)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Scale, 
  Activity, 
  Calendar, 
  TrendingUp, 
  History, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Minus,
  BarChart3
} from "lucide-react";
import { useContextAwareRisk, type AdjustmentLevel, type AdjustmentFactor } from "@/hooks/use-context-aware-risk";
import { cn } from "@/lib/utils";

interface RiskAdjustmentBreakdownProps {
  symbol?: string;
  baseRiskPercent?: number;
}

// Icon mapping for adjustment factors
const FACTOR_ICONS: Record<string, typeof Scale> = {
  volatility: Activity,
  event: Calendar,
  sentiment: TrendingUp,
  momentum: History,
  performance: BarChart3,
};

export function RiskAdjustmentBreakdown({ 
  symbol = 'BTCUSDT',
  baseRiskPercent 
}: RiskAdjustmentBreakdownProps) {
  // Use the centralized hook for all calculations
  const {
    baseRisk,
    adjustedRisk,
    totalMultiplier,
    adjustmentFactors,
    recommendationLabel,
    isLoading,
  } = useContextAwareRisk({ symbol, baseRiskPercent });

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier > 1) return 'text-profit';
    if (multiplier < 0.8) return 'text-destructive';
    if (multiplier < 1) return 'text-[hsl(var(--chart-4))]';
    return 'text-muted-foreground';
  };

  const getLevelIcon = (level: AdjustmentLevel) => {
    switch (level) {
      case 'positive': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'danger': return AlertTriangle;
      default: return Minus;
    }
  };

  const getLevelStyles = (level: AdjustmentLevel) => {
    switch (level) {
      case 'positive':
        return 'border-profit/30 bg-profit/5';
      case 'warning':
        return 'border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/5';
      case 'danger':
        return 'border-destructive/30 bg-destructive/5';
      default:
        return 'border-border bg-muted/30';
    }
  };

  const getLevelIconColor = (level: AdjustmentLevel) => {
    switch (level) {
      case 'positive': return 'text-profit';
      case 'warning': return 'text-[hsl(var(--chart-4))]';
      case 'danger': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-5 w-5 text-primary" />
          Risk Adjustment Breakdown
          <InfoTooltip
            content="Shows how your base risk is adjusted based on current market conditions including volatility, events, sentiment, momentum, and historical performance."
            variant="help"
          />
        </CardTitle>
        <CardDescription>
          Context-aware position sizing adjustments for {symbol}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base Risk Display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Base Risk (from profile)</span>
            <InfoTooltip
              content="Your configured risk per trade from Risk Profile Settings. This is the starting point before market adjustments."
              variant="info"
            />
          </div>
          <Badge variant="secondary" className="text-base font-bold">
            {baseRisk}%
          </Badge>
        </div>

        {/* Adjustment Factors */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Activity className="h-4 w-4 animate-pulse mr-2" />
              Analyzing market conditions...
            </div>
          ) : (
            adjustmentFactors.map((factor) => {
              const FactorIcon = FACTOR_ICONS[factor.id] || Scale;
              const LevelIcon = getLevelIcon(factor.level);
              
              return (
                <div
                  key={factor.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    getLevelStyles(factor.level)
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FactorIcon className={cn("h-4 w-4 mt-0.5 shrink-0", getLevelIconColor(factor.level))} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{factor.name}</span>
                          {factor.value && (
                            <Badge variant="outline" className="text-xs">
                              {factor.value}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {factor.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("text-sm font-bold cursor-help", getMultiplierColor(factor.multiplier))}>
                              ×{factor.multiplier.toFixed(2)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">Multiplier applied to base risk. Values below 1.0 reduce risk, above 1.0 increase it.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <LevelIcon className={cn("h-4 w-4", getLevelIconColor(factor.level))} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Separator />

        {/* Final Calculation */}
        <div className="space-y-3">
          {/* Calculation Formula */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>{baseRisk}%</span>
            {adjustmentFactors.map((f) => (
              <span key={f.id} className="flex items-center gap-1">
                <span>×</span>
                <span className={getMultiplierColor(f.multiplier)}>
                  {f.multiplier.toFixed(2)}
                </span>
              </span>
            ))}
            <ArrowRight className="h-4 w-4 mx-1" />
            <span className="font-bold text-foreground">{adjustedRisk}%</span>
          </div>

          {/* Final Result */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            totalMultiplier < 0.7 ? "border-destructive/50 bg-destructive/5" :
            totalMultiplier < 1 ? "border-[hsl(var(--chart-4))]/50 bg-[hsl(var(--chart-4))]/5" :
            totalMultiplier > 1 ? "border-profit/50 bg-profit/5" :
            "border-primary/50 bg-primary/5"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Adjusted Risk Per Trade
                  <InfoTooltip
                    content="Final risk percentage after all market condition adjustments are applied. Use this value for your next position sizing."
                    variant="info"
                  />
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn(
                    "text-3xl font-bold",
                    totalMultiplier < 0.7 ? "text-destructive" :
                    totalMultiplier < 1 ? "text-[hsl(var(--chart-4))]" :
                    totalMultiplier > 1 ? "text-profit" :
                    "text-primary"
                  )}>
                    {adjustedRisk}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    (×{totalMultiplier.toFixed(2)} total)
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Recommendation
                  <InfoTooltip
                    content="Action guidance based on the total adjustment. E.g., 'Proceed with caution' when multiplier is 0.5-0.7, 'Avoid trading' below 0.5."
                    variant="help"
                  />
                </p>
                <Badge 
                  variant={totalMultiplier < 0.7 ? "destructive" : totalMultiplier < 1 ? "secondary" : "default"}
                  className="mt-1"
                >
                  {recommendationLabel}
                </Badge>
              </div>
            </div>

            {/* Visual Progress */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-3 space-y-1 cursor-help">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>Base ({baseRisk}%)</span>
                      <span>5%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      {/* Base risk marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-border z-10"
                        style={{ left: `${(baseRisk / 5) * 100}%` }}
                      />
                      {/* Adjusted risk bar */}
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          totalMultiplier < 0.7 ? "bg-destructive" :
                          totalMultiplier < 1 ? "bg-[hsl(var(--chart-4))]" :
                          totalMultiplier > 1 ? "bg-profit" :
                          "bg-primary"
                        )}
                        style={{ width: `${Math.min((adjustedRisk / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Visual comparison: the bar shows adjusted risk relative to a 5% maximum. The vertical line marks your base risk.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
