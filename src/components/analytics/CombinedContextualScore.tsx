/**
 * CombinedContextualScore - Unified contextual trading score
 * Combines Fear/Greed, Volatility, and Event Days into single indicator
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Gauge, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  Calendar,
  Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWinRate } from "@/lib/formatters";
import { CONTEXTUAL_SCORE_CONFIG, DATA_QUALITY } from "@/lib/constants/ai-analytics";
import type { UnifiedMarketContext } from "@/types/market-context";

interface TradeWithContext {
  id: string;
  pnl: number | null;
  result: string | null;
  market_context: unknown;
}

interface CombinedContextualScoreProps {
  trades: TradeWithContext[];
}

interface ContextualMetrics {
  zone: string;
  score: number;
  winRate: number;
  tradeCount: number;
  totalPnl: number;
  color: string;
  icon: typeof TrendingUp;
}

export function CombinedContextualScore({ trades }: CombinedContextualScoreProps) {
  const metrics = useMemo(() => {
    // Categorize trades by combined context
    const contextBuckets: Record<string, { wins: number; total: number; pnl: number }> = {
      optimal: { wins: 0, total: 0, pnl: 0 },      // Neutral F/G + Low Vol + No Events
      favorable: { wins: 0, total: 0, pnl: 0 },    // Good conditions (2/3 factors)
      moderate: { wins: 0, total: 0, pnl: 0 },     // Mixed conditions
      risky: { wins: 0, total: 0, pnl: 0 },        // Poor conditions (1/3 factors)
      extreme: { wins: 0, total: 0, pnl: 0 },      // All factors negative
    };

    let totalContextualScore = 0;
    let scoredTrades = 0;

    trades.forEach(trade => {
      const context = trade.market_context as unknown as UnifiedMarketContext;
      if (!context) return;

      let score = 0;
      let factors = 0;

      const { WEIGHTS, FEAR_GREED_RANGES } = CONTEXTUAL_SCORE_CONFIG;

      // Fear/Greed Factor (best: 40-60 neutral zone)
      if (context.fearGreed?.value !== undefined) {
        const fg = context.fearGreed.value;
        if (fg >= FEAR_GREED_RANGES.NEUTRAL_MIN && fg <= FEAR_GREED_RANGES.NEUTRAL_MAX) {
          score += WEIGHTS.FEAR_GREED.NEUTRAL;
        } else if (fg >= FEAR_GREED_RANGES.MODERATE_MIN && fg <= FEAR_GREED_RANGES.MODERATE_MAX) {
          score += WEIGHTS.FEAR_GREED.MODERATE;
        } else {
          score += WEIGHTS.FEAR_GREED.EXTREME;
        }
        factors++;
      }

      // Volatility Factor (best: low-medium)
      if (context.volatility?.level) {
        if (context.volatility.level === 'low') score += WEIGHTS.VOLATILITY.LOW;
        else if (context.volatility.level === 'medium') score += WEIGHTS.VOLATILITY.MEDIUM;
        else score += WEIGHTS.VOLATILITY.HIGH;
        factors++;
      }

      // Event Factor (best: no high-impact events)
      if (context.events) {
        if (!context.events.hasHighImpactToday) score += WEIGHTS.EVENTS.NONE;
        else if (context.events.riskLevel === 'MODERATE') score += WEIGHTS.EVENTS.MODERATE;
        else score += WEIGHTS.EVENTS.HIGH;
        factors++;
      }

      // Calculate normalized score (0-100)
      const maxScore = factors * 2;
      const normalizedScore = factors > 0 ? (score / maxScore) * 100 : 50;
      totalContextualScore += normalizedScore;
      scoredTrades++;

      // Categorize into buckets using centralized thresholds
      const { BUCKET_THRESHOLDS } = CONTEXTUAL_SCORE_CONFIG;
      let bucket: string;
      if (normalizedScore >= BUCKET_THRESHOLDS.OPTIMAL) bucket = 'optimal';
      else if (normalizedScore >= BUCKET_THRESHOLDS.FAVORABLE) bucket = 'favorable';
      else if (normalizedScore >= BUCKET_THRESHOLDS.MODERATE) bucket = 'moderate';
      else if (normalizedScore >= BUCKET_THRESHOLDS.RISKY) bucket = 'risky';
      else bucket = 'extreme';

      const isWin = trade.result === 'win' || (trade.pnl && trade.pnl > 0);
      contextBuckets[bucket].total++;
      if (isWin) contextBuckets[bucket].wins++;
      contextBuckets[bucket].pnl += trade.pnl || 0;
    });

    const avgScore = scoredTrades > 0 ? totalContextualScore / scoredTrades : 50;

    // Build metrics for each zone
    const zoneMetrics: ContextualMetrics[] = [
      {
        zone: 'Optimal',
        score: 90,
        winRate: contextBuckets.optimal.total > 0 
          ? (contextBuckets.optimal.wins / contextBuckets.optimal.total) * 100 : 0,
        tradeCount: contextBuckets.optimal.total,
        totalPnl: contextBuckets.optimal.pnl,
        color: 'text-green-500',
        icon: TrendingUp,
      },
      {
        zone: 'Favorable',
        score: 70,
        winRate: contextBuckets.favorable.total > 0 
          ? (contextBuckets.favorable.wins / contextBuckets.favorable.total) * 100 : 0,
        tradeCount: contextBuckets.favorable.total,
        totalPnl: contextBuckets.favorable.pnl,
        color: 'text-emerald-400',
        icon: TrendingUp,
      },
      {
        zone: 'Moderate',
        score: 50,
        winRate: contextBuckets.moderate.total > 0 
          ? (contextBuckets.moderate.wins / contextBuckets.moderate.total) * 100 : 0,
        tradeCount: contextBuckets.moderate.total,
        totalPnl: contextBuckets.moderate.pnl,
        color: 'text-yellow-500',
        icon: Activity,
      },
      {
        zone: 'Risky',
        score: 30,
        winRate: contextBuckets.risky.total > 0 
          ? (contextBuckets.risky.wins / contextBuckets.risky.total) * 100 : 0,
        tradeCount: contextBuckets.risky.total,
        totalPnl: contextBuckets.risky.pnl,
        color: 'text-orange-500',
        icon: TrendingDown,
      },
      {
        zone: 'Extreme',
        score: 10,
        winRate: contextBuckets.extreme.total > 0 
          ? (contextBuckets.extreme.wins / contextBuckets.extreme.total) * 100 : 0,
        tradeCount: contextBuckets.extreme.total,
        totalPnl: contextBuckets.extreme.pnl,
        color: 'text-red-500',
        icon: TrendingDown,
      },
    ];

    // Find best performing zone
    const zonesWithTrades = zoneMetrics.filter(z => z.tradeCount >= CONTEXTUAL_SCORE_CONFIG.MIN_TRADES_FOR_ZONE);
    const bestZone = zonesWithTrades.length > 0
      ? zonesWithTrades.reduce((a, b) => a.winRate > b.winRate ? a : b)
      : null;

    return {
      avgScore,
      zoneMetrics,
      bestZone,
      totalTrades: trades.length,
      contextualTrades: scoredTrades,
    };
  }, [trades]);

  const getScoreLabel = (score: number) => {
    const { BUCKET_THRESHOLDS } = CONTEXTUAL_SCORE_CONFIG;
    if (score >= BUCKET_THRESHOLDS.OPTIMAL) return 'Excellent';
    if (score >= BUCKET_THRESHOLDS.FAVORABLE) return 'Good';
    if (score >= BUCKET_THRESHOLDS.MODERATE) return 'Moderate';
    if (score >= BUCKET_THRESHOLDS.RISKY) return 'Poor';
    return 'Critical';
  };

  const getScoreColor = (score: number) => {
    const { BUCKET_THRESHOLDS } = CONTEXTUAL_SCORE_CONFIG;
    if (score >= BUCKET_THRESHOLDS.OPTIMAL) return 'text-green-500';
    if (score >= BUCKET_THRESHOLDS.FAVORABLE) return 'text-emerald-400';
    if (score >= BUCKET_THRESHOLDS.MODERATE) return 'text-yellow-500';
    if (score >= BUCKET_THRESHOLDS.RISKY) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary" />
            Combined Contextual Score
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {metrics.contextualTrades} trades analyzed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="p-3 rounded-full bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", getScoreColor(metrics.avgScore))}>
                {Math.round(metrics.avgScore)}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Average Trading Conditions
            </p>
          </div>
          <Badge variant="outline" className={cn("text-sm", getScoreColor(metrics.avgScore))}>
            {getScoreLabel(metrics.avgScore)}
          </Badge>
        </div>

        {/* Factor Indicators */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border text-center">
            <Activity className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Fear/Greed</p>
            <p className="text-sm font-medium">Sentiment</p>
          </div>
          <div className="p-3 rounded-lg border text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-xs text-muted-foreground">Volatility</p>
            <p className="text-sm font-medium">ATR Level</p>
          </div>
          <div className="p-3 rounded-lg border text-center">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-muted-foreground">Events</p>
            <p className="text-sm font-medium">Macro Risk</p>
          </div>
        </div>

        {/* Zone Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Performance by Context Zone
          </p>
          {metrics.zoneMetrics.map((zone) => {
            const Icon = zone.icon;
            return (
              <div key={zone.zone} className="flex items-center gap-3">
                <div className="w-20 flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", zone.color)} />
                  <span className="text-xs font-medium">{zone.zone}</span>
                </div>
                <div className="flex-1">
                  <Progress 
                    value={zone.winRate} 
                    className="h-2"
                  />
                </div>
                <div className="w-16 text-right">
                  <span className={cn(
                    "text-xs font-medium",
                    zone.winRate >= 50 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {zone.tradeCount > 0 ? formatWinRate(zone.winRate) : 'N/A'}
                  </span>
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs text-muted-foreground">
                    ({zone.tradeCount})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Best Zone Insight */}
        {metrics.bestZone && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-600">
              <span className="font-medium">Best Performance:</span>{' '}
              {metrics.bestZone.zone} conditions ({formatWinRate(metrics.bestZone.winRate)} win rate, {metrics.bestZone.tradeCount} trades)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
