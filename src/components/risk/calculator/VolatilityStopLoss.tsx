/**
 * Volatility-Based Stop Loss Component
 * Integrates useVolatilityBasedSizing to provide ATR-based stop-loss recommendations
 */
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, TrendingUp, AlertTriangle, Flame, Snowflake, Target, ArrowRight } from "lucide-react";
import { useVolatilityBasedSizing, useBinanceVolatility } from "@/features/binance";
import { cn } from "@/lib/utils";
import { ATR_STOP_LOSS_CONFIG, ATR_PERIOD, VOLATILITY_LEVEL_LABELS } from "@/lib/constants/risk-multipliers";

/** Format price with dynamic precision based on magnitude */
function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  if (price < 0.01) return `$${price.toPrecision(4)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

/** ATR multiplier descriptions for tooltips */
const TIER_TOOLTIPS: Record<string, string> = {
  tight: "Tight: Aggressive stop with higher chance of being hit. Uses a lower ATR multiplier.",
  standard: "Standard: Balanced stop at 1× ATR. Good default for trending markets.",
  recommended: "Recommended based on your risk profile and current volatility conditions.",
  wide: "Wide: More room for price fluctuation. Uses a higher ATR multiplier. Lower chance of being stopped out.",
};

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
    case 'low': return 'text-[hsl(var(--chart-5))]';
    case 'medium': return 'text-primary';
    case 'high': return 'text-[hsl(var(--chart-4))]';
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
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3 py-6">
          <Activity className="h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Volatility Data Unavailable</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              ATR-based stop-loss recommendations require market data. Ensure a trading pair is selected and market data is accessible.
            </p>
          </div>
        </div>
      </Card>
    );
  }
  
  const Icon = getRiskLevelIcon(volatility.risk.level);
  
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium">Volatility-Based Stop Loss</span>
          <InfoTooltip
            content="ATR-derived stop loss levels that respect current market volatility. Wider stops in volatile markets, tighter in calm markets."
            variant="help"
          />
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
        <TooltipProvider>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">Daily Volatility</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">Standard deviation of daily returns. A 2% daily volatility means the price typically moves ±2% per day.</p>
              </TooltipContent>
            </Tooltip>
            <div className="font-semibold font-mono-numbers">
              {volatility.dailyVolatility.toFixed(2)}%
            </div>
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">ATR ({ATR_PERIOD}d)</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">Average True Range over 14 periods, as a percentage of price. Captures typical price range including gaps.</p>
              </TooltipContent>
            </Tooltip>
            <div className="font-semibold font-mono-numbers">
              {volatility.atrPercent.toFixed(2)}%
            </div>
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">Annualized</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">Daily volatility scaled to annual using √365. Comparable to traditional finance volatility metrics.</p>
              </TooltipContent>
            </Tooltip>
            <div className="font-semibold font-mono-numbers">
              {volatility.annualizedVolatility.toFixed(1)}%
            </div>
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">ATR Value</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">Absolute ATR value in the quote currency (USD). Represents the average daily price range in dollar terms.</p>
              </TooltipContent>
            </Tooltip>
            <div className="font-semibold font-mono-numbers">
              {formatPrice(volatility.atr)}
            </div>
          </div>
        </TooltipProvider>
      </div>
      
      {/* Recommendation Message */}
      {sizing.recommendation && (
        <div className={cn(
          "text-sm p-2 rounded-lg",
          volatility.risk.level === 'extreme' ? "bg-destructive/10 text-destructive" :
          volatility.risk.level === 'high' ? "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]" :
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm cursor-help">{suggestion.label}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{TIER_TOOLTIPS[key] || suggestion.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {suggestion.isRecommended && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs cursor-help">Best</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">Recommended based on your risk profile and current volatility conditions.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono-numbers text-muted-foreground">
                  -{suggestion.percent.toFixed(2)}%
                </span>
                <span className="text-sm font-mono-numbers font-medium">
                  {formatPrice(suggestion.price)}
                </span>
                {onApplyStopLoss && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => onApplyStopLoss(suggestion.price)}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Apply this stop loss to the Position Size Calculator tab</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
