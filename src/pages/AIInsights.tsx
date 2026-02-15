/**
 * AI Insights Page - Advanced AI-powered trading analytics
 * Features: Pattern recognition, recommendations, performance predictions
 */
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  Lightbulb,
  Trophy,
  Flame,
  Shield,
  Calendar,
  Activity,
  Download,
  Zap,
} from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useContextualAnalytics } from "@/hooks/use-contextual-analytics";
import { ContextualPerformance } from "@/components/analytics/contextual/ContextualPerformance";
import { EmotionalPatternAnalysis } from "@/components/analytics/EmotionalPatternAnalysis";
import { SessionInsights } from "@/components/analytics/session/SessionInsights";
import { PredictiveInsights } from "@/components/analytics/PredictiveInsights";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import { MetricsGridSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { format as formatDate, subDays, isWithinInterval } from "date-fns";
import { 
  PERFORMANCE_THRESHOLDS, 
  DATA_QUALITY, 
  TIME_ANALYSIS,
  getTimeSlotHour,
  getDayLabel
} from "@/lib/constants/ai-analytics";
import { calculateAdvancedRiskMetrics } from "@/lib/advanced-risk-metrics";
import { useStrategyPerformance } from "@/hooks/use-strategy-performance";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";

// Types
interface PerformanceInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: string;
  icon: typeof TrendingUp;
  sampleSize?: number;
  confidence?: 'low' | 'medium' | 'high';
}

interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
}

interface TimeSlotAnalysis {
  day: string;
  hour: number;
  winRate: number;
  trades: number;
  avgPnl: number;
}

export default function AIInsights() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'patterns';
  const { data: trades = [], isLoading } = useModeFilteredTrades();
  const { data: contextualData } = useContextualAnalytics();
  const { formatPnl } = useCurrencyConversion();
  const [retryKey, setRetryKey] = useState(0);
  const strategyPerfMap = useStrategyPerformance();
  const { data: strategiesData } = useTradingStrategies();

  const closedTrades = useMemo(() => 
    trades.filter(t => t.status === 'closed'), [trades]
  );

  // Recent trades (last 30 days using centralized constant)
  const recentTrades = useMemo(() => {
    const cutoffDate = subDays(new Date(), TIME_ANALYSIS.RECENT_DAYS);
    return closedTrades.filter(t => 
      isWithinInterval(new Date(t.trade_date), { start: cutoffDate, end: new Date() })
    );
  }, [closedTrades]);

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    if (closedTrades.length === 0) return null;

    const getPnl = (t: typeof closedTrades[0]) => t.realized_pnl ?? t.pnl ?? 0;
    const wins = closedTrades.filter(t => getPnl(t) > 0);
    const losses = closedTrades.filter(t => getPnl(t) < 0);
    const winRate = (wins.length / closedTrades.length) * 100;
    
    const totalPnl = closedTrades.reduce((sum, t) => sum + getPnl(t), 0);
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + getPnl(t), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + getPnl(t), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
    
    // Calculate streak
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | null = null;
    const sortedTrades = [...closedTrades].sort((a, b) => 
      new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
    );
    
    for (const trade of sortedTrades) {
      const isWin = getPnl(trade) > 0;
      if (streakType === null) {
        streakType = isWin ? 'win' : 'loss';
        currentStreak = 1;
      } else if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Best/worst pairs
    const pairStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
    closedTrades.forEach(t => {
      if (!pairStats[t.pair]) pairStats[t.pair] = { wins: 0, losses: 0, pnl: 0 };
      const pnl = getPnl(t);
      pairStats[t.pair].pnl += pnl;
      if (pnl > 0) pairStats[t.pair].wins++;
      else pairStats[t.pair].losses++;
    });

    const pairRankings = Object.entries(pairStats)
      .map(([pair, s]) => ({
        pair,
        ...s,
        winRate: (s.wins / (s.wins + s.losses)) * 100,
        trades: s.wins + s.losses,
        expectancy: s.pnl / (s.wins + s.losses),
      }))
      .filter(p => p.trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING)
      .sort((a, b) => b.expectancy - a.expectancy);

    // Time analysis using centralized functions
    const timeSlots: Record<string, TimeSlotAnalysis> = {};
    closedTrades.forEach(t => {
      const d = new Date(t.trade_date);
      const day = getDayLabel(d);
      const hour = getTimeSlotHour(d);
      const key = `${day}-${hour}`;
      if (!timeSlots[key]) {
        timeSlots[key] = { day, hour, winRate: 0, trades: 0, avgPnl: 0 };
      }
      const pnl = getPnl(t);
      const slot = timeSlots[key];
      slot.avgPnl = (slot.avgPnl * slot.trades + pnl) / (slot.trades + 1);
      slot.trades++;
      if (pnl > 0) slot.winRate = ((slot.winRate * (slot.trades - 1) / 100) + 1) / slot.trades * 100;
      else slot.winRate = (slot.winRate * (slot.trades - 1) / 100) / slot.trades * 100;
    });

    const sortedSlots = Object.values(timeSlots).filter(s => s.trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING);
    const bestTimeSlot = sortedSlots.sort((a, b) => b.winRate - a.winRate)[0];
    const worstTimeSlot = [...sortedSlots].sort((a, b) => a.winRate - b.winRate)[0];

    // Variance metrics
    const pnls = closedTrades.map(t => getPnl(t));
    const meanPnl = totalPnl / closedTrades.length;
    const stdDev = Math.sqrt(pnls.reduce((s, p) => s + Math.pow(p - meanPnl, 2), 0) / pnls.length);

    // Rolling 30-trade performance
    const last30 = sortedTrades.slice(0, Math.min(30, sortedTrades.length));
    const last30Pnl = last30.reduce((s, t) => s + getPnl(t), 0);
    const last30WinRate = last30.length > 0 ? last30.filter(t => getPnl(t) > 0).length / last30.length * 100 : 0;

    // Drawdown context via advanced risk metrics
    const riskMetrics = calculateAdvancedRiskMetrics(
      closedTrades.map(t => ({
        pnl: getPnl(t),
        realized_pnl: t.realized_pnl ?? undefined,
        trade_date: t.trade_date,
        result: t.result || '',
      }))
    );

    return {
      totalTrades: closedTrades.length,
      recentTrades: recentTrades.length,
      winRate,
      totalPnl,
      avgWin,
      avgLoss,
      profitFactor,
      currentStreak,
      streakType,
      bestPair: pairRankings[0],
      worstPair: pairRankings[pairRankings.length - 1],
      pairRankings: pairRankings.slice(0, 5),
      bestTimeSlot,
      worstTimeSlot,
      stdDev,
      last30Pnl,
      last30WinRate,
      maxDrawdownPercent: riskMetrics.maxDrawdownPercent,
      currentDrawdownPercent: riskMetrics.currentDrawdownPercent,
    };
  }, [closedTrades, recentTrades]);

  // Generate AI insights
  const insights = useMemo((): PerformanceInsight[] => {
    if (!stats) return [];
    
    const result: PerformanceInsight[] = [];

    // Breakeven win rate based on R:R profile
    const breakevenWR = stats.avgLoss > 0 
      ? (stats.avgLoss / (stats.avgWin + stats.avgLoss)) * 100 
      : 50;

    // Win rate insight with R:R context
    if (stats.winRate >= PERFORMANCE_THRESHOLDS.WIN_RATE_STRONG) {
      result.push({
        type: 'positive',
        title: 'Strong Win Rate',
        description: `Your ${stats.winRate.toFixed(0)}% win rate is above the profitable threshold. Keep maintaining your entry discipline.`,
        metric: `${stats.winRate.toFixed(1)}%`,
        icon: Trophy
      });
    } else if (stats.winRate < breakevenWR) {
      result.push({
        type: 'negative',
        title: 'Win Rate Below Breakeven',
        description: `At ${stats.winRate.toFixed(0)}%, your win rate is below your breakeven threshold of ${breakevenWR.toFixed(0)}% (based on your R:R profile).`,
        metric: `${stats.winRate.toFixed(1)}%`,
        icon: AlertTriangle
      });
    } else if (stats.winRate < PERFORMANCE_THRESHOLDS.WIN_RATE_POOR) {
      result.push({
        type: 'neutral',
        title: 'Low Win Rate, Strong R:R',
        description: `Your ${stats.winRate.toFixed(0)}% win rate is sustained by a strong R:R ratio (breakeven: ${breakevenWR.toFixed(0)}%). Maintain your current risk-reward discipline.`,
        metric: `${stats.winRate.toFixed(1)}%`,
        icon: Target
      });
    }

    // Profit factor insight using centralized thresholds
    if (stats.profitFactor >= PERFORMANCE_THRESHOLDS.PROFIT_FACTOR_EXCELLENT) {
      result.push({
        type: 'positive',
        title: 'Excellent Risk-Reward',
        description: `A profit factor of ${stats.profitFactor.toFixed(2)} shows you're letting winners run and cutting losers quickly.`,
        metric: `${stats.profitFactor.toFixed(2)}`,
        icon: TrendingUp
      });
    } else if (stats.profitFactor < PERFORMANCE_THRESHOLDS.PROFIT_FACTOR_POOR && stats.profitFactor > 0) {
      const isWinSizeProblem = stats.avgWin < stats.avgLoss;
      result.push({
        type: 'negative',
        title: 'Improve Risk-Reward Ratio',
        description: isWinSizeProblem
          ? `Avg win (${formatPnl(stats.avgWin)}) is smaller than avg loss (${formatPnl(stats.avgLoss)}). Focus on holding winners longer or tightening stops.`
          : `Win frequency is the issue — your avg win exceeds avg loss but you're not winning often enough. Review entry quality.`,
        metric: `${stats.profitFactor.toFixed(2)}`,
        icon: Target
      });
    }

    // Streak insight using centralized threshold
    if (stats.currentStreak >= PERFORMANCE_THRESHOLDS.STREAK_SIGNIFICANT) {
      if (stats.streakType === 'win') {
        result.push({
          type: 'positive',
          title: `${stats.currentStreak}-Trade Winning Streak`,
          description: 'Stay disciplined and don\'t increase position sizes due to overconfidence.',
          metric: `${stats.currentStreak} wins`,
          icon: Flame
        });
      } else {
        result.push({
          type: 'negative',
          title: `${stats.currentStreak}-Trade Losing Streak`,
          description: `Statistically rare streak. Current drawdown: ${stats.currentDrawdownPercent.toFixed(1)}% from peak (max historical: ${stats.maxDrawdownPercent.toFixed(1)}%). Review recent trade quality and setup adherence.`,
          metric: `${stats.currentStreak} losses`,
          icon: AlertTriangle
        });
      }
    }

    // Best time slot insight
    if (stats.bestTimeSlot) {
      const tsConfidence = stats.bestTimeSlot.trades >= 30 ? 'high' as const : stats.bestTimeSlot.trades >= 15 ? 'medium' as const : 'low' as const;
      result.push({
        type: 'neutral',
        title: 'Best Trading Time',
        description: `${stats.bestTimeSlot.day} ${stats.bestTimeSlot.hour}:00 — ${stats.bestTimeSlot.winRate.toFixed(0)}% win rate.${tsConfidence === 'low' ? ' (low sample)' : ''}`,
        metric: `${stats.bestTimeSlot.winRate.toFixed(0)}%`,
        icon: Clock,
        sampleSize: stats.bestTimeSlot.trades,
        confidence: tsConfidence,
      });
    }

    // Best pair insight (expectancy-based)
    if (stats.bestPair) {
      const bpConfidence = stats.bestPair.trades >= 20 ? 'high' as const : stats.bestPair.trades >= 10 ? 'medium' as const : 'low' as const;
      result.push({
        type: 'positive',
        title: `Focus on ${stats.bestPair.pair}`,
        description: `${stats.bestPair.trades} trades, ${stats.bestPair.winRate.toFixed(0)}% WR, ${formatPnl(stats.bestPair.expectancy)}/trade expectancy.${bpConfidence === 'low' ? ' (low sample)' : ''}`,
        metric: `${formatPnl(stats.bestPair.expectancy)}/t`,
        icon: CheckCircle,
        sampleSize: stats.bestPair.trades,
        confidence: bpConfidence,
      });
    }

    // Worst pair warning
    if (stats.worstPair && stats.worstPair.pnl < 0) {
      const wpConfidence = stats.worstPair.trades >= 20 ? 'high' as const : stats.worstPair.trades >= 10 ? 'medium' as const : 'low' as const;
      result.push({
        type: 'negative',
        title: `Avoid ${stats.worstPair.pair}`,
        description: `${stats.worstPair.trades} trades, ${stats.worstPair.winRate.toFixed(0)}% win rate, ${formatPnl(stats.worstPair.pnl)} total P&L.${wpConfidence === 'low' ? ' (low sample)' : ''}`,
        metric: formatPnl(stats.worstPair.pnl),
        icon: XCircle,
        sampleSize: stats.worstPair.trades,
        confidence: wpConfidence,
      });
    }

    // High variance warning
    if (stats.stdDev > stats.avgWin * 1.5 && stats.avgWin > 0) {
      result.push({
        type: 'neutral',
        title: 'High Return Variance',
        description: `Per-trade P&L std dev (${formatPnl(stats.stdDev)}) is high relative to avg win (${formatPnl(stats.avgWin)}). Short-term results may not reflect true edge — evaluate over 100+ trades.`,
        metric: formatPnl(stats.stdDev),
        icon: Activity,
        sampleSize: stats.totalTrades,
        confidence: stats.totalTrades >= 100 ? 'high' : stats.totalTrades >= 50 ? 'medium' : 'low',
      });
    }

    // Rolling 30 vs overall trend
    const winRateDiff = stats.last30WinRate - stats.winRate;
    if (Math.abs(winRateDiff) > 10 && stats.totalTrades >= 30) {
      result.push({
        type: winRateDiff > 0 ? 'positive' : 'negative',
        title: winRateDiff > 0 ? 'Improving Recent Performance' : 'Declining Recent Performance',
        description: `Last 30 trades: ${stats.last30WinRate.toFixed(0)}% win rate vs ${stats.winRate.toFixed(0)}% overall (${winRateDiff > 0 ? '+' : ''}${winRateDiff.toFixed(0)}pp).`,
        metric: `${stats.last30WinRate.toFixed(0)}%`,
        icon: winRateDiff > 0 ? TrendingUp : TrendingDown,
        sampleSize: 30,
        confidence: 'medium',
      });
    }

    // Strategy performance insights
    if (strategiesData && strategiesData.length > 0) {
      strategiesData.forEach(strategy => {
        const perf = strategyPerfMap.get(strategy.id);
        if (!perf || perf.totalTrades < DATA_QUALITY.MIN_TRADES_FOR_RANKING) return;
        
        const stratWR = perf.winRate * 100;
        const overallWR = stats.winRate;
        const delta = stratWR - overallWR;
        
        if (Math.abs(delta) > 10) {
          result.push({
            type: delta > 0 ? 'positive' : 'negative',
            title: `${strategy.name}: ${delta > 0 ? 'Outperforming' : 'Underperforming'}`,
            description: `${stratWR.toFixed(0)}% win rate vs ${overallWR.toFixed(0)}% overall (${perf.totalTrades} trades). ${delta > 0 ? 'This strategy shows edge.' : 'Review setup quality or consider pausing.'}`,
            metric: `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`,
            icon: delta > 0 ? TrendingUp : TrendingDown,
            sampleSize: perf.totalTrades,
            confidence: perf.totalTrades >= 30 ? 'high' : perf.totalTrades >= 15 ? 'medium' : 'low',
          });
        }
      });
    }

    // Strategy adherence aggregation
    const adherenceStats = new Map<string, { good: number; partial: number; poor: number; total: number }>();
    closedTrades.forEach(trade => {
      if (!trade.strategies || !(trade as any).post_trade_analysis?.strategy_adherence) return;
      const rating = String((trade as any).post_trade_analysis.strategy_adherence).toLowerCase();
      (trade.strategies as any[]).forEach((s: any) => {
        const stat = adherenceStats.get(s.id) || { good: 0, partial: 0, poor: 0, total: 0 };
        if (rating.includes('good') || rating.includes('high')) stat.good++;
        else if (rating.includes('partial') || rating.includes('medium')) stat.partial++;
        else stat.poor++;
        stat.total++;
        adherenceStats.set(s.id, stat);
      });
    });

    adherenceStats.forEach((stat, stratId) => {
      if (stat.total < 10) return;
      const adherenceRate = (stat.good / stat.total) * 100;
      const stratName = strategiesData?.find(s => s.id === stratId)?.name || 'Unknown';
      
      if (adherenceRate < 50) {
        result.push({
          type: 'negative',
          title: `Low Strategy Adherence: ${stratName}`,
          description: `Only ${adherenceRate.toFixed(0)}% of trades followed the strategy rules closely (${stat.total} trades). Discipline may be impacting results.`,
          metric: `${adherenceRate.toFixed(0)}%`,
          icon: AlertTriangle,
          sampleSize: stat.total,
          confidence: stat.total >= 20 ? 'medium' : 'low',
        });
      }
    });

    return result;
  }, [stats, formatPnl, strategiesData, strategyPerfMap, closedTrades]);

  // Generate action items
  const actionItems = useMemo((): ActionItem[] => {
    if (!stats) return [];
    
    const items: ActionItem[] = [];

    // Breakeven WR for action context
    const actionBreakevenWR = stats.avgLoss > 0 
      ? (stats.avgLoss / (stats.avgWin + stats.avgLoss)) * 100 
      : 50;

    if (stats.winRate < actionBreakevenWR) {
      items.push({
        priority: 'high',
        action: 'Review and refine entry criteria',
        reason: `Win rate ${stats.winRate.toFixed(0)}% is below breakeven threshold of ${actionBreakevenWR.toFixed(0)}%`
      });
    }

    if (stats.profitFactor < PERFORMANCE_THRESHOLDS.ACTION_PROFIT_FACTOR_THRESHOLD && stats.profitFactor > 0) {
      const expectedGain = ((1.5 - stats.profitFactor) * stats.avgLoss);
      items.push({
        priority: 'high',
        action: 'Improve risk-reward targets',
        reason: `Profit factor ${stats.profitFactor.toFixed(2)} — improving to 1.50 would increase expectancy by ~${formatPnl(expectedGain)} per trade`
      });
    }

    if (stats.worstTimeSlot && stats.worstTimeSlot.winRate < PERFORMANCE_THRESHOLDS.ACTION_TIME_SLOT_WIN_RATE) {
      items.push({
        priority: 'medium',
        action: `Avoid trading on ${stats.worstTimeSlot.day} ${stats.worstTimeSlot.hour}:00`,
        reason: `Only ${stats.worstTimeSlot.winRate.toFixed(0)}% win rate (${stats.worstTimeSlot.trades} trades) during this time`
      });
    }

    if (stats.worstPair && stats.worstPair.pnl < PERFORMANCE_THRESHOLDS.ACTION_PAIR_LOSS_THRESHOLD) {
      items.push({
        priority: 'medium',
        action: `Remove ${stats.worstPair.pair} from watchlist`,
        reason: `${stats.worstPair.trades} trades, ${stats.worstPair.winRate.toFixed(0)}% win rate, ${formatPnl(stats.worstPair.pnl)} total P&L`
      });
    }

    if (stats.streakType === 'loss' && stats.currentStreak >= PERFORMANCE_THRESHOLDS.STREAK_SIGNIFICANT) {
      items.push({
        priority: 'high',
        action: 'Review recent trade quality',
        reason: 'Review whether recent setups met your strategy criteria'
      });
    }

    return items;
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Brain}
          title="AI Insights"
          description="AI-powered analysis of your trading patterns"
        />
        <MetricsGridSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Brain}
          title="AI Insights"
          description="AI-powered analysis of your trading patterns"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">Not Enough Data</h3>
            <p className="text-muted-foreground">
              Complete at least {DATA_QUALITY.MIN_TRADES_FOR_INSIGHTS} trades to unlock AI insights about your trading patterns.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary title="AI Insights" onRetry={() => setRetryKey(k => k + 1)}>
    <div key={retryKey} className="space-y-6">
      <PageHeader
          icon={Brain}
          title="AI Insights"
          description="AI-powered analysis of your trading patterns and recommendations"
        >
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link to="/export?tab=analytics">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Link>
          </Button>
        </PageHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="space-y-6">
          <TabsList>
            <TabsTrigger value="patterns" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Pattern Analysis
            </TabsTrigger>
            <TabsTrigger value="predictions" className="gap-2">
              <Zap className="h-4 w-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="contextual" className="gap-2">
              <Activity className="h-4 w-4" />
              Contextual Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-6 mt-0">

        {/* AI Insights Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pattern Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Pattern Analysis
              </CardTitle>
              <CardDescription>AI-detected patterns in your trading behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border",
                    insight.type === 'positive' && "border-profit/30 bg-profit/5",
                    insight.type === 'negative' && "border-loss/30 bg-loss/5",
                    insight.type === 'neutral' && "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <insight.icon className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        insight.type === 'positive' && "text-profit",
                        insight.type === 'negative' && "text-loss",
                        insight.type === 'neutral' && "text-primary"
                      )} />
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    {insight.metric && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {insight.confidence && (
                          <Badge variant="secondary" className={cn(
                            "text-[10px] px-1.5",
                            insight.confidence === 'high' && "bg-profit/10 text-profit",
                            insight.confidence === 'medium' && "bg-chart-4/10 text-chart-4",
                            insight.confidence === 'low' && "bg-muted text-muted-foreground"
                          )}>
                            {insight.sampleSize}t
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn(
                          "shrink-0",
                          insight.type === 'positive' && "border-profit text-profit",
                          insight.type === 'negative' && "border-loss text-loss"
                        )}>
                          {insight.metric}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Recommended Actions
              </CardTitle>
              <CardDescription>Prioritized steps to improve performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-profit" />
                  <p className="font-medium">All Clear!</p>
                  <p className="text-sm text-muted-foreground">
                    No critical issues detected. Keep up the good work!
                  </p>
                </div>
              ) : (
                actionItems.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "shrink-0 mt-0.5",
                        item.priority === 'high' && "border-loss text-loss",
                        item.priority === 'medium' && "border-chart-4 text-chart-4",
                        item.priority === 'low' && "border-muted-foreground text-muted-foreground"
                      )}
                    >
                      {item.priority}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-medium">{item.action}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Insights */}
        <SessionInsights bySession={contextualData?.bySession as any ?? {}} />

        {/* Pair Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Pair Performance Ranking
            </CardTitle>
            <CardDescription>Your most and least profitable trading pairs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pairRankings.map((pair, index) => (
                <div 
                  key={pair.pair}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    index === 0 && "border-profit/30 bg-profit/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-profit/20 text-profit" : "bg-muted text-muted-foreground"
                    )}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{pair.pair}</p>
                      <p className="text-sm text-muted-foreground">
                        {pair.trades} trades • {pair.winRate.toFixed(0)}% WR • {formatPnl(pair.expectancy)}/trade
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold text-lg",
                      pair.pnl >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {formatPnl(pair.pnl)}
                    </p>
                    <Badge variant={pair.pnl >= 0 ? "outline" : "secondary"} className={cn(
                      "text-xs",
                      pair.pnl >= 0 && "border-profit/50 text-profit"
                    )}>
                      {pair.pnl >= 0 ? 'Keep Trading' : 'Review'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </TabsContent>


          {/* Predictions Tab */}
          <TabsContent value="predictions" className="mt-0">
            <PredictiveInsights />
          </TabsContent>

          {/* Contextual Performance Tab */}
          <TabsContent value="contextual" className="mt-0 space-y-6">
            <ContextualPerformance />
            <EmotionalPatternAnalysis />
          </TabsContent>
        </Tabs>
    </div>
    </ErrorBoundary>
  );
}
