/**
 * AI Insights Page - Advanced AI-powered trading analytics
 * Features: Pattern recognition, recommendations, performance predictions
 */
import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  BarChart3,
  Lightbulb,
  Trophy,
  Flame,
  Shield,
  Calendar,
  Activity,
  Download,
} from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useContextualAnalytics } from "@/hooks/use-contextual-analytics";
import { useContextualExport } from "@/hooks/use-contextual-export";
import { ContextualPerformance } from "@/components/analytics/ContextualPerformance";
import { EmotionalPatternAnalysis } from "@/components/analytics/EmotionalPatternAnalysis";
import { SessionInsights } from "@/components/analytics/SessionInsights";
import { cn } from "@/lib/utils";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { format as formatDate, subDays, isWithinInterval } from "date-fns";

// Types
interface PerformanceInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: string;
  icon: typeof TrendingUp;
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
  const { data: trades = [] } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const { data: contextualData } = useContextualAnalytics();
  const { exportContextualPDF } = useContextualExport();
  const { formatPnl } = useCurrencyConversion();

  const closedTrades = useMemo(() => 
    trades.filter(t => t.status === 'closed'), [trades]
  );

  // Recent trades (last 30 days)
  const recentTrades = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return closedTrades.filter(t => 
      isWithinInterval(new Date(t.trade_date), { start: thirtyDaysAgo, end: new Date() })
    );
  }, [closedTrades]);

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    if (closedTrades.length === 0) return null;

    const wins = closedTrades.filter(t => (t.realized_pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.realized_pnl || 0) < 0);
    const winRate = (wins.length / closedTrades.length) * 100;
    
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
    
    // Calculate streak
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | null = null;
    const sortedTrades = [...closedTrades].sort((a, b) => 
      new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
    );
    
    for (const trade of sortedTrades) {
      const isWin = (trade.realized_pnl || 0) > 0;
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
      const pnl = t.realized_pnl || 0;
      pairStats[t.pair].pnl += pnl;
      if (pnl > 0) pairStats[t.pair].wins++;
      else pairStats[t.pair].losses++;
    });

    const pairRankings = Object.entries(pairStats)
      .map(([pair, s]) => ({
        pair,
        ...s,
        winRate: (s.wins / (s.wins + s.losses)) * 100,
        trades: s.wins + s.losses
      }))
      .filter(p => p.trades >= 3)
      .sort((a, b) => b.pnl - a.pnl);

    // Time analysis
    const timeSlots: Record<string, TimeSlotAnalysis> = {};
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    closedTrades.forEach(t => {
      const d = new Date(t.trade_date);
      const day = DAYS[d.getDay()];
      const hour = Math.floor(d.getHours() / 4) * 4;
      const key = `${day}-${hour}`;
      if (!timeSlots[key]) {
        timeSlots[key] = { day, hour, winRate: 0, trades: 0, avgPnl: 0 };
      }
      const pnl = t.realized_pnl || 0;
      const slot = timeSlots[key];
      slot.avgPnl = (slot.avgPnl * slot.trades + pnl) / (slot.trades + 1);
      slot.trades++;
      if (pnl > 0) slot.winRate = ((slot.winRate * (slot.trades - 1) / 100) + 1) / slot.trades * 100;
      else slot.winRate = (slot.winRate * (slot.trades - 1) / 100) / slot.trades * 100;
    });

    const sortedSlots = Object.values(timeSlots).filter(s => s.trades >= 3);
    const bestTimeSlot = sortedSlots.sort((a, b) => b.winRate - a.winRate)[0];
    const worstTimeSlot = [...sortedSlots].sort((a, b) => a.winRate - b.winRate)[0];

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
    };
  }, [closedTrades, recentTrades]);

  // Generate AI insights
  const insights = useMemo((): PerformanceInsight[] => {
    if (!stats) return [];
    
    const result: PerformanceInsight[] = [];

    // Win rate insight
    if (stats.winRate >= 60) {
      result.push({
        type: 'positive',
        title: 'Strong Win Rate',
        description: `Your ${stats.winRate.toFixed(0)}% win rate is above the profitable threshold. Keep maintaining your entry discipline.`,
        metric: `${stats.winRate.toFixed(1)}%`,
        icon: Trophy
      });
    } else if (stats.winRate < 45) {
      result.push({
        type: 'negative',
        title: 'Win Rate Needs Improvement',
        description: `At ${stats.winRate.toFixed(0)}%, focus on refining your entry criteria and waiting for higher-quality setups.`,
        metric: `${stats.winRate.toFixed(1)}%`,
        icon: AlertTriangle
      });
    }

    // Profit factor insight
    if (stats.profitFactor >= 2) {
      result.push({
        type: 'positive',
        title: 'Excellent Risk-Reward',
        description: `A profit factor of ${stats.profitFactor.toFixed(2)} shows you're letting winners run and cutting losers quickly.`,
        metric: `${stats.profitFactor.toFixed(2)}`,
        icon: TrendingUp
      });
    } else if (stats.profitFactor < 1.2 && stats.profitFactor > 0) {
      result.push({
        type: 'negative',
        title: 'Improve Risk-Reward Ratio',
        description: `With a profit factor of ${stats.profitFactor.toFixed(2)}, consider holding winners longer or tightening stop losses.`,
        metric: `${stats.profitFactor.toFixed(2)}`,
        icon: Target
      });
    }

    // Streak insight
    if (stats.currentStreak >= 3) {
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
          description: 'Consider taking a break to reset mentally and review your recent entries.',
          metric: `${stats.currentStreak} losses`,
          icon: AlertTriangle
        });
      }
    }

    // Best time slot insight
    if (stats.bestTimeSlot) {
      result.push({
        type: 'neutral',
        title: 'Best Trading Time',
        description: `${stats.bestTimeSlot.day} ${stats.bestTimeSlot.hour}:00 has your highest win rate at ${stats.bestTimeSlot.winRate.toFixed(0)}%.`,
        metric: `${stats.bestTimeSlot.winRate.toFixed(0)}%`,
        icon: Clock
      });
    }

    // Best pair insight
    if (stats.bestPair) {
      result.push({
        type: 'positive',
        title: `Focus on ${stats.bestPair.pair}`,
        description: `Your most profitable pair with ${formatPnl(stats.bestPair.pnl)} total P&L and ${stats.bestPair.winRate.toFixed(0)}% win rate.`,
        metric: formatPnl(stats.bestPair.pnl),
        icon: CheckCircle
      });
    }

    // Worst pair warning
    if (stats.worstPair && stats.worstPair.pnl < 0) {
      result.push({
        type: 'negative',
        title: `Avoid ${stats.worstPair.pair}`,
        description: `This pair has cost you ${formatPnl(stats.worstPair.pnl)} with only ${stats.worstPair.winRate.toFixed(0)}% win rate.`,
        metric: formatPnl(stats.worstPair.pnl),
        icon: XCircle
      });
    }

    return result;
  }, [stats]);

  // Generate action items
  const actionItems = useMemo((): ActionItem[] => {
    if (!stats) return [];
    
    const items: ActionItem[] = [];

    if (stats.winRate < 50) {
      items.push({
        priority: 'high',
        action: 'Review and refine entry criteria',
        reason: 'Win rate below 50% suggests premature entries'
      });
    }

    if (stats.profitFactor < 1.5) {
      items.push({
        priority: 'high',
        action: 'Improve risk-reward targets',
        reason: 'Low profit factor indicates cutting winners too early'
      });
    }

    if (stats.worstTimeSlot && stats.worstTimeSlot.winRate < 40) {
      items.push({
        priority: 'medium',
        action: `Avoid trading on ${stats.worstTimeSlot.day} ${stats.worstTimeSlot.hour}:00`,
        reason: `Only ${stats.worstTimeSlot.winRate.toFixed(0)}% win rate during this time`
      });
    }

    if (stats.worstPair && stats.worstPair.pnl < -100) {
      items.push({
        priority: 'medium',
        action: `Remove ${stats.worstPair.pair} from watchlist`,
        reason: 'Consistently unprofitable pair'
      });
    }

    if (stats.streakType === 'loss' && stats.currentStreak >= 3) {
      items.push({
        priority: 'high',
        action: 'Take a trading break',
        reason: 'Losing streak may indicate tilting or market misread'
      });
    }

    return items;
  }, [stats]);

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Insights
            </h1>
            <p className="text-muted-foreground">
              AI-powered analysis of your trading patterns
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Not Enough Data</h3>
              <p className="text-muted-foreground">
                Complete at least 5 trades to unlock AI insights about your trading patterns.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Insights
            </h1>
            <p className="text-muted-foreground">
              AI-powered analysis of your trading patterns and recommendations
            </p>
          </div>
          {contextualData && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportContextualPDF(contextualData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Contextual PDF
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="patterns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="patterns" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Pattern Analysis
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
                      <Badge variant="outline" className={cn(
                        "shrink-0",
                        insight.type === 'positive' && "border-profit text-profit",
                        insight.type === 'negative' && "border-loss text-loss"
                      )}>
                        {insight.metric}
                      </Badge>
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

        {/* Session Insights - NEW */}
        {contextualData?.bySession && (
          <SessionInsights bySession={contextualData.bySession} />
        )}

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
                        {pair.trades} trades • {pair.winRate.toFixed(0)}% win rate
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

          {/* Contextual Performance Tab */}
          <TabsContent value="contextual" className="mt-0">
            <ContextualPerformance />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
