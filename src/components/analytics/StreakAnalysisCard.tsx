/**
 * Streak Analysis Card
 * Displays comprehensive consecutive win/loss streak analytics with
 * P&L impact analysis, distribution charts, and recovery metrics.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Flame,
  Snowflake,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  BarChart3,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { analyzeStreaks, type StreakAnalysis } from "@/lib/trading-calculations";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { format, parseISO } from "date-fns";

interface Props {
  trades: TradeEntry[];
}

function StreakBadge({ type, length }: { type: 'win' | 'loss'; length: number }) {
  const isWin = type === 'win';
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-xs",
        isWin ? "border-profit/30 text-profit bg-profit/10" : "border-loss/30 text-loss bg-loss/10"
      )}
    >
      {isWin ? <Flame className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
      {length} {isWin ? 'wins' : 'losses'}
    </Badge>
  );
}

function DistributionBar({
  distribution,
  type,
}: {
  distribution: Record<number, number>;
  type: 'win' | 'loss';
}) {
  const entries = Object.entries(distribution)
    .map(([len, count]) => ({ len: Number(len), count }))
    .sort((a, b) => a.len - b.len);

  const maxCount = Math.max(...entries.map(e => e.count), 1);

  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No streaks</p>;
  }

  return (
    <div className="space-y-1">
      {entries.map(({ len, count }) => (
        <div key={len} className="flex items-center gap-2 text-xs">
          <span className="w-4 text-right text-muted-foreground font-mono-numbers">{len}</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                type === 'win' ? "bg-profit" : "bg-loss"
              )}
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="w-4 text-muted-foreground font-mono-numbers">{count}×</span>
        </div>
      ))}
    </div>
  );
}

export function StreakAnalysisCard({ trades }: Props) {
  const { format: formatCurrency, formatCompact } = useCurrencyConversion();

  const analysis = useMemo(() => analyzeStreaks(trades), [trades]);

  const hasData = analysis.allStreaks.length > 0 || analysis.currentStreak;

  if (!hasData) {
    return (
      <div className="space-y-4" role="region" aria-label="Streak analysis">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Streak Analysis
        </h3>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Flame className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Not enough data for streak analysis</p>
              <p className="text-sm">Complete at least 2 consecutive trades to see streak patterns.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pnlImpact = analysis.avgPnlDuringWinStreaks !== 0 && analysis.avgPnlBaseline !== 0
    ? ((analysis.avgPnlDuringWinStreaks - analysis.avgPnlBaseline) / Math.abs(analysis.avgPnlBaseline) * 100)
    : 0;

  return (
    <div className="space-y-4" role="region" aria-label="Streak analysis showing consecutive wins and losses patterns">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Streak Analysis
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Current & Record Streaks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Streak Records
              <InfoTooltip content="Your current active streak and all-time longest consecutive win/loss runs." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current streak */}
            {analysis.currentStreak && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Streak</p>
                <div className="flex items-center gap-2">
                  <StreakBadge type={analysis.currentStreak.type} length={analysis.currentStreak.length} />
                  <span className={cn(
                    "text-sm font-semibold font-mono-numbers",
                    analysis.currentStreak.type === 'win' ? "text-profit" : "text-loss"
                  )}>
                    {analysis.currentStreak.totalPnl >= 0 ? '+' : ''}
                    {formatCompact(analysis.currentStreak.totalPnl)}
                  </span>
                </div>
              </div>
            )}

            {/* Longest Win Streak */}
            {analysis.longestWinStreak && (
              <div className="space-y-1 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-profit" />
                  <p className="text-xs text-muted-foreground">Best Win Streak</p>
                </div>
                <div className="flex items-center justify-between">
                  <StreakBadge type="win" length={analysis.longestWinStreak.length} />
                  <span className="text-sm font-semibold text-profit font-mono-numbers">
                    +{formatCompact(analysis.longestWinStreak.totalPnl)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {(() => {
                    try { return format(parseISO(analysis.longestWinStreak.startDate), "dd MMM"); } catch { return ''; }
                  })()}
                  {' → '}
                  {(() => {
                    try { return format(parseISO(analysis.longestWinStreak.endDate), "dd MMM yy"); } catch { return ''; }
                  })()}
                  {' · '}
                  {analysis.longestWinStreak.pairs.slice(0, 2).join(', ')}
                  {analysis.longestWinStreak.pairs.length > 2 ? ` +${analysis.longestWinStreak.pairs.length - 2}` : ''}
                </p>
              </div>
            )}

            {/* Longest Loss Streak */}
            {analysis.longestLossStreak && (
              <div className="space-y-1 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-loss" />
                  <p className="text-xs text-muted-foreground">Worst Loss Streak</p>
                </div>
                <div className="flex items-center justify-between">
                  <StreakBadge type="loss" length={analysis.longestLossStreak.length} />
                  <span className="text-sm font-semibold text-loss font-mono-numbers">
                    {formatCompact(analysis.longestLossStreak.totalPnl)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {(() => {
                    try { return format(parseISO(analysis.longestLossStreak.startDate), "dd MMM"); } catch { return ''; }
                  })()}
                  {' → '}
                  {(() => {
                    try { return format(parseISO(analysis.longestLossStreak.endDate), "dd MMM yy"); } catch { return ''; }
                  })()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* P&L Impact Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Streak P&L Impact
              <InfoTooltip content="Compares average P&L during streaks vs isolated trades. Shows whether momentum or tilt affects your sizing/decisions." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* During Win Streaks */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">During Win Streaks</span>
                <span className="font-medium text-profit font-mono-numbers">
                  {analysis.avgPnlDuringWinStreaks >= 0 ? '+' : ''}
                  {formatCompact(analysis.avgPnlDuringWinStreaks)}
                  <span className="text-muted-foreground">/trade</span>
                </span>
              </div>
              <Progress value={Math.min(Math.abs(analysis.avgPnlDuringWinStreaks) / (Math.abs(analysis.avgPnlBaseline) || 1) * 50, 100)} className="h-1.5" />
            </div>

            {/* During Loss Streaks */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">During Loss Streaks</span>
                <span className="font-medium text-loss font-mono-numbers">
                  {formatCompact(analysis.avgPnlDuringLossStreaks)}
                  <span className="text-muted-foreground">/trade</span>
                </span>
              </div>
              <Progress value={Math.min(Math.abs(analysis.avgPnlDuringLossStreaks) / (Math.abs(analysis.avgPnlBaseline) || 1) * 50, 100)} className="h-1.5" />
            </div>

            {/* Baseline */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Isolated Trades</span>
                <span className={cn(
                  "font-medium font-mono-numbers",
                  analysis.avgPnlBaseline >= 0 ? "text-profit" : "text-loss"
                )}>
                  {analysis.avgPnlBaseline >= 0 ? '+' : ''}
                  {formatCompact(analysis.avgPnlBaseline)}
                  <span className="text-muted-foreground">/trade</span>
                </span>
              </div>
              <Progress value={50} className="h-1.5" />
            </div>

            {/* Insight */}
            <div className="pt-2 border-t">
              {pnlImpact > 10 ? (
                <p className="text-xs text-profit flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Momentum effect: +{pnlImpact.toFixed(0)}% avg P&L during win streaks
                </p>
              ) : pnlImpact < -10 ? (
                <p className="text-xs text-loss flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Possible tilt: {pnlImpact.toFixed(0)}% avg P&L during win streaks
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Streak momentum has minimal impact on P&L per trade.
                </p>
              )}

              {analysis.avgRecoveryTrades > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  Avg recovery: {analysis.avgRecoveryTrades.toFixed(1)} trades after loss streaks
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Streak Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Flame className="h-4 w-4 text-muted-foreground" />
              Streak Distribution
              <InfoTooltip content="How often you hit streaks of different lengths. Useful for sizing adjustments and risk management." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Averages */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded-md bg-profit/5 border border-profit/10">
                <p className="text-muted-foreground">Avg Win Run</p>
                <p className="text-lg font-bold text-profit font-mono-numbers">
                  {analysis.avgWinStreakLength.toFixed(1)}
                </p>
              </div>
              <div className="p-2 rounded-md bg-loss/5 border border-loss/10">
                <p className="text-muted-foreground">Avg Loss Run</p>
                <p className="text-lg font-bold text-loss font-mono-numbers">
                  {analysis.avgLossStreakLength.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Win streak distribution */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Win Streaks by Length</p>
              <DistributionBar distribution={analysis.winStreakDistribution} type="win" />
            </div>

            {/* Loss streak distribution */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Loss Streaks by Length</p>
              <DistributionBar distribution={analysis.lossStreakDistribution} type="loss" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
