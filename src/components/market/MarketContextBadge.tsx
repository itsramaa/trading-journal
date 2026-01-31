/**
 * MarketContextBadge - Display market context indicators
 * Shows Fear/Greed, Volatility, and Event Risk badges
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar, 
  Activity,
  Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedMarketContext } from "@/types/market-context";

interface MarketContextBadgeProps {
  context: UnifiedMarketContext | Partial<UnifiedMarketContext> | null;
  variant?: 'compact' | 'full';
  className?: string;
}

export function MarketContextBadge({ 
  context, 
  variant = 'compact',
  className 
}: MarketContextBadgeProps) {
  if (!context) return null;

  const { fearGreed, volatility, events, compositeScore, tradingBias } = context;

  // Fear/Greed color mapping
  const getFearGreedColor = (value: number) => {
    if (value <= 20) return 'text-red-500 border-red-500/50 bg-red-500/10';
    if (value <= 40) return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
    if (value <= 60) return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
    if (value <= 80) return 'text-green-500 border-green-500/50 bg-green-500/10';
    return 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10';
  };

  // Volatility color mapping
  const getVolatilityColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-500 border-green-500/50';
      case 'medium': return 'text-yellow-500 border-yellow-500/50';
      case 'high': return 'text-red-500 border-red-500/50';
      default: return 'text-muted-foreground border-muted';
    }
  };

  // Event risk color mapping
  const getEventRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'VERY_HIGH': return 'text-red-600 border-red-600/50 bg-red-600/10';
      case 'HIGH': return 'text-red-500 border-red-500/50 bg-red-500/10';
      case 'MODERATE': return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
      default: return 'text-green-500 border-green-500/50';
    }
  };

  // Trading bias icon
  const getBiasIcon = () => {
    switch (tradingBias) {
      case 'LONG_FAVORABLE': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'SHORT_FAVORABLE': return <TrendingDown className="h-3 w-3 text-red-500" />;
      case 'AVOID': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default: return <Activity className="h-3 w-3 text-yellow-500" />;
    }
  };

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-1.5", className)}>
          {/* Fear/Greed Badge */}
          {fearGreed?.value !== undefined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs gap-1 px-1.5", getFearGreedColor(fearGreed.value))}
                >
                  <Gauge className="h-3 w-3" />
                  {fearGreed.value}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fear & Greed: {fearGreed.label || fearGreed.value}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* High Impact Event Badge */}
          {events?.hasHighImpactToday && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs gap-1 px-1.5", getEventRiskColor(events.riskLevel || 'MODERATE'))}
                >
                  <Calendar className="h-3 w-3" />
                  {events.highImpactCount || 1}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {events.highImpactCount || 1} High-Impact Event{(events.highImpactCount || 1) > 1 ? 's' : ''} Today
                  {events.upcomingEvent && (
                    <><br />{events.upcomingEvent.name}</>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Volatility Badge (only show if high) */}
          {volatility?.level === 'high' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs gap-1 px-1.5", getVolatilityColor(volatility.level))}
                >
                  <Activity className="h-3 w-3" />
                  HV
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>High Volatility: {volatility.value?.toFixed(1)}%</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Full variant - more detailed display
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Market Context</span>
        <div className="flex items-center gap-1">
          {getBiasIcon()}
          <span className="text-xs text-muted-foreground">{tradingBias?.replace('_', ' ')}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {/* Fear/Greed */}
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Fear/Greed</p>
          <p className={cn("font-bold", getFearGreedColor(fearGreed?.value ?? 50))}>
            {fearGreed?.value ?? '--'}
          </p>
          <p className="text-xs text-muted-foreground">{fearGreed?.label || 'Unknown'}</p>
        </div>

        {/* Volatility */}
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Volatility</p>
          <p className={cn("font-bold capitalize", getVolatilityColor(volatility?.level ?? 'medium'))}>
            {volatility?.level ?? '--'}
          </p>
          <p className="text-xs text-muted-foreground">
            {volatility?.value ? `${volatility.value.toFixed(1)}%` : 'N/A'}
          </p>
        </div>

        {/* Event Risk */}
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Event Risk</p>
          <p className={cn("font-bold", getEventRiskColor(events?.riskLevel ?? 'LOW'))}>
            {events?.riskLevel?.replace('_', ' ') ?? 'LOW'}
          </p>
          <p className="text-xs text-muted-foreground">
            {events?.hasHighImpactToday ? `${events.highImpactCount} today` : 'Clear'}
          </p>
        </div>
      </div>

      {/* Composite Score */}
      {compositeScore !== undefined && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <span className="text-sm">Composite Score</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  compositeScore >= 60 && "bg-green-500",
                  compositeScore >= 40 && compositeScore < 60 && "bg-yellow-500",
                  compositeScore < 40 && "bg-red-500"
                )}
                style={{ width: `${compositeScore}%` }}
              />
            </div>
            <span className="text-sm font-bold">{compositeScore}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline Fear/Greed badge for trade history cards
 */
export function FearGreedBadge({ value, label }: { value: number; label?: string }) {
  const getColor = () => {
    if (value <= 20) return 'text-red-500 border-red-500/50';
    if (value <= 40) return 'text-orange-500 border-orange-500/50';
    if (value <= 60) return 'text-yellow-500 border-yellow-500/50';
    if (value <= 80) return 'text-green-500 border-green-500/50';
    return 'text-emerald-500 border-emerald-500/50';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("text-xs gap-1", getColor())}>
            <Gauge className="h-3 w-3" />
            F&G: {value}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Fear & Greed at entry: {label || value}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline Event Day badge for trade history cards
 */
export function EventDayBadge({ eventName }: { eventName?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-xs gap-1 text-yellow-500 border-yellow-500/50">
            <Calendar className="h-3 w-3" />
            Event Day
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Trade taken on high-impact event day</p>
          {eventName && <p className="text-xs text-muted-foreground">{eventName}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
