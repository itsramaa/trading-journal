/**
 * Performance Summary Card - Deterministic verdict at the top of Performance overview
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  } else if (stats.totalPnl > 0 && stats.winRate < 40) {
    parts.push("Profitable but inconsistent. Gains driven by large winners.");
  } else if (stats.totalPnl > 0 && stats.expectancy < 0.1) {
    parts.push("Borderline break-even. Edge is thin.");
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

function getEdgeBadgeClass(label: string): string {
  switch (label) {
    case 'Strong': return 'bg-profit/10 text-profit border-profit/20';
    case 'Low': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    default: return '';
  }
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
          <InfoTooltip content="Rule-based assessment of your trading edge based on PnL, win rate, expectancy, and profit factor." />
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{stats.totalTrades} trades</Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={edge.variant} className={`text-xs ${getEdgeBadgeClass(edge.label)}`}>Edge: {edge.label}</Badge>
              </TooltipTrigger>
              <TooltipContent>Strong (WR≥50%, PF≥1.5), Moderate (profitable), Low (thin edge), Negative (unprofitable).</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
