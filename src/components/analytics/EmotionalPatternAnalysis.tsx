/**
 * Emotional Pattern Analysis - Analyzes trading performance by emotional state
 * Shows win rate by emotion and generates insights
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Smile, 
  Frown, 
  Meh,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles
} from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

// Emotional states that can be tracked
const EMOTIONAL_STATES = [
  { id: 'calm', label: 'Calm', icon: Smile, color: 'text-profit' },
  { id: 'confident', label: 'Confident', icon: TrendingUp, color: 'text-primary' },
  { id: 'anxious', label: 'Anxious', icon: Meh, color: 'text-yellow-500' },
  { id: 'fearful', label: 'Fearful', icon: Frown, color: 'text-loss' },
  { id: 'fomo', label: 'FOMO', icon: Zap, color: 'text-orange-500' },
  { id: 'revenge', label: 'Revenge', icon: AlertTriangle, color: 'text-loss' },
] as const;

interface EmotionalStats {
  state: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

interface EmotionalInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
}

export function EmotionalPatternAnalysis() {
  const { data: trades = [] } = useTradeEntries();

  const { emotionalStats, insights, hasEnoughData } = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.emotional_state);
    
    if (closedTrades.length < 10) {
      return { emotionalStats: [], insights: [], hasEnoughData: false };
    }

    // Group by emotional state
    const statsByEmotion: Record<string, EmotionalStats> = {};
    
    closedTrades.forEach(trade => {
      const state = trade.emotional_state?.toLowerCase() || 'unknown';
      const emotionConfig = EMOTIONAL_STATES.find(e => e.id === state);
      if (!emotionConfig) return;
      
      if (!statsByEmotion[state]) {
        statsByEmotion[state] = {
          state,
          label: emotionConfig.label,
          trades: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalPnl: 0,
          avgPnl: 0,
        };
      }
      
      const stats = statsByEmotion[state];
      const pnl = trade.realized_pnl || 0;
      stats.trades++;
      stats.totalPnl += pnl;
      if (pnl > 0) stats.wins++;
      else stats.losses++;
    });
    
    // Calculate derived metrics
    const emotionalStats = Object.values(statsByEmotion)
      .map(stats => ({
        ...stats,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
        avgPnl: stats.trades > 0 ? stats.totalPnl / stats.trades : 0,
      }))
      .filter(s => s.trades >= 3) // Min 3 trades per emotion
      .sort((a, b) => b.winRate - a.winRate);

    // Generate insights
    const insights: EmotionalInsight[] = [];
    
    if (emotionalStats.length >= 2) {
      const best = emotionalStats[0];
      const worst = emotionalStats[emotionalStats.length - 1];
      
      // Best emotion insight
      if (best.winRate >= 60) {
        insights.push({
          type: 'positive',
          title: `${best.label} State Works Best`,
          description: `You have a ${best.winRate.toFixed(0)}% win rate when trading in a ${best.label.toLowerCase()} state. This is your optimal trading mindset.`,
        });
      }
      
      // Worst emotion warning
      if (worst.winRate < 40 && worst.trades >= 5) {
        insights.push({
          type: 'negative',
          title: `Avoid ${worst.label} Trading`,
          description: `Only ${worst.winRate.toFixed(0)}% win rate when ${worst.label.toLowerCase()}. Consider taking a break instead of trading in this state.`,
        });
      }
      
      // Comparison insight
      if (best.winRate - worst.winRate > 20) {
        insights.push({
          type: 'neutral',
          title: 'Emotional Impact',
          description: `You perform ${(best.winRate - worst.winRate).toFixed(0)}% better when ${best.label.toLowerCase()} vs ${worst.label.toLowerCase()}. Emotional awareness is key.`,
        });
      }
      
      // FOMO/Revenge specific warnings
      const fomoStats = emotionalStats.find(s => s.state === 'fomo');
      const revengeStats = emotionalStats.find(s => s.state === 'revenge');
      
      if (fomoStats && fomoStats.totalPnl < 0) {
        insights.push({
          type: 'negative',
          title: 'FOMO Costs You',
          description: `FOMO trading has cost you ${formatCurrency(Math.abs(fomoStats.totalPnl), 'USD')}. Practice patience and wait for your setups.`,
        });
      }
      
      if (revengeStats && revengeStats.winRate < 30) {
        insights.push({
          type: 'negative',
          title: 'Revenge Trading Alert',
          description: `Revenge trades have a ${revengeStats.winRate.toFixed(0)}% win rate. Step away after losses instead of chasing.`,
        });
      }
    }

    return { emotionalStats, insights, hasEnoughData: true };
  }, [trades]);

  if (!hasEnoughData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Emotional Pattern Analysis
          </CardTitle>
          <CardDescription>
            Track emotional states to discover their impact on performance
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Not Enough Data</h3>
          <p className="text-sm text-muted-foreground">
            Log emotional states for at least 10 trades to see patterns.
            Select your emotional state when adding trades.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Emotional Pattern Analysis
        </CardTitle>
        <CardDescription>
          Win rate and P&L breakdown by emotional state
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats by Emotion */}
        <div className="space-y-4">
          {emotionalStats.map((stats) => {
            const emotionConfig = EMOTIONAL_STATES.find(e => e.id === stats.state);
            const EmotionIcon = emotionConfig?.icon || Meh;
            
            return (
              <div key={stats.state} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EmotionIcon className={cn("h-4 w-4", emotionConfig?.color)} />
                    <span className="font-medium">{stats.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stats.trades} trades
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={cn(
                      "font-mono",
                      stats.winRate >= 50 ? "text-profit" : "text-loss"
                    )}>
                      {stats.winRate.toFixed(0)}% WR
                    </span>
                    <span className={cn(
                      "font-mono",
                      stats.totalPnl >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {formatCurrency(stats.totalPnl, 'USD')}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={stats.winRate} 
                  className={cn(
                    "h-2",
                    stats.winRate >= 60 && "[&>div]:bg-profit",
                    stats.winRate >= 40 && stats.winRate < 60 && "[&>div]:bg-yellow-500",
                    stats.winRate < 40 && "[&>div]:bg-loss"
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Insights
            </div>
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg border text-sm",
                  insight.type === 'positive' && "border-profit/30 bg-profit/5",
                  insight.type === 'negative' && "border-loss/30 bg-loss/5",
                  insight.type === 'neutral' && "border-border bg-muted/30"
                )}
              >
                <p className="font-medium mb-1">{insight.title}</p>
                <p className="text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
