/**
 * Risk Adjustment Breakdown Component
 * Visual breakdown of all risk adjustment factors and reasoning
 * Shows how base risk is modified by market conditions
 */

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
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
  Minus
} from "lucide-react";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useUnifiedMarketScore } from "@/hooks/use-unified-market-score";
import { useBinanceVolatility } from "@/features/binance/useBinanceAdvancedAnalytics";
import { cn } from "@/lib/utils";

interface RiskAdjustmentBreakdownProps {
  symbol?: string;
  baseRiskPercent?: number;
}

interface AdjustmentFactor {
  id: string;
  name: string;
  icon: typeof Scale;
  multiplier: number;
  reason: string;
  level: 'positive' | 'neutral' | 'warning' | 'danger';
  value?: string;
}

export function RiskAdjustmentBreakdown({ 
  symbol = 'BTCUSDT',
  baseRiskPercent: propBaseRisk 
}: RiskAdjustmentBreakdownProps) {
  const { data: riskProfile } = useRiskProfile();
  const { 
    score, 
    bias, 
    components, 
    volatilityLabel,
    hasHighImpactEvent,
    positionSizeAdjustment,
    isLoading: marketLoading 
  } = useUnifiedMarketScore({ symbol });
  const { data: volatilityData, isLoading: volLoading } = useBinanceVolatility(symbol);

  const baseRisk = propBaseRisk ?? riskProfile?.risk_per_trade_percent ?? 2;

  // Calculate all adjustment factors
  const adjustmentFactors = useMemo<AdjustmentFactor[]>(() => {
    const factors: AdjustmentFactor[] = [];

    // 1. Volatility Adjustment
    if (volatilityData?.risk) {
      const { level } = volatilityData.risk;
      let volMultiplier = 1.0;
      let volLevel: AdjustmentFactor['level'] = 'neutral';
      let volReason = '';

      switch (level) {
        case 'extreme':
          volMultiplier = 0.5;
          volLevel = 'danger';
          volReason = 'Extreme volatility detected - halve position size';
          break;
        case 'high':
          volMultiplier = 0.75;
          volLevel = 'warning';
          volReason = 'High volatility - reduce position by 25%';
          break;
        case 'medium':
          volMultiplier = 1.0;
          volLevel = 'neutral';
          volReason = 'Normal volatility conditions';
          break;
        case 'low':
          volMultiplier = 1.1;
          volLevel = 'positive';
          volReason = 'Low volatility - can increase slightly';
          break;
      }

      factors.push({
        id: 'volatility',
        name: 'Volatility',
        icon: Activity,
        multiplier: volMultiplier,
        reason: volReason,
        level: volLevel,
        value: `ATR ${volatilityData.atrPercent.toFixed(2)}%`,
      });
    }

    // 2. Event/Macro Adjustment
    if (hasHighImpactEvent) {
      factors.push({
        id: 'event',
        name: 'Economic Event',
        icon: Calendar,
        multiplier: 0.5,
        reason: 'High-impact event today - reduce exposure significantly',
        level: 'danger',
        value: 'High Impact',
      });
    } else {
      factors.push({
        id: 'event',
        name: 'Economic Event',
        icon: Calendar,
        multiplier: 1.0,
        reason: 'No major events affecting this trade',
        level: 'positive',
        value: 'Clear',
      });
    }

    // 3. Market Sentiment/Bias Adjustment
    let sentimentMultiplier = 1.0;
    let sentimentLevel: AdjustmentFactor['level'] = 'neutral';
    let sentimentReason = '';

    if (bias === 'AVOID') {
      sentimentMultiplier = 0.5;
      sentimentLevel = 'danger';
      sentimentReason = 'Market conditions unfavorable - reduce size';
    } else if (components.fearGreed < 25) {
      sentimentMultiplier = 0.8;
      sentimentLevel = 'warning';
      sentimentReason = 'Extreme fear - proceed with caution';
    } else if (components.fearGreed > 75) {
      sentimentMultiplier = 0.9;
      sentimentLevel = 'warning';
      sentimentReason = 'Extreme greed - watch for reversals';
    } else {
      sentimentMultiplier = 1.0;
      sentimentLevel = 'neutral';
      sentimentReason = 'Neutral sentiment conditions';
    }

    factors.push({
      id: 'sentiment',
      name: 'Market Sentiment',
      icon: TrendingUp,
      multiplier: sentimentMultiplier,
      reason: sentimentReason,
      level: sentimentLevel,
      value: `F&G: ${components.fearGreed}`,
    });

    // 4. Momentum Adjustment (based on market score)
    let momentumMultiplier = 1.0;
    let momentumLevel: AdjustmentFactor['level'] = 'neutral';
    let momentumReason = '';

    if (score >= 70) {
      momentumMultiplier = 1.1;
      momentumLevel = 'positive';
      momentumReason = 'Strong bullish momentum - favorable conditions';
    } else if (score <= 30) {
      momentumMultiplier = 0.8;
      momentumLevel = 'warning';
      momentumReason = 'Weak momentum - reduce exposure';
    } else {
      momentumMultiplier = 1.0;
      momentumLevel = 'neutral';
      momentumReason = 'Neutral momentum';
    }

    factors.push({
      id: 'momentum',
      name: 'Momentum',
      icon: History,
      multiplier: momentumMultiplier,
      reason: momentumReason,
      level: momentumLevel,
      value: `Score: ${score}`,
    });

    return factors;
  }, [volatilityData, hasHighImpactEvent, bias, components, score]);

  // Calculate final adjusted risk
  const { totalMultiplier, adjustedRisk } = useMemo(() => {
    const total = adjustmentFactors.reduce((acc, f) => acc * f.multiplier, 1);
    return {
      totalMultiplier: total,
      adjustedRisk: Math.round(baseRisk * total * 100) / 100,
    };
  }, [adjustmentFactors, baseRisk]);

  const isLoading = marketLoading || volLoading;

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier > 1) return 'text-profit';
    if (multiplier < 0.8) return 'text-destructive';
    if (multiplier < 1) return 'text-[hsl(var(--chart-4))]';
    return 'text-muted-foreground';
  };

  const getLevelIcon = (level: AdjustmentFactor['level']) => {
    switch (level) {
      case 'positive': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'danger': return AlertTriangle;
      default: return Minus;
    }
  };

  const getLevelStyles = (level: AdjustmentFactor['level']) => {
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

  const getLevelIconColor = (level: AdjustmentFactor['level']) => {
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
            content="Shows how your base risk is adjusted based on current market conditions including volatility, events, sentiment, and momentum."
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
              const FactorIcon = factor.icon;
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
                      <span className={cn("text-sm font-bold", getMultiplierColor(factor.multiplier))}>
                        ×{factor.multiplier.toFixed(2)}
                      </span>
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
            {adjustmentFactors.map((f, i) => (
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
                <p className="text-sm text-muted-foreground">Adjusted Risk Per Trade</p>
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
                <p className="text-xs text-muted-foreground">Recommendation</p>
                <Badge 
                  variant={totalMultiplier < 0.7 ? "destructive" : totalMultiplier < 1 ? "secondary" : "default"}
                  className="mt-1"
                >
                  {totalMultiplier < 0.5 ? 'Significantly Reduce' :
                   totalMultiplier < 0.8 ? 'Reduce Size' :
                   totalMultiplier < 1 ? 'Slightly Reduce' :
                   totalMultiplier > 1 ? 'Normal/Increase' : 'Normal Size'}
                </Badge>
              </div>
            </div>

            {/* Visual Progress */}
            <div className="mt-3 space-y-1">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
