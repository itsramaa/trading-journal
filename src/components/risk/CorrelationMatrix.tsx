/**
 * Correlation Matrix Component
 * Shows correlation between open positions for risk management
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Link2 } from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { cn } from "@/lib/utils";

// Simplified correlation values for crypto pairs
const CORRELATION_MAP: Record<string, Record<string, number>> = {
  BTC: { ETH: 0.85, BNB: 0.78, SOL: 0.82, XRP: 0.72, ADA: 0.68, DOT: 0.75, AVAX: 0.80, MATIC: 0.76 },
  ETH: { BTC: 0.85, BNB: 0.72, SOL: 0.78, XRP: 0.65, ADA: 0.62, DOT: 0.70, AVAX: 0.75, MATIC: 0.73 },
  BNB: { BTC: 0.78, ETH: 0.72, SOL: 0.65, XRP: 0.55, ADA: 0.52, DOT: 0.58, AVAX: 0.62, MATIC: 0.60 },
  SOL: { BTC: 0.82, ETH: 0.78, BNB: 0.65, XRP: 0.58, ADA: 0.55, DOT: 0.68, AVAX: 0.72, MATIC: 0.65 },
  XRP: { BTC: 0.72, ETH: 0.65, BNB: 0.55, SOL: 0.58, ADA: 0.60, DOT: 0.52, AVAX: 0.55, MATIC: 0.50 },
  ADA: { BTC: 0.68, ETH: 0.62, BNB: 0.52, SOL: 0.55, XRP: 0.60, DOT: 0.65, AVAX: 0.58, MATIC: 0.55 },
  DOT: { BTC: 0.75, ETH: 0.70, BNB: 0.58, SOL: 0.68, XRP: 0.52, ADA: 0.65, AVAX: 0.68, MATIC: 0.62 },
  AVAX: { BTC: 0.80, ETH: 0.75, BNB: 0.62, SOL: 0.72, XRP: 0.55, ADA: 0.58, DOT: 0.68, MATIC: 0.65 },
  MATIC: { BTC: 0.76, ETH: 0.73, BNB: 0.60, SOL: 0.65, XRP: 0.50, ADA: 0.55, DOT: 0.62, AVAX: 0.65 },
};

// Extract base asset from pair (e.g., "BTCUSDT" -> "BTC")
function extractBaseAsset(pair: string): string {
  const suffixes = ['USDT', 'USD', 'BUSD', 'USDC', 'BTC', 'ETH'];
  for (const suffix of suffixes) {
    if (pair.toUpperCase().endsWith(suffix)) {
      return pair.toUpperCase().replace(suffix, '');
    }
  }
  return pair.toUpperCase().slice(0, 3);
}

function getCorrelation(asset1: string, asset2: string): number {
  if (asset1 === asset2) return 1.0;
  return CORRELATION_MAP[asset1]?.[asset2] ?? CORRELATION_MAP[asset2]?.[asset1] ?? 0.3;
}

// Design system color tokens for correlation levels
function getCorrelationColor(value: number): string {
  if (value >= 0.8) return "text-loss bg-loss-muted";
  if (value >= 0.7) return "text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10";
  if (value >= 0.5) return "text-[hsl(var(--chart-6))] bg-[hsl(var(--chart-6))]/10";
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
  const { data: trades = [] } = useTradeEntries();
  
  const openPositions = useMemo(() => {
    return trades.filter(t => t.status === 'open');
  }, [trades]);

  const correlationPairs = useMemo(() => {
    if (openPositions.length < 2) return [];
    
    const pairs: CorrelationPair[] = [];
    
    for (let i = 0; i < openPositions.length; i++) {
      for (let j = i + 1; j < openPositions.length; j++) {
        const asset1 = extractBaseAsset(openPositions[i].pair);
        const asset2 = extractBaseAsset(openPositions[j].pair);
        
        if (asset1 !== asset2) {
          const correlation = getCorrelation(asset1, asset2);
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

  const highCorrelationPairs = correlationPairs.filter(p => p.correlation >= 0.7);

  if (openPositions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5" />
            Position Correlation
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5" />
          Position Correlation
          {highCorrelationPairs.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {highCorrelationPairs.length} High
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Correlation analysis between {openPositions.length} open positions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Correlation Warning */}
        {highCorrelationPairs.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Correlated Exposure Warning
            </div>
            <p className="text-sm text-destructive/80">
              You have {highCorrelationPairs.length} position pair(s) with high correlation (&gt;70%). 
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
                pair.correlation >= 0.7 ? "border-destructive/30 bg-destructive/5" : "border-border"
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
                {pair.correlation >= 0.8 && (
                  <AlertTriangle className="h-4 w-4 text-loss" />
                )}
                {pair.correlation >= 0.7 && pair.correlation < 0.8 && (
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend - Using design tokens */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-loss" />
            <span>≥80% Very High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-[hsl(var(--chart-4))]" />
            <span>70-79% High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-[hsl(var(--chart-6))]" />
            <span>50-69% Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-profit" />
            <span>&lt;50% Low</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}