/**
 * Correlation Matrix Component
 * Shows correlation between open positions for risk management
 * Collapsible by default to reduce cognitive load (per UX audit)
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Link2, ChevronDown, ChevronRight } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { cn } from "@/lib/utils";
import { getCorrelation } from "@/lib/correlation-utils";
import { getBaseSymbol } from "@/lib/symbol-utils";
import { CORRELATION_COLOR_THRESHOLDS, CORRELATION_THRESHOLDS } from "@/lib/constants/risk-thresholds";

// Design system color tokens for correlation levels
function getCorrelationColor(value: number): string {
  if (value >= CORRELATION_COLOR_THRESHOLDS.VERY_HIGH) return "text-loss bg-loss-muted";
  if (value >= CORRELATION_COLOR_THRESHOLDS.HIGH) return "text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10";
  if (value >= CORRELATION_COLOR_THRESHOLDS.MODERATE) return "text-[hsl(var(--chart-6))] bg-[hsl(var(--chart-6))]/10";
  return "text-profit bg-profit-muted";
}

interface CorrelationPair {
  asset1: string;
  asset2: string;
  correlation: number;
  pair1: string;
  pair2: string;
}

export function CorrelationMatrix() {
  const { data: trades = [] } = useModeFilteredTrades();
  // Default collapsed per UX audit - advanced feature
  const [isOpen, setIsOpen] = useState(false);
  
  const openPositions = useMemo(() => {
    return trades.filter(t => t.status === 'open');
  }, [trades]);

  const correlationPairs = useMemo(() => {
    if (openPositions.length < 2) return [];
    
    const pairs: CorrelationPair[] = [];
    
    for (let i = 0; i < openPositions.length; i++) {
      for (let j = i + 1; j < openPositions.length; j++) {
        // Use centralized getBaseSymbol utility
        const asset1 = getBaseSymbol(openPositions[i].pair);
        const asset2 = getBaseSymbol(openPositions[j].pair);
        
        if (asset1 !== asset2) {
          // Use centralized getCorrelation - needs full symbol format
          const symbol1 = `${asset1}USDT`;
          const symbol2 = `${asset2}USDT`;
          const correlation = getCorrelation(symbol1, symbol2);
          pairs.push({
            asset1,
            asset2,
            correlation,
            pair1: openPositions[i].pair,
            pair2: openPositions[j].pair,
          });
        }
      }
    }
    
    return pairs.sort((a, b) => b.correlation - a.correlation);
  }, [openPositions]);

  // Use centralized threshold for high correlation
  const highCorrelationPairs = correlationPairs.filter(
    p => p.correlation >= CORRELATION_COLOR_THRESHOLDS.HIGH
  );
  
  // Auto-expand if there are high correlation warnings
  const shouldAutoExpand = highCorrelationPairs.length > 0;

  if (openPositions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5" />
            Position Correlation
            <InfoTooltip content="Measures how similarly your open positions move. High correlation (>70%) means positions amplify each other's risk." />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="ml-2 text-xs">Advanced</Badge>
                </TooltipTrigger>
                <TooltipContent><p className="text-sm">Advanced risk metric. Requires 2+ open positions for analysis.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Correlation analysis between open positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No open positions to analyze</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (openPositions.length === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5" />
            Position Correlation
            <InfoTooltip content="Measures how similarly your open positions move. High correlation (>70%) means positions amplify each other's risk." />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="ml-2 text-xs">Advanced</Badge>
                </TooltipTrigger>
                <TooltipContent><p className="text-sm">Advanced risk metric. Requires 2+ open positions for analysis.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Correlation analysis between open positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Need at least 2 open positions for correlation analysis</p>
            <Badge variant="outline" className="mt-2">
              {openPositions[0].pair} - Single position
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen || shouldAutoExpand} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-5 w-5" />
                  Position Correlation
                  <InfoTooltip content="Measures how similarly your open positions move. High correlation (>70%) means positions amplify each other's risk." />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="ml-2 text-xs">Advanced</Badge>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-sm">Advanced risk metric. Requires 2+ open positions for analysis.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {highCorrelationPairs.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {highCorrelationPairs.length} High
                    </Badge>
                  )}
                </CardTitle>
              </div>
              {isOpen || shouldAutoExpand ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <CardDescription>
              {isOpen || shouldAutoExpand 
                ? `Correlation analysis between ${openPositions.length} open positions`
                : "Click to expand correlation analysis"
              }
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* High Correlation Warning */}
            {highCorrelationPairs.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Correlated Exposure Warning
                </div>
                <p className="text-sm text-destructive/80">
                  You have {highCorrelationPairs.length} position pair(s) with high correlation (&gt;{CORRELATION_COLOR_THRESHOLDS.HIGH * 100}%). 
                  Consider reducing exposure to avoid amplified losses.
                </p>
              </div>
            )}

            {/* Correlation Pairs List */}
            <div className="space-y-2">
              {correlationPairs.map((pair, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    pair.correlation >= CORRELATION_COLOR_THRESHOLDS.HIGH ? "border-destructive/30 bg-destructive/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {pair.pair1}
                      </Badge>
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        {pair.pair2}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        getCorrelationColor(pair.correlation)
                      )}
                    >
                      {(pair.correlation * 100).toFixed(0)}%
                    </div>
                    {pair.correlation >= CORRELATION_COLOR_THRESHOLDS.VERY_HIGH && (
                      <AlertTriangle className="h-4 w-4 text-loss" />
                    )}
                    {pair.correlation >= CORRELATION_COLOR_THRESHOLDS.HIGH && pair.correlation < CORRELATION_COLOR_THRESHOLDS.VERY_HIGH && (
                      <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend - Using design tokens */}
            <TooltipProvider>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <div className="w-2 h-2 rounded bg-loss" />
                      <span>≥80% Very High</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-sm">Positions behave almost identically. Consider closing one to reduce amplified risk.</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <div className="w-2 h-2 rounded bg-[hsl(var(--chart-4))]" />
                      <span>70-79% High</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-sm">Strong similarity. Monitor closely and avoid adding more correlated exposure.</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <div className="w-2 h-2 rounded bg-[hsl(var(--chart-6))]" />
                      <span>50-69% Moderate</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-sm">Some correlation exists. Acceptable with proper position sizing.</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <div className="w-2 h-2 rounded bg-profit" />
                      <span>&lt;50% Low</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-sm">Good diversification. Positions move independently of each other.</p></TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
