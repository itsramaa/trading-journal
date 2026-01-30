/**
 * Volatility Meter Widget - Shows volatility levels for watchlist symbols
 * Uses Phase 3 useMultiSymbolVolatility hook
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, AlertTriangle, Flame, Snowflake } from "lucide-react";
import { useMultiSymbolVolatility, type VolatilityRisk } from "@/features/binance";
import { cn } from "@/lib/utils";

// Default watchlist symbols
const DEFAULT_WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

interface VolatilityMeterWidgetProps {
  symbols?: string[];
  className?: string;
}

function getVolatilityIcon(level: VolatilityRisk['level']) {
  switch (level) {
    case 'low': return Snowflake;
    case 'medium': return TrendingUp;
    case 'high': return AlertTriangle;
    case 'extreme': return Flame;
  }
}

function getVolatilityColor(level: VolatilityRisk['level']) {
  switch (level) {
    case 'low': return 'text-blue-500';
    case 'medium': return 'text-primary';
    case 'high': return 'text-warning';
    case 'extreme': return 'text-destructive';
  }
}

function getVolatilityBadgeVariant(level: VolatilityRisk['level']) {
  switch (level) {
    case 'low': return 'secondary';
    case 'medium': return 'default';
    case 'high': return 'outline';
    case 'extreme': return 'destructive';
  }
}

function VolatilityBar({ value, max = 150 }: { value: number; max?: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  // Color based on percentage
  const getBarColor = () => {
    if (percentage < 30) return 'bg-blue-500';
    if (percentage < 60) return 'bg-primary';
    if (percentage < 80) return 'bg-warning';
    return 'bg-destructive';
  };
  
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div 
        className={cn("h-full transition-all duration-500", getBarColor())}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function VolatilityMeterWidget({ 
  symbols = DEFAULT_WATCHLIST,
  className 
}: VolatilityMeterWidgetProps) {
  const { data: volatilityData, isLoading, isError } = useMultiSymbolVolatility(symbols);
  
  // Calculate average volatility
  const avgVolatility = volatilityData && volatilityData.length > 0
    ? volatilityData.reduce((sum, v) => sum + v.annualizedVolatility, 0) / volatilityData.length
    : 0;
  
  // Determine overall market condition
  const getMarketCondition = () => {
    if (avgVolatility < 30) return { label: 'Calm', color: 'text-blue-500' };
    if (avgVolatility < 60) return { label: 'Normal', color: 'text-primary' };
    if (avgVolatility < 100) return { label: 'Volatile', color: 'text-warning' };
    return { label: 'Extreme', color: 'text-destructive' };
  };
  
  const marketCondition = getMarketCondition();
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Volatility Meter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError || !volatilityData) {
    return (
      <Card className={className}>
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
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Volatility Meter
          </CardTitle>
          <Badge variant="outline" className={marketCondition.color}>
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
            <span className={cn("text-lg font-bold", marketCondition.color)}>
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
            
            return (
              <div 
                key={data.symbol}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <Icon className={cn("h-4 w-4 shrink-0", getVolatilityColor(data.risk.level))} />
                
                {/* Symbol & Level */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{symbolName}</span>
                    <Badge 
                      variant={getVolatilityBadgeVariant(data.risk.level) as any}
                      className="text-xs h-5"
                    >
                      {data.risk.level}
                    </Badge>
                  </div>
                  <div className="mt-1">
                    <VolatilityBar value={data.annualizedVolatility} />
                  </div>
                </div>
                
                {/* Volatility Value */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono-numbers font-medium">
                    {data.annualizedVolatility.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ATR: {data.atrPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground border-t">
          <div className="flex items-center gap-1">
            <Snowflake className="h-3 w-3 text-blue-500" />
            <span>&lt;30%</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span>30-60%</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-warning" />
            <span>60-100%</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-destructive" />
            <span>&gt;100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
