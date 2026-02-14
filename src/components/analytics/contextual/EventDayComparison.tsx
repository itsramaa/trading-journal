/**
 * Event Day Comparison - Compares performance between event days vs normal days
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, CalendarOff, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { PerformanceMetrics } from "@/hooks/use-contextual-analytics";

interface EventDayComparisonProps {
  eventDayMetrics: PerformanceMetrics;
  normalDayMetrics: PerformanceMetrics;
}

export function EventDayComparison({ eventDayMetrics, normalDayMetrics }: EventDayComparisonProps) {
  const { format: formatCurrency } = useCurrencyConversion();
  const totalTrades = eventDayMetrics.trades + normalDayMetrics.trades;
  
  // Calculate differences
  const winRateDiff = eventDayMetrics.winRate - normalDayMetrics.winRate;
  const avgPnlDiff = eventDayMetrics.avgPnl - normalDayMetrics.avgPnl;
  const profitFactorDiff = eventDayMetrics.profitFactor - normalDayMetrics.profitFactor;
  
  // Determine which is better
  const eventDaysBetter = winRateDiff > 0 && avgPnlDiff > 0;
  const normalDaysBetter = winRateDiff < 0 && avgPnlDiff < 0;
  
  if (totalTrades === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Day vs Normal Day
          </CardTitle>
          <CardDescription>No trades with market context data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Days vs Normal Days
            </CardTitle>
            <CardDescription>
              Compare your performance on high-impact event days vs regular trading days
            </CardDescription>
          </div>
          {totalTrades >= 10 && (
            <Badge variant="outline" className={cn(
              eventDaysBetter ? "border-profit text-profit" :
              normalDaysBetter ? "border-loss text-loss" :
              "border-muted-foreground text-muted-foreground"
            )}>
              {eventDaysBetter ? "Event Days Favorable" :
               normalDaysBetter ? "Normal Days Favorable" :
               "Mixed Results"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Event Days Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Calendar className="h-4 w-4 text-[hsl(var(--chart-4))]" />
              <span className="font-semibold">Event Days</span>
              <Badge variant="secondary" className="ml-auto">
                {eventDayMetrics.trades} trades
              </Badge>
            </div>
            
            <MetricItem 
              label="Win Rate" 
              value={`${eventDayMetrics.winRate.toFixed(1)}%`}
              isPositive={eventDayMetrics.winRate >= 50}
              subValue={eventDayMetrics.trades > 0 ? `${eventDayMetrics.wins}W / ${eventDayMetrics.losses}L` : undefined}
            />
            
            <MetricItem 
              label="Avg P&L" 
              value={formatCurrency(eventDayMetrics.avgPnl)}
              isPositive={eventDayMetrics.avgPnl >= 0}
            />

            <MetricItem 
              label="Total P&L" 
              value={formatCurrency(eventDayMetrics.totalPnl)}
              isPositive={eventDayMetrics.totalPnl >= 0}
            />
            
            <MetricItem 
              label="Profit Factor" 
              value={eventDayMetrics.profitFactor === 0 ? 'N/A' : eventDayMetrics.profitFactor.toFixed(2)}
              isPositive={eventDayMetrics.profitFactor >= 1.5}
            />
          </div>
          
          {/* Normal Days Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <CalendarOff className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Normal Days</span>
              <Badge variant="secondary" className="ml-auto">
                {normalDayMetrics.trades} trades
              </Badge>
            </div>
            
            <MetricItem 
              label="Win Rate" 
              value={`${normalDayMetrics.winRate.toFixed(1)}%`}
              isPositive={normalDayMetrics.winRate >= 50}
              subValue={normalDayMetrics.trades > 0 ? `${normalDayMetrics.wins}W / ${normalDayMetrics.losses}L` : undefined}
            />
            
            <MetricItem 
              label="Avg P&L" 
              value={formatCurrency(normalDayMetrics.avgPnl)}
              isPositive={normalDayMetrics.avgPnl >= 0}
            />

            <MetricItem 
              label="Total P&L" 
              value={formatCurrency(normalDayMetrics.totalPnl)}
              isPositive={normalDayMetrics.totalPnl >= 0}
            />
            
            <MetricItem 
              label="Profit Factor" 
              value={normalDayMetrics.profitFactor === 0 ? 'N/A' : normalDayMetrics.profitFactor.toFixed(2)}
              isPositive={normalDayMetrics.profitFactor >= 1.5}
            />
          </div>
        </div>
        
        {/* Difference Summary */}
        {eventDayMetrics.trades >= 3 && normalDayMetrics.trades >= 3 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm font-medium mb-3">Difference (Event - Normal)</p>
            <div className="grid grid-cols-3 gap-4">
              <DiffBadge 
                label="Win Rate" 
                value={winRateDiff} 
                suffix="%" 
                positiveIsGood 
              />
              <DiffBadge 
                label="Avg P&L" 
                value={avgPnlDiff} 
                prefix="$" 
                positiveIsGood 
              />
              <DiffBadge 
                label="Profit Factor" 
                value={profitFactorDiff} 
                positiveIsGood 
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricItem({ 
  label, 
  value, 
  isPositive, 
  subValue 
}: { 
  label: string; 
  value: string; 
  isPositive: boolean;
  subValue?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn(
          "font-medium",
          isPositive ? "text-profit" : "text-loss"
        )}>
          {value}
        </span>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function DiffBadge({ 
  label, 
  value, 
  prefix = '', 
  suffix = '',
  positiveIsGood 
}: { 
  label: string; 
  value: number;
  prefix?: string;
  suffix?: string;
  positiveIsGood: boolean;
}) {
  const isPositive = value > 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  
  return (
    <div className="text-center p-2 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className={cn(
        "flex items-center justify-center gap-1 font-medium",
        Math.abs(value) < 0.01 ? "text-muted-foreground" :
        isGood ? "text-profit" : "text-loss"
      )}>
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : value < 0 ? (
          <ArrowDownRight className="h-3 w-3" />
        ) : null}
        <span>
          {isPositive ? '+' : ''}{prefix}{value.toFixed(suffix === '%' ? 1 : 2)}{suffix}
        </span>
      </div>
    </div>
  );
}
