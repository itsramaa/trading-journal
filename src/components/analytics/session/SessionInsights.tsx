/**
 * SessionInsights - AI-powered recommendations based on trading session performance
 * Provides actionable insights about best/worst sessions
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
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
import { 
  DATA_QUALITY, 
  SESSION_THRESHOLDS,
} from "@/lib/constants/ai-analytics";

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

// Session order aligned with database values
const SESSION_ORDER: TradingSession[] = ['sydney', 'tokyo', 'london', 'new_york', 'other'];

export function SessionInsights({ bySession }: SessionInsightsProps) {
  const { formatPnl } = useCurrencyConversion();

  // Defensive guard: ensure every session key has valid defaults
  const safeBySession = useMemo(() => {
    const defaults: PerformanceMetrics = { trades: 0, wins: 0, losses: 0, winRate: 0, avgPnl: 0, totalPnl: 0, profitFactor: 0 };
    return Object.fromEntries(
      SESSION_ORDER.map(s => [s, bySession[s] ?? defaults])
    ) as Record<TradingSession, PerformanceMetrics>;
  }, [bySession]);
  
  // Generate session-based insights
  const insights = useMemo((): SessionInsight[] => {
    const result: SessionInsight[] = [];
    
    // Filter sessions with enough trades
    const validSessions = SESSION_ORDER.filter(s => safeBySession[s].trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING);
    
    if (validSessions.length < 2) {
      return [];
    }
    
    // Find best and worst sessions
    let bestSession = validSessions[0];
    let worstSession = validSessions[0];
    
    validSessions.forEach(session => {
      if (safeBySession[session].winRate > safeBySession[bestSession].winRate) {
        bestSession = session;
      }
      if (safeBySession[session].winRate < safeBySession[worstSession].winRate) {
        worstSession = session;
      }
    });
    
    // Best session insight
    if (safeBySession[bestSession].winRate >= SESSION_THRESHOLDS.SESSION_OPPORTUNITY_WIN_RATE) {
      result.push({
        type: 'opportunity',
        title: `${SESSION_LABELS[bestSession]} Session is Your Edge`,
        description: `Your ${formatWinRate(safeBySession[bestSession].winRate)} win rate during ${SESSION_LABELS[bestSession]} session (${formatSessionTimeLocal(bestSession)}) is significantly above average.`,
        session: bestSession,
        recommendation: 'Focus your trading activity during this session to maximize your edge.',
      });
    }
    
    // Worst session warning — gate by expectancy (totalPnl) not just win rate
    if (safeBySession[worstSession].winRate < SESSION_THRESHOLDS.SESSION_WARNING_WIN_RATE && worstSession !== bestSession) {
      const worstData = safeBySession[worstSession];
      if (worstData.totalPnl < 0) {
        result.push({
          type: 'warning',
          title: `Avoid ${SESSION_LABELS[worstSession]} Session`,
          description: `Your ${formatWinRate(worstData.winRate)} win rate during ${SESSION_LABELS[worstSession]} session (${formatSessionTimeLocal(worstSession)}) with ${formatPnl(worstData.totalPnl)} net P&L confirms negative edge.`,
          session: worstSession,
          recommendation: 'Consider reducing position sizes or avoiding trades during this session.',
        });
      } else {
        result.push({
          type: 'pattern',
          title: `${SESSION_LABELS[worstSession]} Low Win Rate, Positive Edge`,
          description: `Despite ${formatWinRate(worstData.winRate)} win rate, this session is net profitable (${formatPnl(worstData.totalPnl)}). Your R:R compensates.`,
          session: worstSession,
          recommendation: 'Monitor this session — your risk-reward offsets low win rate for now.',
        });
      }
    }
    
    // Off-hours pattern (now 'other')
    const otherData = safeBySession['other'];
    if (otherData.trades >= SESSION_THRESHOLDS.OFF_HOURS_MIN_TRADES) {
      if (otherData.winRate < SESSION_THRESHOLDS.SESSION_WARNING_WIN_RATE) {
        result.push({
          type: 'warning',
          title: 'Off-Hours Trading is Costing You',
          description: `Trading outside major sessions has only ${formatWinRate(otherData.winRate)} win rate with ${formatPnl(otherData.totalPnl)} total P&L.`,
          session: 'other',
          recommendation: 'Stick to major market sessions for better liquidity and clearer price action.',
        });
      } else if (otherData.winRate >= SESSION_THRESHOLDS.SESSION_OPPORTUNITY_WIN_RATE) {
        result.push({
          type: 'pattern',
          title: 'Off-Hours Edge Detected',
          description: `You perform well outside major sessions with ${formatWinRate(otherData.winRate)} win rate.`,
          session: 'other',
          recommendation: 'You may have an edge in quieter markets - continue this strategy carefully.',
        });
      }
    }
    
    // Session comparison pattern (Sydney/Tokyo vs New York)
    const asiaWinRate = Math.max(safeBySession.sydney.winRate, safeBySession.tokyo.winRate);
    const nyWinRate = safeBySession.new_york.winRate;
    const asiaTrades = safeBySession.sydney.trades + safeBySession.tokyo.trades;
    
    if (asiaTrades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING && safeBySession.new_york.trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING) {
      const diff = Math.abs(asiaWinRate - nyWinRate);
      if (diff > SESSION_THRESHOLDS.PERFORMANCE_GAP_SIGNIFICANT) {
        const betterSession: TradingSession = asiaWinRate > nyWinRate 
          ? (safeBySession.sydney.winRate >= safeBySession.tokyo.winRate ? 'sydney' : 'tokyo')
          : 'new_york';
        const worseSession: TradingSession = asiaWinRate > nyWinRate ? 'new_york' : 'sydney';
        result.push({
          type: 'pattern',
          title: 'Session Performance Gap',
          description: `Your ${SESSION_LABELS[betterSession]} performance (${formatWinRate(safeBySession[betterSession].winRate)}) is ${diff.toFixed(0)}% better than ${SESSION_LABELS[worseSession]} (${formatWinRate(safeBySession[worseSession].winRate)}).`,
          session: betterSession,
          recommendation: `Consider shifting more trading activity to ${SESSION_LABELS[betterSession]} session.`,
        });
      }
    }
    
    return result;
  }, [safeBySession, formatPnl]);

  // Calculate totals
  const totalTrades = SESSION_ORDER.reduce((sum, s) => sum + safeBySession[s].trades, 0);
  
  if (totalTrades < DATA_QUALITY.MIN_TRADES_FOR_INSIGHTS) {
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SESSION_ORDER.map(session => {
            const data = safeBySession[session];
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
                <div className="text-lg font-bold font-mono-numbers">
                  {data.trades >= 3 ? formatWinRate(data.winRate) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.trades} trades
                </div>
                {data.trades > 0 && data.trades < 10 && (
                  <div className="flex items-center gap-0.5 justify-center text-[10px] text-muted-foreground/60 mt-0.5">
                    Low sample
                    <InfoTooltip content="Fewer than 10 trades in this session. Statistics may not be statistically significant." />
                  </div>
                )}
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
