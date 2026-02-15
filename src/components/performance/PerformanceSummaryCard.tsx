/**
 * Performance Summary Card - Deterministic verdict at the top of Performance overview
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import type { TradingStats } from "@/lib/trading-calculations";

interface PerformanceSummaryCardProps {
  stats: TradingStats;
  formatCurrency: (v: number) => string;
}

function generateVerdict(stats: TradingStats): string {
  if (stats.totalTrades === 0) return "";
  
  const parts: string[] = [];

  if (stats.totalPnl < 0) {
    parts.push("Currently unprofitable. Review risk controls and strategy adherence.");
  } else if (stats.totalPnl > 0 && stats.expectancy < 0.1) {
    parts.push("Borderline break-even. Edge is thin.");
  } else if (stats.totalPnl > 0 && stats.winRate < 40) {
    parts.push("Profitable but inconsistent. Gains driven by large winners.");
  } else if (stats.winRate >= 50 && stats.profitFactor >= 1.5) {
    parts.push("Consistently profitable with solid edge.");
  } else {
    parts.push("Moderately profitable.");
  }

  if (stats.maxDrawdownPercent > 30) {
    parts.push("Drawdown risk elevated relative to returns.");
  }

  return parts.join(" ");
}

function getEdgeLabel(stats: TradingStats): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (stats.totalPnl < 0) return { label: "Negative", variant: "destructive" };
  if (stats.expectancy < 0.1) return { label: "Low", variant: "secondary" };
  if (stats.profitFactor >= 1.5 && stats.winRate >= 50) return { label: "Strong", variant: "default" };
  return { label: "Moderate", variant: "outline" };
}

export function PerformanceSummaryCard({ stats, formatCurrency }: PerformanceSummaryCardProps) {
  if (stats.totalTrades === 0) return null;

  const verdict = generateVerdict(stats);
  const edge = getEdgeLabel(stats);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Performance Summary
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{stats.totalTrades} trades</Badge>
          <Badge variant={edge.variant} className="text-xs">Edge: {edge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Net P&L</p>
            <p className={`font-semibold ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Win Rate</p>
            <p className="font-semibold">{stats.winRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expectancy</p>
            <p className="font-semibold">{formatCurrency(stats.expectancy)}/trade</p>
          </div>
          <div>
            <p className="text-muted-foreground">Profit Factor</p>
            <p className="font-semibold">
              {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground border-t pt-3">{verdict}</p>
      </CardContent>
    </Card>
  );
}
