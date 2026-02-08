/**
 * Volatility-Based Stop Loss Component
 * Integrates useVolatilityBasedSizing to provide ATR-based stop-loss recommendations
 */
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, AlertTriangle, Flame, Snowflake, Target, ArrowRight } from "lucide-react";
import { useVolatilityBasedSizing, useBinanceVolatility } from "@/features/binance";
import { cn } from "@/lib/utils";
import { ATR_STOP_LOSS_CONFIG, ATR_PERIOD, VOLATILITY_LEVEL_LABELS } from "@/lib/constants/risk-multipliers";

interface VolatilityStopLossProps {
  symbol: string;
  entryPrice: number;
  direction: 'long' | 'short';
  riskPercent: number;
  onApplyStopLoss?: (stopLossPrice: number) => void;
}

function getRiskLevelIcon(level: string) {
  switch (level) {
    case 'low': return Snowflake;
    case 'medium': return TrendingUp;
    case 'high': return AlertTriangle;
    case 'extreme': return Flame;
    default: return Activity;
  }
}

function getRiskLevelColor(level: string) {
  switch (level) {
    case 'low': return 'text-blue-500';
    case 'medium': return 'text-primary';
    case 'high': return 'text-warning';
    case 'extreme': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
}

export function VolatilityStopLoss({
  symbol,
  entryPrice,
  direction,
  riskPercent,
  onApplyStopLoss,
}: VolatilityStopLossProps) {
  const { data: volatility, isLoading: volatilityLoading } = useBinanceVolatility(symbol);
  const sizing = useVolatilityBasedSizing(symbol, riskPercent);
  
  // Calculate suggested stop-loss prices using centralized ATR config
  const stopLossSuggestions = useMemo(() => {
    if (!volatility || !sizing.suggestedStopLoss) return null;
    
    const { atrPercent } = volatility;
    const { suggestedStopLoss, atrBasedStopLoss } = sizing;
    
    // Calculate stop-loss prices based on direction using centralized multipliers
    const multipliers = {
      [ATR_STOP_LOSS_CONFIG.TIGHT.key]: suggestedStopLoss,
      [ATR_STOP_LOSS_CONFIG.STANDARD.key]: atrPercent * ATR_STOP_LOSS_CONFIG.STANDARD.factor,
      [ATR_STOP_LOSS_CONFIG.RECOMMENDED.key]: atrBasedStopLoss || atrPercent * ATR_STOP_LOSS_CONFIG.RECOMMENDED.factor,
      [ATR_STOP_LOSS_CONFIG.WIDE.key]: atrPercent * ATR_STOP_LOSS_CONFIG.WIDE.factor,
    };
    
    const calculatePrice = (percent: number) => {
      if (direction === 'long') {
        return entryPrice * (1 - percent / 100);
      } else {
        return entryPrice * (1 + percent / 100);
      }
    };
    
    // Build suggestions from centralized config
    const suggestions: Record<string, { percent: number; price: number; label: string; isRecommended: boolean }> = {};
    
    Object.values(ATR_STOP_LOSS_CONFIG).forEach(config => {
      const percent = multipliers[config.key];
      suggestions[config.key] = {
        percent,
        price: calculatePrice(percent),
        label: config.label,
        isRecommended: config.isRecommended,
      };
    });
    
    return suggestions;
  }, [volatility, sizing, entryPrice, direction]);
  
  if (volatilityLoading || sizing.isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-medium">Volatility-Based Stop Loss</span>
        </div>
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }
  
  if (!volatility || !stopLossSuggestions) {
    return null;
  }
  
  const Icon = getRiskLevelIcon(volatility.risk.level);
  
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium">Volatility-Based Stop Loss</span>
        </div>
        <Badge 
          variant={volatility.risk.level === 'extreme' ? 'destructive' : 'outline'}
          className={cn("text-xs", getRiskLevelColor(volatility.risk.level))}
        >
          <Icon className="h-3 w-3 mr-1" />
          {volatility.risk.level} volatility
        </Badge>
      </div>
      
      {/* Volatility Stats */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50 text-sm">
        <div>
          <span className="text-muted-foreground">Daily Volatility</span>
          <div className="font-semibold font-mono-numbers">
            {volatility.dailyVolatility.toFixed(2)}%
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">ATR ({ATR_PERIOD}d)</span>
          <div className="font-semibold font-mono-numbers">
            {volatility.atrPercent.toFixed(2)}%
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Annualized</span>
          <div className="font-semibold font-mono-numbers">
            {volatility.annualizedVolatility.toFixed(1)}%
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">ATR Value</span>
          <div className="font-semibold font-mono-numbers">
            ${volatility.atr.toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Recommendation Message */}
      {sizing.recommendation && (
        <div className={cn(
          "text-sm p-2 rounded-lg",
          volatility.risk.level === 'extreme' ? "bg-destructive/10 text-destructive" :
          volatility.risk.level === 'high' ? "bg-warning/10 text-warning" :
          "bg-muted/50 text-muted-foreground"
        )}>
          {sizing.recommendation}
        </div>
      )}
      
      {/* Stop Loss Suggestions */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">
          Suggested Stop Loss ({direction.toUpperCase()})
        </span>
        
        <div className="grid gap-2">
          {Object.entries(stopLossSuggestions).map(([key, suggestion]) => (
            <div 
              key={key}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors",
                suggestion.isRecommended && "border-primary/50 bg-primary/5"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{suggestion.label}</span>
                {suggestion.isRecommended && (
                  <Badge variant="secondary" className="text-xs">Best</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono-numbers text-muted-foreground">
                  -{suggestion.percent.toFixed(2)}%
                </span>
                <span className="text-sm font-mono-numbers font-medium">
                  ${suggestion.price.toFixed(2)}
                </span>
                {onApplyStopLoss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onApplyStopLoss(suggestion.price)}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Adjusted Risk Info */}
      {sizing.adjustedRisk && sizing.adjustedRisk !== riskPercent && (
        <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30">
          <strong>Volatility Adjustment:</strong> Risk adjusted from {riskPercent}% to {sizing.adjustedRisk.toFixed(2)}% 
          based on current market volatility.
        </div>
      )}
    </Card>
  );
}
