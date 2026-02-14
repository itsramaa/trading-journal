/**
 * Predictive Analytics — Statistical Pattern-Based Predictions
 * Pure functions for calculating trading predictions from historical data.
 */

import { getDayLabel, getTimeSlotHour, TIME_ANALYSIS } from "@/lib/constants/ai-analytics";

export interface TradeData {
  trade_date: string;
  realized_pnl?: number | null;
  pnl?: number | null;
  pair: string;
  session?: string | null;
  status: string;
}

export type Confidence = 'low' | 'medium' | 'high';

export interface PredictionResult {
  value: number;
  description: string;
  confidence: Confidence;
  sampleSize: number;
}

const CONFIDENCE_THRESHOLDS = {
  LOW: 5,
  MEDIUM: 15,
  HIGH: 30,
} as const;

function getConfidence(n: number): Confidence {
  if (n >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (n >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

function getPnl(t: TradeData): number {
  return t.realized_pnl ?? t.pnl ?? 0;
}

/**
 * Calculate probability of continuing current streak based on historical patterns.
 * E.g., after 2 consecutive wins, what % of the time did the next trade also win?
 */
export function calculateStreakProbability(trades: TradeData[]): PredictionResult | null {
  const sorted = [...trades]
    .filter(t => t.status === 'closed')
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  if (sorted.length < 5) return null;

  // Find current streak
  let currentStreak = 0;
  let streakType: 'win' | 'loss' | null = null;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const isWin = getPnl(sorted[i]) > 0;
    if (streakType === null) {
      streakType = isWin ? 'win' : 'loss';
      currentStreak = 1;
    } else if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
      currentStreak++;
    } else break;
  }

  if (currentStreak < 1 || !streakType) return null;

  // Count historical: after N consecutive same-type, how often did N+1 continue?
  const streakLen = Math.min(currentStreak, 5); // cap at 5 for sample size
  let occurrences = 0;
  let continuations = 0;

  for (let i = streakLen; i < sorted.length; i++) {
    let match = true;
    for (let j = 0; j < streakLen; j++) {
      const isWin = getPnl(sorted[i - streakLen + j]) > 0;
      if ((streakType === 'win' && !isWin) || (streakType === 'loss' && isWin)) {
        match = false;
        break;
      }
    }
    if (match) {
      occurrences++;
      const nextWin = getPnl(sorted[i]) > 0;
      if ((streakType === 'win' && nextWin) || (streakType === 'loss' && !nextWin)) {
        continuations++;
      }
    }
  }

  if (occurrences < 3) return null;

  const prob = (continuations / occurrences) * 100;
  return {
    value: prob,
    description: `After ${currentStreak} consecutive ${streakType}s, historically ${prob.toFixed(0)}% chance the next trade is also a ${streakType}.`,
    confidence: getConfidence(occurrences),
    sampleSize: occurrences,
  };
}

/**
 * Get today's day-of-week historical edge.
 */
export function getDayOfWeekEdge(trades: TradeData[]): PredictionResult | null {
  const closed = trades.filter(t => t.status === 'closed');
  if (closed.length < 10) return null;

  const today = getDayLabel(new Date());
  const todayTrades = closed.filter(t => getDayLabel(new Date(t.trade_date)) === today);

  if (todayTrades.length < 3) return null;

  const wins = todayTrades.filter(t => getPnl(t) > 0).length;
  const winRate = (wins / todayTrades.length) * 100;
  const overallWins = closed.filter(t => getPnl(t) > 0).length;
  const overallWR = (overallWins / closed.length) * 100;
  const diff = winRate - overallWR;

  const sentiment = diff > 5 ? 'Favorable' : diff < -5 ? 'Unfavorable' : 'Neutral';

  return {
    value: winRate,
    description: `Today (${today}) has a historical win rate of ${winRate.toFixed(0)}% (${diff > 0 ? '+' : ''}${diff.toFixed(0)}% vs average). ${sentiment} conditions.`,
    confidence: getConfidence(todayTrades.length),
    sampleSize: todayTrades.length,
  };
}

/**
 * Calculate momentum score for each pair based on last N trades.
 */
export function getPairMomentum(trades: TradeData[], lookback = 5): Array<{
  pair: string;
  wins: number;
  total: number;
  momentum: 'bullish' | 'bearish' | 'neutral';
  description: string;
}> {
  const closed = trades.filter(t => t.status === 'closed');
  const byPair: Record<string, TradeData[]> = {};

  closed.forEach(t => {
    if (!byPair[t.pair]) byPair[t.pair] = [];
    byPair[t.pair].push(t);
  });

  return Object.entries(byPair)
    .filter(([, arr]) => arr.length >= 3)
    .map(([pair, arr]) => {
      const recent = arr
        .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
        .slice(0, lookback);

      const wins = recent.filter(t => getPnl(t) > 0).length;
      const total = recent.length;
      const ratio = wins / total;

      const momentum = ratio >= 0.6 ? 'bullish' as const : ratio <= 0.4 ? 'bearish' as const : 'neutral' as const;
      const desc = momentum === 'bullish'
        ? `${pair} uptrend performa (${wins}/${total} wins)`
        : momentum === 'bearish'
          ? `${pair} declining edge (${wins}/${total} wins)`
          : `${pair} mixed signals (${wins}/${total} wins)`;

      return { pair, wins, total, momentum, description: desc };
    })
    .sort((a, b) => (b.wins / b.total) - (a.wins / a.total));
}

/**
 * Session outlook based on current time and historical session performance.
 */
export function getSessionOutlook(trades: TradeData[]): PredictionResult | null {
  const closed = trades.filter(t => t.status === 'closed' && t.session);
  if (closed.length < 10) return null;

  // Determine current session (rough estimate based on UTC hour)
  const hour = new Date().getUTCHours();
  let currentSessionKeys: string;
  let currentSessionLabel: string;
  if (hour >= 20 || hour < 5) {
    currentSessionKeys = 'sydney|tokyo';
    currentSessionLabel = 'Asia';
  } else if (hour >= 7 && hour < 16) {
    currentSessionKeys = 'london';
    currentSessionLabel = 'London';
  } else if (hour >= 13 && hour < 22) {
    currentSessionKeys = 'new_york';
    currentSessionLabel = 'New York';
  } else {
    currentSessionKeys = 'other';
    currentSessionLabel = 'Off-hours';
  }

  const sessionTrades = closed.filter(t => {
    const s = t.session?.toLowerCase() || '';
    return currentSessionKeys.split('|').some(cs => s === cs);
  });

  if (sessionTrades.length < 3) return null;

  const sessionWins = sessionTrades.filter(t => getPnl(t) > 0).length;
  const sessionWR = (sessionWins / sessionTrades.length) * 100;

  const overallWins = closed.filter(t => getPnl(t) > 0).length;
  const overallWR = (overallWins / closed.length) * 100;
  const diff = sessionWR - overallWR;

  return {
    value: sessionWR,
    description: `${currentSessionLabel} Session: ${sessionWR.toFixed(0)}% win rate (${diff > 0 ? '+' : ''}${diff.toFixed(0)}% vs average).`,
    confidence: getConfidence(sessionTrades.length),
    sampleSize: sessionTrades.length,
  };
}
