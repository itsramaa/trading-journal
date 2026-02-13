/**
 * useContextualAnalytics - Segments trade performance by market conditions
 * Analyzes trades based on Fear/Greed zones, volatility levels, event days, and trading sessions
 */
import { useMemo } from "react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import type { UnifiedMarketContext } from "@/types/market-context";
import { getTradeSession, TradingSession } from "@/lib/session-utils";
import { 
  FEAR_GREED_ZONES, 
  DATA_QUALITY, 
  EMOTIONAL_THRESHOLDS,
  VOLATILITY_THRESHOLDS,
  INSIGHT_GENERATION,
} from "@/lib/constants/ai-analytics";

// Performance metrics for a segment
export interface PerformanceMetrics {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  profitFactor: number;
}

// Fear/Greed zone segmentation
export type FearGreedZone = 'extremeFear' | 'fear' | 'neutral' | 'greed' | 'extremeGreed';

// Volatility level segmentation
export type VolatilityLevel = 'low' | 'medium' | 'high';

// Event proximity segmentation
export type EventProximity = 'eventDay' | 'dayBefore' | 'dayAfter' | 'normalDay';

// Contextual insight generated from analysis
export interface ContextualInsight {
  type: 'opportunity' | 'warning' | 'pattern';
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
}

// Full analytics result
export interface ContextualAnalyticsResult {
  // Market Condition Segmentation
  byVolatility: Record<VolatilityLevel, PerformanceMetrics>;
  byFearGreed: Record<FearGreedZone, PerformanceMetrics>;
  byEventProximity: Record<EventProximity, PerformanceMetrics>;
  
  // Session Segmentation - aligned with database values
  bySession: Record<TradingSession, PerformanceMetrics>;
  
  // Correlations (-1 to 1)
  correlations: {
    volatilityVsWinRate: number;
    fearGreedVsWinRate: number;
    eventDayVsPnl: number;
  };
  
  // Generated Insights
  insights: ContextualInsight[];
  
  // Data quality
  totalAnalyzedTrades: number;
  tradesWithContext: number;
  dataQualityPercent: number;
}

// Helper to create empty metrics
function createEmptyMetrics(): PerformanceMetrics {
  return {
    trades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
    profitFactor: 0,
  };
}

// Calculate metrics from trade data
function calculateMetrics(trades: Array<{ pnl: number; result: string }>): PerformanceMetrics {
  if (trades.length === 0) return createEmptyMetrics();
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
  
  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: (wins.length / trades.length) * 100,
    totalPnl,
    avgPnl: totalPnl / trades.length,
    profitFactor: avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0,
  };
}

// Get Fear/Greed zone from value
function getFearGreedZone(value: number): FearGreedZone {
  if (value <= FEAR_GREED_ZONES.EXTREME_FEAR_MAX) return 'extremeFear';
  if (value <= FEAR_GREED_ZONES.FEAR_MAX) return 'fear';
  if (value <= FEAR_GREED_ZONES.NEUTRAL_MAX) return 'neutral';
  if (value <= FEAR_GREED_ZONES.GREED_MAX) return 'greed';
  return 'extremeGreed';
}

// Get volatility level
function getVolatilityLevel(context: UnifiedMarketContext): VolatilityLevel {
  return context.volatility?.level || 'medium';
}

// Check if trade was on event day
function getEventProximity(context: UnifiedMarketContext): EventProximity {
  if (context.events?.hasHighImpactToday) return 'eventDay';
  // For now, we only track event day since we don't store before/after data
  return 'normalDay';
}

// Calculate correlation coefficient (simplified Pearson)
function calculateCorrelation(pairs: Array<{ x: number; y: number }>): number {
  if (pairs.length < DATA_QUALITY.MIN_TRADES_FOR_CORRELATION) return 0;
  
  const n = pairs.length;
  const sumX = pairs.reduce((s, p) => s + p.x, 0);
  const sumY = pairs.reduce((s, p) => s + p.y, 0);
  const sumXY = pairs.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = pairs.reduce((s, p) => s + p.x * p.x, 0);
  const sumY2 = pairs.reduce((s, p) => s + p.y * p.y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

// Generate insights from analytics
function generateInsights(
  byFearGreed: Record<FearGreedZone, PerformanceMetrics>,
  byVolatility: Record<VolatilityLevel, PerformanceMetrics>,
  byEventProximity: Record<EventProximity, PerformanceMetrics>,
): ContextualInsight[] {
  const insights: ContextualInsight[] = [];
  
  // Fear/Greed insights
  const fearZones = ['extremeFear', 'fear'] as FearGreedZone[];
  const greedZones = ['greed', 'extremeGreed'] as FearGreedZone[];
  
  const fearTrades = fearZones.reduce((sum, z) => sum + byFearGreed[z].trades, 0);
  const greedTrades = greedZones.reduce((sum, z) => sum + byFearGreed[z].trades, 0);
  const fearWinRate = fearTrades > 0 
    ? fearZones.reduce((sum, z) => sum + byFearGreed[z].wins, 0) / fearTrades * 100 
    : 0;
  const greedWinRate = greedTrades > 0 
    ? greedZones.reduce((sum, z) => sum + byFearGreed[z].wins, 0) / greedTrades * 100 
    : 0;
  
  if (fearTrades >= DATA_QUALITY.MIN_TRADES_FOR_ZONE_COMPARISON && greedTrades >= DATA_QUALITY.MIN_TRADES_FOR_ZONE_COMPARISON) {
    if (fearWinRate > greedWinRate + INSIGHT_GENERATION.WIN_RATE_DIFF_SIGNIFICANT) {
      insights.push({
        type: 'opportunity',
        title: 'Fear Markets Favor You',
        description: `Your win rate in Fear zones (${fearWinRate.toFixed(0)}%) is significantly higher than in Greed zones (${greedWinRate.toFixed(0)}%).`,
        evidence: `${fearTrades} trades in Fear vs ${greedTrades} in Greed zones`,
        recommendation: 'Consider increasing position sizes during market fear periods.',
      });
    } else if (greedWinRate > fearWinRate + INSIGHT_GENERATION.WIN_RATE_DIFF_SIGNIFICANT) {
      insights.push({
        type: 'opportunity',
        title: 'Greed Markets Favor You',
        description: `Your win rate in Greed zones (${greedWinRate.toFixed(0)}%) is significantly higher than in Fear zones (${fearWinRate.toFixed(0)}%).`,
        evidence: `${greedTrades} trades in Greed vs ${fearTrades} in Fear zones`,
        recommendation: 'Consider riding momentum during bullish sentiment periods.',
      });
    }
  }
  
  // Extreme Fear/Greed warnings
  if (byFearGreed.extremeFear.trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING && byFearGreed.extremeFear.winRate < EMOTIONAL_THRESHOLDS.POOR_WIN_RATE) {
    insights.push({
      type: 'warning',
      title: 'Struggling in Extreme Fear',
      description: `Only ${byFearGreed.extremeFear.winRate.toFixed(0)}% win rate during extreme fear periods.`,
      evidence: `${byFearGreed.extremeFear.trades} trades with ${byFearGreed.extremeFear.losses} losses`,
      recommendation: 'Reduce position sizes or avoid trading during extreme fear.',
    });
  }
  
  if (byFearGreed.extremeGreed.trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING && byFearGreed.extremeGreed.winRate < EMOTIONAL_THRESHOLDS.POOR_WIN_RATE) {
    insights.push({
      type: 'warning',
      title: 'Struggling in Extreme Greed',
      description: `Only ${byFearGreed.extremeGreed.winRate.toFixed(0)}% win rate during extreme greed periods.`,
      evidence: `${byFearGreed.extremeGreed.trades} trades with ${byFearGreed.extremeGreed.losses} losses`,
      recommendation: 'Be cautious of FOMO trades during peak market euphoria.',
    });
  }
  
  // Volatility insights
  if (byVolatility.high.trades >= DATA_QUALITY.MIN_TRADES_FOR_ZONE_COMPARISON && byVolatility.low.trades >= DATA_QUALITY.MIN_TRADES_FOR_ZONE_COMPARISON) {
    if (byVolatility.high.winRate < byVolatility.low.winRate - VOLATILITY_THRESHOLDS.HIGH_VS_LOW_DIFF) {
      insights.push({
        type: 'warning',
        title: 'High Volatility Hurts Performance',
        description: `Win rate drops from ${byVolatility.low.winRate.toFixed(0)}% in calm markets to ${byVolatility.high.winRate.toFixed(0)}% in high volatility.`,
        evidence: `${byVolatility.high.trades} high-vol trades vs ${byVolatility.low.trades} low-vol trades`,
        recommendation: 'Reduce position sizes or tighten stop losses during high volatility.',
      });
    } else if (byVolatility.high.winRate > byVolatility.low.winRate + VOLATILITY_THRESHOLDS.HIGH_VS_LOW_DIFF) {
      insights.push({
        type: 'opportunity',
        title: 'Volatility Trading Edge',
        description: `You perform better in volatile markets (${byVolatility.high.winRate.toFixed(0)}%) vs calm (${byVolatility.low.winRate.toFixed(0)}%).`,
        evidence: `${byVolatility.high.trades} high-vol trades with positive edge`,
        recommendation: 'Consider targeting volatile market conditions for entries.',
      });
    }
  }
  
  // Event day insights
  if (byEventProximity.eventDay.trades >= DATA_QUALITY.MIN_TRADES_FOR_RANKING && byEventProximity.normalDay.trades >= DATA_QUALITY.MIN_TRADES_FOR_INSIGHTS) {
    if (byEventProximity.eventDay.winRate < byEventProximity.normalDay.winRate - VOLATILITY_THRESHOLDS.EVENT_DAY_DIFF) {
      insights.push({
        type: 'warning',
        title: 'Event Days Reduce Edge',
        description: `Win rate drops from ${byEventProximity.normalDay.winRate.toFixed(0)}% on normal days to ${byEventProximity.eventDay.winRate.toFixed(0)}% on event days.`,
        evidence: `${byEventProximity.eventDay.trades} trades on high-impact event days`,
        recommendation: 'Consider avoiding trades on days with major economic events.',
      });
    } else if (byEventProximity.eventDay.avgPnl > byEventProximity.normalDay.avgPnl * VOLATILITY_THRESHOLDS.EVENT_DAY_PNL_MULTIPLIER) {
      insights.push({
        type: 'pattern',
        title: 'Event Day Profit Potential',
        description: `Average P&L on event days ($${byEventProximity.eventDay.avgPnl.toFixed(2)}) is higher than normal days ($${byEventProximity.normalDay.avgPnl.toFixed(2)}).`,
        evidence: `${byEventProximity.eventDay.trades} trades captured event volatility`,
        recommendation: 'You may have an edge trading around major announcements.',
      });
    }
  }
  
  return insights;
}

export function useContextualAnalytics(): {
  data: ContextualAnalyticsResult | null;
  isLoading: boolean;
} {
  const { data: trades, isLoading } = useModeFilteredTrades();
  
  const data = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    
    const closedTrades = trades.filter(t => t.status === 'closed');
    if (closedTrades.length < DATA_QUALITY.MIN_TRADES_FOR_INSIGHTS) return null;
    
    // Trades with market context
    const tradesWithContext = closedTrades.filter(t => t.market_context);
    
    // Initialize segmentation buckets
    const byVolatility: Record<VolatilityLevel, Array<{ pnl: number; result: string }>> = {
      low: [],
      medium: [],
      high: [],
    };
    
    const byFearGreed: Record<FearGreedZone, Array<{ pnl: number; result: string }>> = {
      extremeFear: [],
      fear: [],
      neutral: [],
      greed: [],
      extremeGreed: [],
    };
    
    const byEventProximity: Record<EventProximity, Array<{ pnl: number; result: string }>> = {
      eventDay: [],
      dayBefore: [],
      dayAfter: [],
      normalDay: [],
    };
    
    // Session segmentation buckets - aligned with database values
    const bySessionBuckets: Record<TradingSession, Array<{ pnl: number; result: string }>> = {
      sydney: [],
      tokyo: [],
      london: [],
      new_york: [],
      other: [],
    };
    
    // Correlation data points
    const volatilityCorrelationData: Array<{ x: number; y: number }> = [];
    const fearGreedCorrelationData: Array<{ x: number; y: number }> = [];
    const eventDayCorrelationData: Array<{ x: number; y: number }> = [];
    
    // Process each closed trade (session works for all trades, not just those with context)
    closedTrades.forEach(trade => {
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const result = trade.result || 'unknown';
      const tradeData = { pnl, result };
      
      // Segment by session (works for ALL closed trades)
      const session = getTradeSession({
        trade_date: trade.trade_date,
        session: (trade as any).session, // Use stored session if available
        entry_datetime: null, // Not exposed in TradeEntry interface, use trade_date as fallback
        market_context: trade.market_context as { session?: { current: TradingSession } } | null,
      });
      bySessionBuckets[session].push(tradeData);
    });
    
    // Process each trade with context for market condition segmentation
    tradesWithContext.forEach(trade => {
      const context = trade.market_context as unknown as UnifiedMarketContext;
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const result = trade.result || 'unknown';
      const tradeData = { pnl, result };
      const isWin = pnl > 0 ? 1 : 0;
      
      // Segment by volatility
      const volLevel = getVolatilityLevel(context);
      byVolatility[volLevel].push(tradeData);
      
      if (context.volatility?.value) {
        volatilityCorrelationData.push({ x: context.volatility.value, y: isWin });
      }
      
      // Segment by Fear/Greed
      if (context.fearGreed?.value !== undefined) {
        const zone = getFearGreedZone(context.fearGreed.value);
        byFearGreed[zone].push(tradeData);
        fearGreedCorrelationData.push({ x: context.fearGreed.value, y: isWin });
      }
      
      // Segment by event proximity
      const eventProx = getEventProximity(context);
      byEventProximity[eventProx].push(tradeData);
      eventDayCorrelationData.push({ 
        x: eventProx === 'eventDay' ? 1 : 0, 
        y: pnl 
      });
    });
    
    // Calculate metrics for each segment
    const volatilityMetrics: Record<VolatilityLevel, PerformanceMetrics> = {
      low: calculateMetrics(byVolatility.low),
      medium: calculateMetrics(byVolatility.medium),
      high: calculateMetrics(byVolatility.high),
    };
    
    const fearGreedMetrics: Record<FearGreedZone, PerformanceMetrics> = {
      extremeFear: calculateMetrics(byFearGreed.extremeFear),
      fear: calculateMetrics(byFearGreed.fear),
      neutral: calculateMetrics(byFearGreed.neutral),
      greed: calculateMetrics(byFearGreed.greed),
      extremeGreed: calculateMetrics(byFearGreed.extremeGreed),
    };
    
    const eventProximityMetrics: Record<EventProximity, PerformanceMetrics> = {
      eventDay: calculateMetrics(byEventProximity.eventDay),
      dayBefore: calculateMetrics(byEventProximity.dayBefore),
      dayAfter: calculateMetrics(byEventProximity.dayAfter),
      normalDay: calculateMetrics(byEventProximity.normalDay),
    };
    
    // Session metrics - aligned with database values
    const sessionMetrics: Record<TradingSession, PerformanceMetrics> = {
      sydney: calculateMetrics(bySessionBuckets.sydney),
      tokyo: calculateMetrics(bySessionBuckets.tokyo),
      london: calculateMetrics(bySessionBuckets.london),
      new_york: calculateMetrics(bySessionBuckets.new_york),
      other: calculateMetrics(bySessionBuckets.other),
    };
    
    // Calculate correlations
    const correlations = {
      volatilityVsWinRate: calculateCorrelation(volatilityCorrelationData),
      fearGreedVsWinRate: calculateCorrelation(fearGreedCorrelationData),
      eventDayVsPnl: calculateCorrelation(eventDayCorrelationData),
    };
    
    // Generate insights
    const insights = generateInsights(
      fearGreedMetrics,
      volatilityMetrics,
      eventProximityMetrics,
    );
    
    return {
      byVolatility: volatilityMetrics,
      byFearGreed: fearGreedMetrics,
      byEventProximity: eventProximityMetrics,
      bySession: sessionMetrics,
      correlations,
      insights,
      totalAnalyzedTrades: closedTrades.length,
      tradesWithContext: tradesWithContext.length,
      dataQualityPercent: closedTrades.length > 0 
        ? (tradesWithContext.length / closedTrades.length) * 100 
        : 0,
    };
  }, [trades]);
  
  return { data, isLoading };
}
