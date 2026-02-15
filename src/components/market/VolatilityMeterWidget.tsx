/**
 * Volatility Meter Widget - Shows volatility levels for watchlist symbols
 * Uses public Binance Klines API - no authentication required
 * Wrapped with ErrorBoundary for graceful API failure handling
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Activity, TrendingUp, AlertTriangle, Flame, Snowflake } from "lucide-react";
import { useMultiSymbolVolatility } from "@/features/binance";
import { useVolatilityPercentiles } from "@/features/market-insight";
import { cn } from "@/lib/utils";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { DEFAULT_WATCHLIST_SYMBOLS, DISPLAY_LIMITS } from "@/lib/constants/market-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  getMarketCondition, 
  getVolatilityLevelConfig,
  getVolatilityBarColor,
  calculateBarPercentage,
  VOLATILITY_DISPLAY,
  VOLATILITY_LEVEL_CONFIG,
  type VolatilityLevel 
} from "@/lib/constants/volatility-config";

interface VolatilityMeterWidgetProps {
  symbols?: string[];
  className?: string;
}

function getVolatilityIcon(level: VolatilityLevel) {
  switch (level) {
    case 'low': return Snowflake;
    case 'medium': return TrendingUp;
    case 'high': return AlertTriangle;
    case 'extreme': return Flame;
  }
}

function getVolatilityColor(level: VolatilityLevel) {
  return getVolatilityLevelConfig(level).color;
}

function getVolatilityBadgeVariant(level: VolatilityLevel): string {
  return getVolatilityLevelConfig(level).badgeVariant;
}

function VolatilityBar({ value, max = VOLATILITY_DISPLAY.BAR_MAX }: { value: number; max?: number }) {
  const percentage = calculateBarPercentage(value, max);
  const barColor = getVolatilityBarColor(percentage);
  
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div 
        className={cn("h-full transition-all duration-500", barColor)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function VolatilityMeterContent({ 
  symbols = [...DEFAULT_WATCHLIST_SYMBOLS],
  className 
}: VolatilityMeterWidgetProps) {
  const { data: volatilityData, isLoading, isError } = useMultiSymbolVolatility(symbols);
  const { data: percentiles } = useVolatilityPercentiles(symbols);
  
  const avgVolatility = volatilityData && volatilityData.length > 0
    ? volatilityData.reduce((sum, v) => sum + v.annualizedVolatility, 0) / volatilityData.length
    : 0;
  
  const marketCondition = getMarketCondition(avgVolatility);

  if (isLoading) {
    return (
      <Card className={className} role="region" aria-label="Volatility Meter">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Volatility Meter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <div className="space-y-3">
            {Array.from({ length: DISPLAY_LIMITS.SKELETON_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError || !volatilityData) {
    return (
      <Card className={className} role="region" aria-label="Volatility Meter">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Volatility Meter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to fetch volatility data
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className} role="region" aria-label="Volatility Meter">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Volatility Meter
            <InfoTooltip content="Annualized volatility calculated from recent price returns. Higher values indicate larger expected price swings." />
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="outline" className={marketCondition.colorClass}>
                    {marketCondition.label} Market
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Calm (&lt;30%): Range-bound. Normal (30-60%): Standard. Volatile (60-100%): Wider stops needed. Extreme (&gt;100%): Reduce exposure.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Annualized volatility for top assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Market Volatility */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1">
              Market Average
              <InfoTooltip content="Simple average of annualized volatility across all watchlist symbols." />
            </span>
            <span className={cn("text-lg font-bold", marketCondition.colorClass)}>
              {avgVolatility.toFixed(1)}%
            </span>
          </div>
          <VolatilityBar value={avgVolatility} />
        </div>
        
        {/* Individual Symbol Volatility */}
        <div className="space-y-3">
          {volatilityData.map((data) => {
            const Icon = getVolatilityIcon(data.risk.level);
            const symbolName = data.symbol.replace('USDT', '');
            const pctData = percentiles?.[data.symbol];
            const showPercentile = pctData && pctData.dataPoints >= 7;
            
            return (
              <div 
                key={data.symbol}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <CryptoIcon symbol={symbolName} size={20} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{symbolName}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Badge 
                              variant={getVolatilityBadgeVariant(data.risk.level) as any}
                              className="text-xs h-5"
                            >
                              {data.risk.level}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-sm">Volatility regime for this asset based on its annualized return volatility.</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {showPercentile && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs h-5 font-mono",
                                  pctData.percentile180d >= 90 && "border-loss/50 text-loss",
                                  pctData.percentile180d <= 10 && "border-profit/50 text-profit"
                                )}
                              >
                                P{pctData.percentile180d}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-sm">Current volatility percentile over the past 180 days. P90+ means historically elevated volatility.</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="mt-1">
                    <VolatilityBar value={data.annualizedVolatility} />
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono-numbers font-medium">
                    {data.annualizedVolatility.toFixed(1)}%
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs text-muted-foreground cursor-help">
                          {showPercentile 
                            ? `Top ${100 - pctData.percentile180d}% (180d)`
                            : `ATR: ${data.atrPercent.toFixed(2)}%`
                          }
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">
                          {showPercentile
                            ? `This asset's current volatility ranks in the top ${100 - pctData.percentile180d}% of the last 180 days.`
                            : "Average True Range as a percentage of price. Measures average bar-to-bar price movement."}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground border-t">
          {Object.entries(VOLATILITY_LEVEL_CONFIG).map(([level, config]) => {
            const Icon = getVolatilityIcon(level as VolatilityLevel);
            return (
              <TooltipProvider key={level}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <Icon className={cn("h-3 w-3", config.color)} />
                      <span>{config.rangeLabel}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-sm">Annualized volatility range: {config.rangeLabel}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Exported component wrapped with ErrorBoundary
 * Uses key-based remount for retry instead of window.location.reload()
 */
export function VolatilityMeterWidget(props: VolatilityMeterWidgetProps) {
  const [retryKey, setRetryKey] = useState(0);
  
  return (
    <ErrorBoundary 
      title="Volatility Meter"
      onRetry={() => setRetryKey(k => k + 1)}
    >
      <VolatilityMeterContent key={retryKey} {...props} />
    </ErrorBoundary>
  );
}
