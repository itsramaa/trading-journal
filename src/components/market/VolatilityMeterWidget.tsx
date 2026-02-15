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
import { Activity, TrendingUp, AlertTriangle, Flame, Snowflake } from "lucide-react";
import { useMultiSymbolVolatility } from "@/features/binance";
import { useVolatilityPercentiles } from "@/features/market-insight";
import { cn } from "@/lib/utils";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { DEFAULT_WATCHLIST_SYMBOLS, DISPLAY_LIMITS } from "@/lib/constants/market-config";
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

function getVolatilityBadgeVariant(level: VolatilityLevel) {
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
          </CardTitle>
          <Badge variant="outline" className={marketCondition.colorClass}>
            {marketCondition.label} Market
          </Badge>
        </div>
        <CardDescription>
          Annualized volatility for top assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Market Volatility */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Market Average</span>
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
                    <Badge 
                      variant={getVolatilityBadgeVariant(data.risk.level) as any}
                      className="text-xs h-5"
                    >
                      {data.risk.level}
                    </Badge>
                    {showPercentile && (
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
                  <div className="text-xs text-muted-foreground">
                    {showPercentile 
                      ? `Top ${100 - pctData.percentile180d}% (180d)`
                      : `ATR: ${data.atrPercent.toFixed(2)}%`
                    }
                  </div>
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
              <div key={level} className="flex items-center gap-1">
                <Icon className={cn("h-3 w-3", config.color)} />
                <span>{config.rangeLabel}</span>
              </div>
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
