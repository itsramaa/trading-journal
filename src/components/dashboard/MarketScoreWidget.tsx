/**
 * MarketScoreWidget - Real-time composite market score display
 * Shows unified market analysis with trading bias recommendation
 * Wrapped with error boundary for graceful external API failure handling
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  Gauge,
  RefreshCw,
  Calendar,
  Zap,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedMarketScore } from "@/hooks/use-unified-market-score";
import { useTradeMode, TRADING_STYLE_LABELS, type TradingStyle } from "@/hooks/use-trade-mode";
import { Link } from "react-router-dom";

interface MarketScoreWidgetProps {
  symbol?: string;
  compact?: boolean;
}

// M-34: Style-specific timeframe label
const STYLE_FOCUS_LABEL: Record<TradingStyle, string> = {
  scalping: 'Optimized for 1m–15m',
  short_trade: 'Optimized for 1h–4h',
  swing: 'Optimized for 4h–1D',
};

function MarketScoreWidgetContent({ symbol = 'BTCUSDT', compact = false }: MarketScoreWidgetProps) {
  const { tradingStyle } = useTradeMode();
  const {
    score,
    bias,
    components,
    isLoading,
    dataQuality,
    scoreLabel,
    fearGreedLabel,
    volatilityLabel,
    positionSizeAdjustment,
    hasHighImpactEvent,
    upcomingEventName,
    refetch,
  } = useUnifiedMarketScore({ symbol });

  const getBiasConfig = () => {
    switch (bias) {
      case 'LONG_FAVORABLE':
        return {
          icon: TrendingUp,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'Long Favorable',
        };
      case 'SHORT_FAVORABLE':
        return {
          icon: TrendingDown,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Short Favorable',
        };
      case 'AVOID':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-600/10',
          borderColor: 'border-red-600/30',
          label: 'Avoid Trading',
        };
      default:
        return {
          icon: Activity,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'Neutral',
        };
    }
  };

  const getScoreColor = (value: number) => {
    if (value >= 70) return 'text-green-500';
    if (value >= 55) return 'text-green-400';
    if (value >= 45) return 'text-yellow-500';
    if (value >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColor = (value: number) => {
    if (value >= 60) return 'bg-green-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const biasConfig = getBiasConfig();
  const BiasIcon = biasConfig.icon;

  if (compact) {
    return (
      <Card className={cn("border", biasConfig.borderColor)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-full", biasConfig.bgColor)}>
                <BiasIcon className={cn("h-5 w-5", biasConfig.color)} />
              </div>
              <div>
                <p className="text-sm font-medium">Market Score</p>
                <div className="flex items-center gap-2">
                  <span className={cn("text-2xl font-bold", getScoreColor(score))}>
                    {isLoading ? '--' : score}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-xs", biasConfig.color, biasConfig.borderColor)}>
              {biasConfig.label}
            </Badge>
          </div>
          {hasHighImpactEvent && (
            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-500">
              <Calendar className="h-3 w-3" />
              <span>High-impact event today</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary" />
            Market Score
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh market data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" asChild>
              <Link to="/market">View Details</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className={cn("p-4 rounded-lg border", biasConfig.bgColor, biasConfig.borderColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-full", biasConfig.bgColor)}>
                <BiasIcon className={cn("h-8 w-8", biasConfig.color)} />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-4xl font-bold", getScoreColor(score))}>
                    {isLoading ? '--' : score}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <p className={cn("text-sm font-medium", biasConfig.color)}>{biasConfig.label}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-xs mb-1">
                {scoreLabel}
              </Badge>
              {dataQuality < 80 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Info className="h-3 w-3" />
                  {dataQuality}% data quality
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Event Warning */}
        {hasHighImpactEvent && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600">
            <Calendar className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">High-Impact Event Today</p>
              {upcomingEventName && (
                <p className="text-xs text-muted-foreground">{upcomingEventName}</p>
              )}
            </div>
            {positionSizeAdjustment !== 'normal' && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                {positionSizeAdjustment.replace('_', ' ')}
              </Badge>
            )}
          </div>
        )}

        {/* Component Breakdown */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Technical */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Technical</span>
                <span className={getScoreColor(components.technical)}>{components.technical}</span>
              </div>
              <Progress value={components.technical} className="h-1.5" />
            </div>
            
            {/* Fear/Greed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fear/Greed</span>
                <span>{fearGreedLabel}</span>
              </div>
              <Progress value={components.fearGreed} className="h-1.5" />
            </div>
            
            {/* Macro */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Macro</span>
                <span className={getScoreColor(components.macro)}>{components.macro}</span>
              </div>
              <Progress value={components.macro} className="h-1.5" />
            </div>
            
            {/* Event Risk */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Event Safety</span>
                <span className={getScoreColor(components.eventRisk)}>{components.eventRisk}</span>
              </div>
              <Progress value={components.eventRisk} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Quick Info Row - M-34: Show active trading style */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Volatility: <span className="font-medium text-foreground">{volatilityLabel}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {TRADING_STYLE_LABELS[tradingStyle]}
            </Badge>
            <span>{symbol}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {STYLE_FOCUS_LABEL[tradingStyle]}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Exported component wrapped with ErrorBoundary
 * Gracefully handles external API failures (market data, fear/greed, calendar)
 */
export function MarketScoreWidget(props: MarketScoreWidgetProps) {
  return (
    <ErrorBoundary 
      title="Market Score" 
      compact={props.compact}
      onRetry={() => window.location.reload()}
    >
      <MarketScoreWidgetContent {...props} />
    </ErrorBoundary>
  );
}
