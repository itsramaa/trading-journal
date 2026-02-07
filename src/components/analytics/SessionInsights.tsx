/**
 * SessionInsights - AI-powered recommendations based on trading session performance
 * Provides actionable insights about best/worst sessions
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Trophy,
  AlertTriangle,
  Target,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
import { 
  TradingSession, 
  SESSION_LABELS, 
  SESSION_COLORS, 
  formatSessionTimeLocal 
} from "@/lib/session-utils";
import { formatWinRate } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { PerformanceMetrics } from "@/hooks/use-contextual-analytics";
import { cn } from "@/lib/utils";

interface SessionInsightsProps {
  bySession: Record<TradingSession, PerformanceMetrics>;
}

interface SessionInsight {
  type: 'opportunity' | 'warning' | 'pattern';
  title: string;
  description: string;
  session: TradingSession;
  recommendation: string;
}

const SESSION_ORDER: TradingSession[] = ['asia', 'london', 'newyork', 'off-hours'];

export function SessionInsights({ bySession }: SessionInsightsProps) {
  const { formatPnl } = useCurrencyConversion();
  
  // Generate session-based insights
  const insights = useMemo((): SessionInsight[] => {
    const result: SessionInsight[] = [];
    
    // Filter sessions with enough trades
    const validSessions = SESSION_ORDER.filter(s => bySession[s].trades >= 3);
    
    if (validSessions.length < 2) {
      return [];
    }
    
    // Find best and worst sessions
    let bestSession = validSessions[0];
    let worstSession = validSessions[0];
    
    validSessions.forEach(session => {
      if (bySession[session].winRate > bySession[bestSession].winRate) {
        bestSession = session;
      }
      if (bySession[session].winRate < bySession[worstSession].winRate) {
        worstSession = session;
      }
    });
    
    // Best session insight
    if (bySession[bestSession].winRate >= 55) {
      result.push({
        type: 'opportunity',
        title: `${SESSION_LABELS[bestSession]} Session is Your Edge`,
        description: `Your ${formatWinRate(bySession[bestSession].winRate)} win rate during ${SESSION_LABELS[bestSession]} session (${formatSessionTimeLocal(bestSession)}) is significantly above average.`,
        session: bestSession,
        recommendation: 'Focus your trading activity during this session to maximize your edge.',
      });
    }
    
    // Worst session warning
    if (bySession[worstSession].winRate < 45 && worstSession !== bestSession) {
      result.push({
        type: 'warning',
        title: `Avoid ${SESSION_LABELS[worstSession]} Session`,
        description: `Your ${formatWinRate(bySession[worstSession].winRate)} win rate during ${SESSION_LABELS[worstSession]} session (${formatSessionTimeLocal(worstSession)}) is below breakeven.`,
        session: worstSession,
        recommendation: 'Consider reducing position sizes or avoiding trades during this session.',
      });
    }
    
    // Off-hours pattern
    const offHoursData = bySession['off-hours'];
    if (offHoursData.trades >= 5) {
      if (offHoursData.winRate < 45) {
        result.push({
          type: 'warning',
          title: 'Off-Hours Trading is Costing You',
          description: `Trading outside major sessions has only ${formatWinRate(offHoursData.winRate)} win rate with ${formatPnl(offHoursData.totalPnl)} total P&L.`,
          session: 'off-hours',
          recommendation: 'Stick to major market sessions for better liquidity and clearer price action.',
        });
      } else if (offHoursData.winRate >= 55) {
        result.push({
          type: 'pattern',
          title: 'Off-Hours Edge Detected',
          description: `You perform well outside major sessions with ${formatWinRate(offHoursData.winRate)} win rate.`,
          session: 'off-hours',
          recommendation: 'You may have an edge in quieter markets - continue this strategy carefully.',
        });
      }
    }
    
    // Session comparison pattern
    const asiaWinRate = bySession.asia.winRate;
    const nyWinRate = bySession.newyork.winRate;
    
    if (bySession.asia.trades >= 3 && bySession.newyork.trades >= 3) {
      const diff = Math.abs(asiaWinRate - nyWinRate);
      if (diff > 15) {
        const betterSession = asiaWinRate > nyWinRate ? 'asia' : 'newyork';
        const worseSession = asiaWinRate > nyWinRate ? 'newyork' : 'asia';
        result.push({
          type: 'pattern',
          title: 'Session Performance Gap',
          description: `Your ${SESSION_LABELS[betterSession]} performance (${formatWinRate(bySession[betterSession].winRate)}) is ${diff.toFixed(0)}% better than ${SESSION_LABELS[worseSession]} (${formatWinRate(bySession[worseSession].winRate)}).`,
          session: betterSession,
          recommendation: `Consider shifting more trading activity to ${SESSION_LABELS[betterSession]} session.`,
        });
      }
    }
    
    return result;
  }, [bySession]);

  // Calculate totals
  const totalTrades = SESSION_ORDER.reduce((sum, s) => sum + bySession[s].trades, 0);
  
  if (totalTrades < 5) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Session Insights
          </CardTitle>
          <CardDescription>AI recommendations based on session performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Need at least 5 trades to analyze session patterns</p>
            <p className="text-sm mt-2">Current: {totalTrades} trades</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInsightIcon = (type: SessionInsight['type']) => {
    switch (type) {
      case 'opportunity': return Trophy;
      case 'warning': return AlertTriangle;
      case 'pattern': return Lightbulb;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Session Insights
        </CardTitle>
        <CardDescription>AI recommendations based on trading session performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SESSION_ORDER.map(session => {
            const data = bySession[session];
            return (
              <div 
                key={session}
                className={cn(
                  "p-3 rounded-lg border text-center",
                  data.trades < 3 && "opacity-60"
                )}
              >
                <Badge variant="outline" className={cn("mb-2", SESSION_COLORS[session])}>
                  {SESSION_LABELS[session]}
                </Badge>
                <div className="text-lg font-bold">
                  {data.trades >= 3 ? formatWinRate(data.winRate) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.trades} trades
                </div>
                {data.trades >= 3 && (
                  <div className={cn(
                    "text-sm font-medium mt-1",
                    data.totalPnl >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {formatPnl(data.totalPnl)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Insights */}
        {insights.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Recommendations
            </h4>
            {insights.map((insight, index) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <div 
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border",
                    insight.type === 'opportunity' && "border-profit/30 bg-profit/5",
                    insight.type === 'warning' && "border-loss/30 bg-loss/5",
                    insight.type === 'pattern' && "border-primary/30 bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn(
                      "h-5 w-5 mt-0.5 shrink-0",
                      insight.type === 'opportunity' && "text-profit",
                      insight.type === 'warning' && "text-loss",
                      insight.type === 'pattern' && "text-primary"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{insight.title}</p>
                        <Badge variant="outline" className={SESSION_COLORS[insight.session]}>
                          {SESSION_LABELS[insight.session]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                      <div className="flex items-start gap-2 mt-3 p-2 rounded bg-muted/50">
                        <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">
                          {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-profit" />
            <p className="font-medium">Consistent Across Sessions</p>
            <p className="text-sm text-muted-foreground">
              Your performance is relatively balanced across trading sessions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
