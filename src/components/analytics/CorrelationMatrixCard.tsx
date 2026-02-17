/**
 * Correlation Matrix — pair-to-pair correlation heatmap
 * Shows how traded pairs correlate with each other based on P&L co-movement
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Grid3X3 } from "lucide-react";
import { getCorrelation, getCorrelationLabel } from "@/lib/correlation-utils";
import { getBaseSymbol } from "@/lib/symbol-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface CorrelationMatrixCardProps {
  trades: TradeEntry[];
}

function getNetPnl(t: TradeEntry): number {
  return t.realized_pnl ?? t.pnl ?? 0;
}

/** Compute empirical correlation from trade P&L sequences */
function computeEmpiricalCorrelation(pnlsA: number[], pnlsB: number[]): number | null {
  // Need overlapping trade dates — use daily aggregated P&L
  if (pnlsA.length < 3 || pnlsB.length < 3) return null;

  const meanA = pnlsA.reduce((s, v) => s + v, 0) / pnlsA.length;
  const meanB = pnlsB.reduce((s, v) => s + v, 0) / pnlsB.length;

  let cov = 0, varA = 0, varB = 0;
  const len = Math.min(pnlsA.length, pnlsB.length);
  for (let i = 0; i < len; i++) {
    const dA = pnlsA[i] - meanA;
    const dB = pnlsB[i] - meanB;
    cov += dA * dB;
    varA += dA * dA;
    varB += dB * dB;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return null;
  return cov / denom;
}

/** Get daily P&L map for a symbol */
function getDailyPnl(trades: TradeEntry[], symbol: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of trades) {
    if (t.pair !== symbol || t.status !== "closed") continue;
    const day = t.trade_date.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + getNetPnl(t));
  }
  return map;
}

/** Get correlation between two symbols using empirical data, fallback to static */
function getPairCorrelation(
  trades: TradeEntry[],
  symbolA: string,
  symbolB: string
): { value: number; source: "empirical" | "static" } {
  if (symbolA === symbolB) return { value: 1, source: "static" };

  const dailyA = getDailyPnl(trades, symbolA);
  const dailyB = getDailyPnl(trades, symbolB);

  // Find overlapping days
  const commonDays = [...dailyA.keys()].filter(d => dailyB.has(d)).sort();
  if (commonDays.length >= 5) {
    const pnlsA = commonDays.map(d => dailyA.get(d)!);
    const pnlsB = commonDays.map(d => dailyB.get(d)!);
    const emp = computeEmpiricalCorrelation(pnlsA, pnlsB);
    if (emp !== null) return { value: emp, source: "empirical" };
  }

  // Fallback to static correlation
  const staticCorr = getCorrelation(symbolA, symbolB);
  return { value: staticCorr, source: "static" };
}

function correlationColor(value: number): string {
  const abs = Math.abs(value);
  if (value >= 0) {
    // Positive: shades from neutral to red/warm
    if (abs >= 0.8) return "bg-destructive/30 text-destructive";
    if (abs >= 0.6) return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
    if (abs >= 0.4) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    return "bg-muted/50 text-muted-foreground";
  } else {
    // Negative: shades from neutral to blue/cool
    if (abs >= 0.6) return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
    if (abs >= 0.4) return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    return "bg-muted/50 text-muted-foreground";
  }
}

export function CorrelationMatrixCard({ trades }: CorrelationMatrixCardProps) {
  const closedTrades = useMemo(() => trades.filter(t => t.status === "closed"), [trades]);

  // Get unique traded symbols (top 8 by trade count)
  const symbols = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const t of closedTrades) {
      countMap.set(t.pair, (countMap.get(t.pair) ?? 0) + 1);
    }
    return [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sym]) => sym);
  }, [closedTrades]);

  // Build correlation matrix
  const matrix = useMemo(() => {
    if (symbols.length < 2) return null;

    const data: Array<{
      rowSymbol: string;
      colSymbol: string;
      value: number;
      source: "empirical" | "static";
    }> = [];

    for (const row of symbols) {
      for (const col of symbols) {
        const { value, source } = getPairCorrelation(closedTrades, row, col);
        data.push({ rowSymbol: row, colSymbol: col, value, source });
      }
    }

    // Compute concentration risk
    let highCorrCount = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const cell = data.find(d => d.rowSymbol === symbols[i] && d.colSymbol === symbols[j]);
        if (cell && cell.value >= 0.7) highCorrCount++;
      }
    }

    return { cells: data, highCorrCount };
  }, [symbols, closedTrades]);

  if (symbols.length < 2) {
    return (
      <Card role="region" aria-label="Correlation Matrix">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Correlation Matrix
            <InfoTooltip content="Shows how your traded pairs correlate. High correlation means losses in one pair often coincide with losses in another, increasing portfolio risk." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Trade at least 2 different pairs to see the correlation matrix.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card role="region" aria-label="Correlation Matrix">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Correlation Matrix
            <InfoTooltip content="Shows how your traded pairs correlate based on daily P&L co-movement. High positive correlation (red) means losses tend to occur together. Negative correlation (blue) provides diversification." />
          </CardTitle>
          {matrix && matrix.highCorrCount > 0 && (
            <Badge variant="outline" className="text-loss border-loss/50 text-[10px]">
              {matrix.highCorrCount} high-risk pair{matrix.highCorrCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Matrix Grid */}
        <div className="overflow-x-auto">
          <div
            className="grid gap-0.5 min-w-fit"
            style={{
              gridTemplateColumns: `auto repeat(${symbols.length}, minmax(3rem, 1fr))`,
            }}
          >
            {/* Header row */}
            <div /> {/* Empty corner */}
            {symbols.map(sym => (
              <div key={`h-${sym}`} className="text-[10px] font-medium text-center p-1 truncate">
                {getBaseSymbol(sym)}
              </div>
            ))}

            {/* Data rows */}
            {symbols.map(rowSym => (
              <>
                <div key={`r-${rowSym}`} className="text-[10px] font-medium flex items-center pr-1 truncate">
                  {getBaseSymbol(rowSym)}
                </div>
                {symbols.map(colSym => {
                  const cell = matrix?.cells.find(
                    c => c.rowSymbol === rowSym && c.colSymbol === colSym
                  );
                  const value = cell?.value ?? 0;
                  const isDiagonal = rowSym === colSym;

                  return (
                    <TooltipProvider key={`${rowSym}-${colSym}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center justify-center p-1 rounded-sm text-[10px] font-mono cursor-default transition-colors",
                              isDiagonal
                                ? "bg-primary/10 text-primary font-semibold"
                                : correlationColor(value)
                            )}
                          >
                            {isDiagonal ? "1.00" : value.toFixed(2)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p className="text-sm font-medium">
                            {getBaseSymbol(rowSym)} × {getBaseSymbol(colSym)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Correlation: {value.toFixed(3)} ({getCorrelationLabel(Math.abs(value))})
                          </p>
                          {cell && !isDiagonal && (
                            <p className="text-xs text-muted-foreground">
                              Source: {cell.source === "empirical" ? "Your trade data" : "Historical estimate"}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-blue-500/20" />
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted/50" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-amber-500/15" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-destructive/30" />
            <span>High</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Uses daily P&L co-movement when ≥5 overlapping trade days exist, otherwise falls back to historical estimates.
        </p>
      </CardContent>
    </Card>
  );
}
