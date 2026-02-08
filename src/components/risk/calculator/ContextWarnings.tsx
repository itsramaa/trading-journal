/**
 * Context Warnings Component
 * Displays FOMC/high-impact events, volatility level, and correlated positions
 * For quick risk assessment before position sizing
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Activity, Link2, CheckCircle, Info } from "lucide-react";
import { useEconomicCalendar } from "@/features/calendar/useEconomicCalendar";
import { useBinanceVolatility } from "@/features/binance/useBinanceAdvancedAnalytics";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { cn } from "@/lib/utils";
import { getCorrelation } from "@/lib/correlation-utils";
import { getBaseSymbol } from "@/lib/symbol-utils";
import { CORRELATION_COLOR_THRESHOLDS } from "@/lib/constants/risk-thresholds";

interface ContextWarningsProps {
  symbol?: string;
}

interface Warning {
  type: 'event' | 'volatility' | 'correlation';
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  adjustment?: string;
}

export function ContextWarnings({ symbol = 'BTCUSDT' }: ContextWarningsProps) {
  const { data: calendarData, isLoading: calendarLoading } = useEconomicCalendar();
  const { data: volatilityData, isLoading: volatilityLoading } = useBinanceVolatility(symbol);
  const { data: trades = [] } = useTradeEntries();
  
  // Use centralized getBaseSymbol utility
  const baseAsset = getBaseSymbol(symbol);
  
  // Find high-impact events today
  const highImpactEvents = useMemo(() => {
    if (!calendarData?.events) return [];
    
    const today = new Date().toISOString().split('T')[0];
    
    return calendarData.events.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === today && event.importance === 'high';
    });
  }, [calendarData]);

  // Find correlated open positions using centralized utilities
  const correlatedPositions = useMemo(() => {
    const openPositions = trades.filter(t => t.status === 'open');
    
    return openPositions
      .filter(pos => {
        const posAsset = getBaseSymbol(pos.pair);
        if (posAsset === baseAsset) return false;
        
        // Use centralized getCorrelation (expects full symbol format)
        const symbol1 = `${baseAsset}USDT`;
        const symbol2 = `${posAsset}USDT`;
        const correlation = getCorrelation(symbol1, symbol2);
        return correlation >= CORRELATION_COLOR_THRESHOLDS.HIGH;
      })
      .map(pos => {
        const posAsset = getBaseSymbol(pos.pair);
        const symbol1 = `${baseAsset}USDT`;
        const symbol2 = `${posAsset}USDT`;
        return {
          pair: pos.pair,
          correlation: getCorrelation(symbol1, symbol2),
        };
      });
  }, [trades, baseAsset]);

  // Build warnings list
  const warnings = useMemo<Warning[]>(() => {
    const result: Warning[] = [];

    // High-impact event warnings
    if (highImpactEvents.length > 0) {
      const topEvent = highImpactEvents[0];
      result.push({
        type: 'event',
        level: 'danger',
        title: 'High-Impact Event Today',
        message: `${topEvent.event} (${topEvent.country})`,
        adjustment: 'Consider 50% position size',
      });
    }

    // Volatility warnings
    if (volatilityData?.risk) {
      const { level, suggestedStopLossPercent } = volatilityData.risk;
      
      if (level === 'extreme') {
        result.push({
          type: 'volatility',
          level: 'danger',
          title: 'Extreme Volatility',
          message: `ATR: ${volatilityData.atrPercent.toFixed(2)}% - Very high price swings expected`,
          adjustment: 'Reduce position size by 50%',
        });
      } else if (level === 'high') {
        result.push({
          type: 'volatility',
          level: 'warning',
          title: 'High Volatility',
          message: `ATR: ${volatilityData.atrPercent.toFixed(2)}% - Use wider stops`,
          adjustment: 'Consider 75% position size',
        });
      } else if (level === 'low') {
        result.push({
          type: 'volatility',
          level: 'info',
          title: 'Low Volatility',
          message: `ATR: ${volatilityData.atrPercent.toFixed(2)}% - Calm market conditions`,
        });
      }
    }

    // Correlated positions warnings using centralized thresholds
    if (correlatedPositions.length > 0) {
      const highestCorr = correlatedPositions[0];
      result.push({
        type: 'correlation',
        level: highestCorr.correlation >= CORRELATION_COLOR_THRESHOLDS.VERY_HIGH ? 'danger' : 'warning',
        title: 'Correlated Position',
        message: `Open ${highestCorr.pair} (${Math.round(highestCorr.correlation * 100)}% correlation)`,
        adjustment: 'Review total exposure',
      });
    }

    return result;
  }, [highImpactEvents, volatilityData, correlatedPositions]);

  const isLoading = calendarLoading || volatilityLoading;
  
  const getWarningIcon = (type: Warning['type']) => {
    switch (type) {
      case 'event': return Calendar;
      case 'volatility': return Activity;
      case 'correlation': return Link2;
      default: return AlertTriangle;
    }
  };

  const getWarningStyles = (level: Warning['level']) => {
    switch (level) {
      case 'danger':
        return {
          border: 'border-destructive/30',
          bg: 'bg-destructive/5',
          icon: 'text-destructive',
          badge: 'bg-destructive/10 text-destructive border-destructive/30',
        };
      case 'warning':
        return {
          border: 'border-[hsl(var(--chart-4))]/30',
          bg: 'bg-[hsl(var(--chart-4))]/5',
          icon: 'text-[hsl(var(--chart-4))]',
          badge: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30',
        };
      default:
        return {
          border: 'border-primary/30',
          bg: 'bg-primary/5',
          icon: 'text-primary',
          badge: 'bg-primary/10 text-primary border-primary/30',
        };
    }
  };

  // No warnings = green check
  if (!isLoading && warnings.length === 0) {
    return (
      <Card className="border-profit/30 bg-profit/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-profit/10">
              <CheckCircle className="h-5 w-5 text-profit" />
            </div>
            <div>
              <p className="text-sm font-medium text-profit">All Clear</p>
              <p className="text-xs text-muted-foreground">
                No significant market warnings for {symbol}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--chart-4))]" />
          Context Warnings
          {warnings.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {warnings.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Activity className="h-4 w-4 animate-pulse" />
            Checking market context...
          </div>
        ) : (
          warnings.map((warning, index) => {
            const Icon = getWarningIcon(warning.type);
            const styles = getWarningStyles(warning.level);
            
            return (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border",
                  styles.border,
                  styles.bg
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", styles.icon)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{warning.title}</span>
                      {warning.adjustment && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", styles.badge)}
                        >
                          {warning.adjustment}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {warning.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Quick Volatility Stats */}
        {volatilityData && (
          <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>14-day ATR: {volatilityData.atrPercent.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Annual Vol: {volatilityData.annualizedVolatility.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
