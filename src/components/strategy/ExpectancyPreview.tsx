/**
 * Expectancy Preview - Shows expected outcomes across different win rates
 * Formula: Expectancy = WR * R - (1 - WR) where R = effectiveRR
 */
import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";

interface ExpectancyPreviewProps {
  effectiveRR: number | null;
}

const WIN_RATES = [20, 25, 30, 35, 40, 45, 50, 60];

export function ExpectancyPreview({ effectiveRR }: ExpectancyPreviewProps) {
  const rows = useMemo(() => {
    if (effectiveRR === null) return [];
    return WIN_RATES.map(wr => {
      const wrDecimal = wr / 100;
      const expectancy = wrDecimal * effectiveRR - (1 - wrDecimal);
      return { winRate: wr, expectancy };
    });
  }, [effectiveRR]);

  // Find breakeven zone (first row where expectancy crosses from negative to positive)
  const breakevenIndex = useMemo(() => {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].expectancy >= 0) return i;
    }
    return -1;
  }, [rows]);

  // Exact breakeven win rate: WR_be = 1 / (1 + R)
  const breakevenWinRate = useMemo(() => {
    if (effectiveRR === null || effectiveRR <= 0) return null;
    return (1 / (1 + effectiveRR)) * 100;
  }, [effectiveRR]);

  if (effectiveRR === null) {
    return (
      <div className="p-3 rounded-lg bg-muted/30 border">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          Define TP and SL in R:R units to see expectancy projections.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-muted/20 border space-y-2">
      <p className="text-xs font-medium flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        Expectancy Preview ({effectiveRR.toFixed(1)}:1 R:R)
      </p>
      <Table>
        <TableHeader>
          <TableRow className="border-b-0">
            <TableHead className="h-7 text-xs px-2">Win Rate</TableHead>
            <TableHead className="h-7 text-xs px-2 text-right">Expectancy (per R)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => {
            const isBreakeven = idx === breakevenIndex;
            const isPositive = row.expectancy >= 0;
            return (
              <TableRow 
                key={row.winRate} 
                className={isBreakeven ? "bg-primary/10 border-primary/20" : "border-0"}
              >
                <TableCell className="py-1 px-2 text-xs">
                  {row.winRate}%
                  {isBreakeven && (
                    <span className="ml-1.5 text-[10px] text-primary font-medium">← breakeven</span>
                  )}
                </TableCell>
                <TableCell className={`py-1 px-2 text-xs text-right font-mono ${isPositive ? "text-profit" : "text-loss"}`}>
                  {row.expectancy >= 0 ? "+" : ""}{row.expectancy.toFixed(2)}R
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {breakevenWinRate !== null && (
        <p className="text-xs font-medium text-primary">
          Breakeven Win Rate: {breakevenWinRate.toFixed(1)}%
        </p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Formula: Expectancy = WR × R − (1 − WR)
      </p>
    </div>
  );
}
