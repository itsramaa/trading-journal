/**
 * AI Pre-flight Edge Function - ADVANCED Layered Edge Validation System
 * 
 * THIS IS NOT AN ENTRY SIGNAL GENERATOR.
 * THIS IS A BAD ENTRY KILLER.
 * 
 * Core Principle: "Does this trade have a STABLE EDGE in the CURRENT CONTEXT?"
 * 
 * 5-Layer Analysis:
 * 1. Data Sufficiency Gate - Reject trades with insufficient data
 * 2. Edge Validation - Calculate Expectancy (EV in R-multiples)
 * 3. Context Similarity Engine - Match current context to historical
 * 4. Stability & Risk Filter - Detect unstable edges
 * 5. Bias & Behavior Detection - Expose illusions of skill
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================
// TYPES
// ============================================

type TradingSession = 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OFF_HOURS';
type TrendDirection = 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
type TrendStrength = 'STRONG' | 'MODERATE' | 'WEAK';
type VolatilityBucket = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
type PreflightVerdict = 'PROCEED' | 'CAUTION' | 'SKIP';
type EdgeStrength = 'STRONG' | 'WEAK' | 'NONE' | 'NEGATIVE';

interface RawHistoricalTrade {
  id: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  rMultiple: number;
  timestamp: string;
  session: TradingSession;
  dayOfWeek: number;
  result: 'WIN' | 'LOSS';
  pnl: number;
}

interface MarketSnapshot {
  trendDirection: TrendDirection;
  trendStrength: TrendStrength;
  volatilityPercentile: number;
  volatilityBucket: VolatilityBucket;
  session: TradingSession;
  dayOfWeek: number;
}

interface PreflightRequest {
  pair: string;
  direction: 'LONG' | 'SHORT';
  timeframe: string;
  historicalTrades: RawHistoricalTrade[];
  marketSnapshot: MarketSnapshot;
}

// ============================================
// THRESHOLDS (STRICT - NO NEGOTIATION)
// ============================================

const THRESHOLDS = {
  MIN_TOTAL_TRADES: 20,
  MIN_TRADES_LAST_60_DAYS: 10,
  MAX_GAP_DAYS: 14,
  STRONG_EDGE_R: 0.30,
  WEAK_EDGE_R: 0.10,
  NO_EDGE_R: -0.10,
  HIGH_SIMILARITY: 0.60,
  MIN_SIMILARITY: 0.40,
  MAX_STDDEV_R: 2.0,
  MAX_DRAWDOWN_MULTIPLIER: 2.0,
  MAX_LOSING_STREAK_PENALTY: 5,
  PROFIT_CONCENTRATION_THRESHOLD: 0.50,
  MAX_CONFIDENCE: 80,
  INSUFFICIENT_DATA_MAX_CONFIDENCE: 35,
};

// ============================================
// LAYER 1: DATA SUFFICIENCY GATE
// ============================================

interface DataSufficiencyResult {
  passed: boolean;
  totalTrades: number;
  tradesLast60Days: number;
  maxGapDays: number;
  issues: string[];
}

function analyzeDataSufficiency(trades: RawHistoricalTrade[]): DataSufficiencyResult {
  const issues: string[] = [];
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  // Count trades in last 60 days
  const recentTrades = trades.filter(t => new Date(t.timestamp) >= sixtyDaysAgo);
  
  // Calculate max gap between trades
  let maxGapDays = 0;
  if (trades.length > 1) {
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (let i = 1; i < sortedTrades.length; i++) {
      const gap = (new Date(sortedTrades[i].timestamp).getTime() - 
                   new Date(sortedTrades[i-1].timestamp).getTime()) / (24 * 60 * 60 * 1000);
      maxGapDays = Math.max(maxGapDays, gap);
    }
  }
  
  // Check thresholds
  if (trades.length < THRESHOLDS.MIN_TOTAL_TRADES) {
    issues.push(`Only ${trades.length} total trades (minimum: ${THRESHOLDS.MIN_TOTAL_TRADES})`);
  }
  
  if (recentTrades.length < THRESHOLDS.MIN_TRADES_LAST_60_DAYS) {
    issues.push(`Only ${recentTrades.length} trades in last 60 days (minimum: ${THRESHOLDS.MIN_TRADES_LAST_60_DAYS})`);
  }
  
  if (maxGapDays > THRESHOLDS.MAX_GAP_DAYS) {
    issues.push(`${Math.round(maxGapDays)} day gap between trades (maximum: ${THRESHOLDS.MAX_GAP_DAYS})`);
  }
  
  return {
    passed: issues.length === 0,
    totalTrades: trades.length,
    tradesLast60Days: recentTrades.length,
    maxGapDays: Math.round(maxGapDays),
    issues,
  };
}

// ============================================
// LAYER 2: EDGE VALIDATION (CORE)
// ============================================

interface EdgeValidationResult {
  passed: boolean;
  expectancy: number;
  edgeStrength: EdgeStrength;
  winRate: number;
  avgWinR: number;
  avgLossR: number;
  profitFactor: number;
}

function analyzeEdge(trades: RawHistoricalTrade[]): EdgeValidationResult {
  if (trades.length === 0) {
    return {
      passed: false,
      expectancy: 0,
      edgeStrength: 'NONE',
      winRate: 0,
      avgWinR: 0,
      avgLossR: 0,
      profitFactor: 0,
    };
  }
  
  const wins = trades.filter(t => t.result === 'WIN');
  const losses = trades.filter(t => t.result === 'LOSS');
  
  const winRate = wins.length / trades.length;
  
  // Calculate average R-multiples
  const avgWinR = wins.length > 0 
    ? wins.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / wins.length 
    : 0;
  const avgLossR = losses.length > 0 
    ? losses.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / losses.length 
    : 1; // Default to 1R if no losses
  
  // EXPECTANCY FORMULA: E = (WinRate × AvgWinR) - ((1 - WinRate) × AvgLossR)
  const expectancy = (winRate * avgWinR) - ((1 - winRate) * avgLossR);
  
  // Profit Factor
  const totalWins = wins.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0);
  const totalLosses = losses.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0);
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  
  // Determine edge strength
  let edgeStrength: EdgeStrength;
  let passed: boolean;
  
  if (expectancy >= THRESHOLDS.STRONG_EDGE_R) {
    edgeStrength = 'STRONG';
    passed = true;
  } else if (expectancy >= THRESHOLDS.WEAK_EDGE_R) {
    edgeStrength = 'WEAK';
    passed = true;
  } else if (expectancy >= THRESHOLDS.NO_EDGE_R) {
    edgeStrength = 'NONE';
    passed = false;
  } else {
    edgeStrength = 'NEGATIVE';
    passed = false;
  }
  
  return {
    passed,
    expectancy: Math.round(expectancy * 100) / 100,
    edgeStrength,
    winRate: Math.round(winRate * 100) / 100,
    avgWinR: Math.round(avgWinR * 100) / 100,
    avgLossR: Math.round(avgLossR * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
  };
}

// ============================================
// LAYER 3: CONTEXT SIMILARITY ENGINE
// ============================================

interface ContextSimilarityResult {
  score: number;
  matchedDimensions: string[];
  mismatchedDimensions: string[];
  relevantTradeCount: number;
}

function analyzeContextSimilarity(
  trades: RawHistoricalTrade[],
  direction: 'LONG' | 'SHORT',
  snapshot: MarketSnapshot
): ContextSimilarityResult {
  const matchedDimensions: string[] = [];
  const mismatchedDimensions: string[] = [];
  
  // Filter trades by direction first
  const directionTrades = trades.filter(t => t.direction === direction);
  
  if (directionTrades.length === 0) {
    return {
      score: 0,
      matchedDimensions: [],
      mismatchedDimensions: ['direction (no historical trades in this direction)'],
      relevantTradeCount: 0,
    };
  }
  
  // Context dimensions with weights
  const dimensions = [
    { name: 'direction', weight: 0.20 },
    { name: 'session', weight: 0.25 },
    { name: 'trendDirection', weight: 0.20 },
    { name: 'trendStrength', weight: 0.10 },
    { name: 'volatilityBucket', weight: 0.15 },
    { name: 'dayOfWeek', weight: 0.10 },
  ];
  
  let totalScore = 0;
  let relevantTrades = directionTrades;
  
  // Session match
  const sessionTrades = directionTrades.filter(t => t.session === snapshot.session);
  if (sessionTrades.length >= 3) {
    matchedDimensions.push('session');
    totalScore += dimensions.find(d => d.name === 'session')!.weight;
    relevantTrades = sessionTrades;
  } else {
    mismatchedDimensions.push(`session (only ${sessionTrades.length} trades in ${snapshot.session})`);
  }
  
  // Direction is always matched since we filtered
  matchedDimensions.push('direction');
  totalScore += dimensions.find(d => d.name === 'direction')!.weight;
  
  // Trend direction match - infer from trade results
  // If trade was profitable, assume trend was favorable
  const profitableTrades = relevantTrades.filter(t => t.rMultiple > 0);
  const trendMatchRatio = profitableTrades.length / Math.max(relevantTrades.length, 1);
  
  if (trendMatchRatio >= 0.5) {
    matchedDimensions.push('trendDirection');
    totalScore += dimensions.find(d => d.name === 'trendDirection')!.weight * trendMatchRatio;
  } else {
    mismatchedDimensions.push('trendDirection (low win rate in similar conditions)');
  }
  
  // Trend strength - moderate weight
  totalScore += dimensions.find(d => d.name === 'trendStrength')!.weight * 0.5;
  
  // Volatility bucket - check if trades exist in similar volatility
  // Since we don't have historical volatility, use proxy: high R variance = high volatility period
  const rVariance = calculateVariance(relevantTrades.map(t => t.rMultiple));
  const volatilityMatch = snapshot.volatilityBucket === 'HIGH' || snapshot.volatilityBucket === 'EXTREME'
    ? rVariance > 1 ? 0.7 : 0.3
    : rVariance <= 1 ? 0.7 : 0.3;
  
  if (volatilityMatch >= 0.5) {
    matchedDimensions.push('volatilityBucket');
  } else {
    mismatchedDimensions.push('volatilityBucket (different volatility regime)');
  }
  totalScore += dimensions.find(d => d.name === 'volatilityBucket')!.weight * volatilityMatch;
  
  // Day of week
  const dayTrades = relevantTrades.filter(t => t.dayOfWeek === snapshot.dayOfWeek);
  if (dayTrades.length >= 2) {
    matchedDimensions.push('dayOfWeek');
    totalScore += dimensions.find(d => d.name === 'dayOfWeek')!.weight;
  } else {
    mismatchedDimensions.push(`dayOfWeek (only ${dayTrades.length} trades on this day)`);
  }
  
  return {
    score: Math.round(totalScore * 100) / 100,
    matchedDimensions,
    mismatchedDimensions,
    relevantTradeCount: relevantTrades.length,
  };
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

// ============================================
// LAYER 4: STABILITY & RISK FILTER
// ============================================

type RiskFlag = 
  | 'HIGH_VOLATILITY_RETURNS'
  | 'EXCESSIVE_DRAWDOWN'
  | 'LONG_LOSING_STREAK'
  | 'PROFIT_CONCENTRATION'
  | 'UNSTABLE_EDGE';

interface StabilityResult {
  passed: boolean;
  stdDevR: number;
  maxDrawdownR: number;
  maxLosingStreak: number;
  profitConcentration: number;
  stabilityFactor: number;
  flags: RiskFlag[];
}

function analyzeStability(trades: RawHistoricalTrade[], avgWinR: number): StabilityResult {
  const flags: RiskFlag[] = [];
  let stabilityFactor = 1.0;
  
  if (trades.length === 0) {
    return {
      passed: false,
      stdDevR: 0,
      maxDrawdownR: 0,
      maxLosingStreak: 0,
      profitConcentration: 0,
      stabilityFactor: 0,
      flags: ['UNSTABLE_EDGE'],
    };
  }
  
  // Standard deviation of R-multiples
  const rMultiples = trades.map(t => t.rMultiple);
  const stdDevR = Math.sqrt(calculateVariance(rMultiples));
  
  if (stdDevR > THRESHOLDS.MAX_STDDEV_R) {
    flags.push('HIGH_VOLATILITY_RETURNS');
    stabilityFactor -= 0.15;
  }
  
  // Max drawdown calculation (cumulative R)
  let runningR = 0;
  let peak = 0;
  let maxDrawdownR = 0;
  
  for (const trade of trades) {
    runningR += trade.rMultiple;
    if (runningR > peak) peak = runningR;
    const drawdown = peak - runningR;
    if (drawdown > maxDrawdownR) maxDrawdownR = drawdown;
  }
  
  // Check if max DD exceeds threshold
  if (avgWinR > 0 && maxDrawdownR > avgWinR * THRESHOLDS.MAX_DRAWDOWN_MULTIPLIER) {
    flags.push('EXCESSIVE_DRAWDOWN');
    stabilityFactor -= 0.20;
  }
  
  // Max losing streak
  let currentStreak = 0;
  let maxLosingStreak = 0;
  
  for (const trade of trades) {
    if (trade.result === 'LOSS') {
      currentStreak++;
      maxLosingStreak = Math.max(maxLosingStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  if (maxLosingStreak >= THRESHOLDS.MAX_LOSING_STREAK_PENALTY) {
    flags.push('LONG_LOSING_STREAK');
    stabilityFactor -= 0.15;
  }
  
  // Profit concentration (% of profit from top 20% of trades)
  const profitableTrades = trades.filter(t => t.rMultiple > 0).sort((a, b) => b.rMultiple - a.rMultiple);
  const top20Count = Math.max(1, Math.ceil(profitableTrades.length * 0.20));
  const top20Profit = profitableTrades.slice(0, top20Count).reduce((sum, t) => sum + t.rMultiple, 0);
  const totalProfit = profitableTrades.reduce((sum, t) => sum + t.rMultiple, 0);
  const profitConcentration = totalProfit > 0 ? top20Profit / totalProfit : 0;
  
  if (profitConcentration >= THRESHOLDS.PROFIT_CONCENTRATION_THRESHOLD) {
    flags.push('PROFIT_CONCENTRATION');
    stabilityFactor -= 0.10;
  }
  
  // Determine if passed
  const passed = !flags.includes('EXCESSIVE_DRAWDOWN') && stabilityFactor >= 0.5;
  
  return {
    passed,
    stdDevR: Math.round(stdDevR * 100) / 100,
    maxDrawdownR: Math.round(maxDrawdownR * 100) / 100,
    maxLosingStreak,
    profitConcentration: Math.round(profitConcentration * 100) / 100,
    stabilityFactor: Math.max(0, Math.round(stabilityFactor * 100) / 100),
    flags,
  };
}

// ============================================
// LAYER 5: BIAS & BEHAVIOR DETECTION
// ============================================

type BiasFlag =
  | 'ILLUSION_OF_SKILL'
  | 'DIRECTIONAL_BIAS'
  | 'SESSION_DEPENDENT'
  | 'RECENCY_BIAS'
  | 'OVERCONFIDENCE'
  | 'REVENGE_PATTERN';

interface BiasDetail {
  type: BiasFlag;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface BiasDetectionResult {
  flags: BiasFlag[];
  penalty: number;
  details: BiasDetail[];
}

function analyzeBias(
  trades: RawHistoricalTrade[],
  direction: 'LONG' | 'SHORT',
  edgeResult: EdgeValidationResult
): BiasDetectionResult {
  const flags: BiasFlag[] = [];
  const details: BiasDetail[] = [];
  let penalty = 0;
  
  if (trades.length === 0) {
    return { flags: [], penalty: 0, details: [] };
  }
  
  // 1. Illusion of Skill: High WR + Negative EV
  if (edgeResult.winRate >= 0.6 && edgeResult.expectancy < 0) {
    flags.push('ILLUSION_OF_SKILL');
    details.push({
      type: 'ILLUSION_OF_SKILL',
      description: `Win rate ${(edgeResult.winRate * 100).toFixed(0)}% but negative expectancy (${edgeResult.expectancy.toFixed(2)}R). Wins are too small relative to losses.`,
      severity: 'HIGH',
    });
    penalty += 15;
  }
  
  // 2. Directional Bias: Only profitable in one direction
  const longTrades = trades.filter(t => t.direction === 'LONG');
  const shortTrades = trades.filter(t => t.direction === 'SHORT');
  
  if (longTrades.length >= 5 && shortTrades.length >= 5) {
    const longEV = calculateExpectancy(longTrades);
    const shortEV = calculateExpectancy(shortTrades);
    
    if ((direction === 'LONG' && longEV < 0 && shortEV > 0) ||
        (direction === 'SHORT' && shortEV < 0 && longEV > 0)) {
      flags.push('DIRECTIONAL_BIAS');
      details.push({
        type: 'DIRECTIONAL_BIAS',
        description: `Historical edge is ${direction === 'LONG' ? 'SHORT' : 'LONG'}-biased. ${direction} trades have negative expectancy.`,
        severity: 'HIGH',
      });
      penalty += 10;
    }
  } else if ((direction === 'LONG' && longTrades.length < 5) ||
             (direction === 'SHORT' && shortTrades.length < 5)) {
    flags.push('DIRECTIONAL_BIAS');
    details.push({
      type: 'DIRECTIONAL_BIAS',
      description: `Insufficient ${direction} trades (${direction === 'LONG' ? longTrades.length : shortTrades.length}) for reliable analysis.`,
      severity: 'MEDIUM',
    });
    penalty += 5;
  }
  
  // 3. Session Dependent Edge
  const sessions: TradingSession[] = ['ASIA', 'LONDON', 'NEW_YORK', 'OFF_HOURS'];
  const sessionEVs: Record<string, { ev: number; count: number }> = {};
  
  for (const session of sessions) {
    const sessionTrades = trades.filter(t => t.session === session);
    if (sessionTrades.length >= 3) {
      sessionEVs[session] = {
        ev: calculateExpectancy(sessionTrades),
        count: sessionTrades.length,
      };
    }
  }
  
  const profitableSessions = Object.entries(sessionEVs).filter(([, data]) => data.ev > 0.1);
  const unprofitableSessions = Object.entries(sessionEVs).filter(([, data]) => data.ev < -0.1);
  
  if (profitableSessions.length === 1 && unprofitableSessions.length >= 1) {
    flags.push('SESSION_DEPENDENT');
    details.push({
      type: 'SESSION_DEPENDENT',
      description: `Edge only positive in ${profitableSessions[0][0]} session. Other sessions show negative expectancy.`,
      severity: 'MEDIUM',
    });
    penalty += 8;
  }
  
  // 4. Recency Bias: Recent trades significantly different from historical
  if (trades.length >= 20) {
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const recent10 = sortedTrades.slice(0, 10);
    const older = sortedTrades.slice(10);
    
    const recentEV = calculateExpectancy(recent10);
    const olderEV = calculateExpectancy(older);
    
    if (Math.abs(recentEV - olderEV) > 0.5) {
      flags.push('RECENCY_BIAS');
      details.push({
        type: 'RECENCY_BIAS',
        description: `Recent trades (EV: ${recentEV.toFixed(2)}R) deviate significantly from historical (EV: ${olderEV.toFixed(2)}R).`,
        severity: recentEV < olderEV ? 'HIGH' : 'LOW',
      });
      penalty += recentEV < olderEV ? 10 : 3;
    }
  }
  
  // 5. Revenge Pattern: Clustering of trades after losses
  const sortedByTime = [...trades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  let revengeCount = 0;
  for (let i = 1; i < sortedByTime.length; i++) {
    const prevTrade = sortedByTime[i - 1];
    const currTrade = sortedByTime[i];
    
    // If previous was a loss and next trade is within 2 hours
    if (prevTrade.result === 'LOSS') {
      const timeDiff = new Date(currTrade.timestamp).getTime() - new Date(prevTrade.timestamp).getTime();
      if (timeDiff < 2 * 60 * 60 * 1000) { // 2 hours
        revengeCount++;
      }
    }
  }
  
  if (revengeCount >= 3 && revengeCount / trades.length > 0.15) {
    flags.push('REVENGE_PATTERN');
    details.push({
      type: 'REVENGE_PATTERN',
      description: `${revengeCount} trades entered within 2 hours of a loss. Potential emotional trading pattern.`,
      severity: 'MEDIUM',
    });
    penalty += 7;
  }
  
  return {
    flags,
    penalty: Math.min(penalty, 20), // Cap at 20
    details,
  };
}

function calculateExpectancy(trades: RawHistoricalTrade[]): number {
  if (trades.length === 0) return 0;
  
  const wins = trades.filter(t => t.result === 'WIN');
  const losses = trades.filter(t => t.result === 'LOSS');
  
  const winRate = wins.length / trades.length;
  const avgWinR = wins.length > 0 
    ? wins.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / wins.length 
    : 0;
  const avgLossR = losses.length > 0 
    ? losses.reduce((sum, t) => sum + Math.abs(t.rMultiple), 0) / losses.length 
    : 1;
  
  return (winRate * avgWinR) - ((1 - winRate) * avgLossR);
}

// ============================================
// VERDICT ENGINE
// ============================================

interface PreflightResponse {
  verdict: PreflightVerdict;
  confidence: number;
  expectancy: number;
  edgeStrength: EdgeStrength;
  contextSimilarity: number;
  riskFlags: RiskFlag[];
  biasFlags: BiasFlag[];
  layers: {
    dataSufficiency: DataSufficiencyResult;
    edgeValidation: EdgeValidationResult;
    contextSimilarity: ContextSimilarityResult;
    stability: StabilityResult;
    biasDetection: BiasDetectionResult;
  };
  reasoning: string;
  analyzedAt: string;
  tradesSampled: number;
}

function generateVerdict(
  dataSufficiency: DataSufficiencyResult,
  edgeValidation: EdgeValidationResult,
  contextSimilarity: ContextSimilarityResult,
  stability: StabilityResult,
  biasDetection: BiasDetectionResult,
  pair: string,
  direction: 'LONG' | 'SHORT'
): PreflightResponse {
  let verdict: PreflightVerdict;
  let confidence: number;
  const reasoning: string[] = [];
  
  // ===== HARD GATES =====
  
  // Gate 1: Data Sufficiency
  if (!dataSufficiency.passed) {
    verdict = 'SKIP';
    confidence = Math.min(THRESHOLDS.INSUFFICIENT_DATA_MAX_CONFIDENCE, 35);
    reasoning.push(`INSUFFICIENT DATA: ${dataSufficiency.issues.join('. ')}`);
    reasoning.push('Small data = Big ego. Cannot make reliable predictions.');
    
    return buildResponse(verdict, confidence, reasoning, dataSufficiency, edgeValidation, contextSimilarity, stability, biasDetection);
  }
  
  // Gate 2: Edge Validation
  if (!edgeValidation.passed) {
    verdict = 'SKIP';
    confidence = 40;
    
    if (edgeValidation.edgeStrength === 'NEGATIVE') {
      reasoning.push(`NEGATIVE EDGE: Expectancy ${edgeValidation.expectancy}R. Trading this setup DESTROYS capital.`);
    } else {
      reasoning.push(`NO EDGE: Expectancy ${edgeValidation.expectancy}R is statistically insignificant.`);
    }
    reasoning.push(`Win Rate: ${(edgeValidation.winRate * 100).toFixed(0)}%, Avg Win: ${edgeValidation.avgWinR}R, Avg Loss: ${edgeValidation.avgLossR}R`);
    
    return buildResponse(verdict, confidence, reasoning, dataSufficiency, edgeValidation, contextSimilarity, stability, biasDetection);
  }
  
  // Gate 3: Context Similarity
  if (contextSimilarity.score < THRESHOLDS.MIN_SIMILARITY) {
    verdict = 'SKIP';
    confidence = 35;
    reasoning.push(`LOW CONTEXT MATCH: Score ${(contextSimilarity.score * 100).toFixed(0)}% (minimum: ${THRESHOLDS.MIN_SIMILARITY * 100}%)`);
    reasoning.push(`Historical edge may not apply to current conditions.`);
    reasoning.push(`Mismatched: ${contextSimilarity.mismatchedDimensions.join(', ')}`);
    
    return buildResponse(verdict, confidence, reasoning, dataSufficiency, edgeValidation, contextSimilarity, stability, biasDetection);
  }
  
  // Gate 4: Stability (Excessive DD = immediate skip)
  if (stability.flags.includes('EXCESSIVE_DRAWDOWN')) {
    verdict = 'SKIP';
    confidence = 40;
    reasoning.push(`UNSTABLE EDGE: Max drawdown (${stability.maxDrawdownR}R) exceeds ${THRESHOLDS.MAX_DRAWDOWN_MULTIPLIER}x average win.`);
    reasoning.push('Edge appears profitable but risk of ruin is too high.');
    
    return buildResponse(verdict, confidence, reasoning, dataSufficiency, edgeValidation, contextSimilarity, stability, biasDetection);
  }
  
  // ===== VERDICT DETERMINATION =====
  
  // Calculate base confidence from sample size
  const baseConfidence = Math.min(30 + dataSufficiency.totalTrades * 0.5, 60);
  
  // Apply factors
  confidence = baseConfidence 
    * contextSimilarity.score 
    * stability.stabilityFactor 
    - biasDetection.penalty;
  
  // Determine verdict based on edge strength and context
  if (edgeValidation.edgeStrength === 'STRONG' && 
      contextSimilarity.score >= THRESHOLDS.HIGH_SIMILARITY && 
      stability.passed &&
      biasDetection.flags.length <= 1) {
    
    verdict = 'PROCEED';
    reasoning.push(`POSITIVE EDGE DETECTED: ${edgeValidation.expectancy}R expectancy with ${(edgeValidation.winRate * 100).toFixed(0)}% win rate.`);
    reasoning.push(`Context match: ${(contextSimilarity.score * 100).toFixed(0)}% similarity to ${contextSimilarity.relevantTradeCount} historical trades.`);
    
    if (stability.flags.length > 0) {
      reasoning.push(`⚠️ Risk notes: ${stability.flags.join(', ')}`);
    }
    
  } else if (edgeValidation.edgeStrength === 'WEAK' || 
             contextSimilarity.score < THRESHOLDS.HIGH_SIMILARITY ||
             biasDetection.flags.length >= 2) {
    
    verdict = 'CAUTION';
    
    if (edgeValidation.edgeStrength === 'WEAK') {
      reasoning.push(`WEAK EDGE: ${edgeValidation.expectancy}R expectancy is marginally positive but not robust.`);
    }
    
    if (contextSimilarity.score < THRESHOLDS.HIGH_SIMILARITY) {
      reasoning.push(`MODERATE CONTEXT MATCH: ${(contextSimilarity.score * 100).toFixed(0)}% similarity. Historical patterns may not fully apply.`);
    }
    
    if (biasDetection.flags.length >= 2) {
      reasoning.push(`BEHAVIORAL CONCERNS: ${biasDetection.flags.join(', ')}`);
      for (const detail of biasDetection.details) {
        reasoning.push(`  - ${detail.description}`);
      }
    }
    
    reasoning.push('Consider reduced position size or waiting for better setup.');
    
  } else {
    verdict = 'PROCEED';
    reasoning.push(`EDGE VALIDATED: ${edgeValidation.expectancy}R expectancy based on ${dataSufficiency.totalTrades} trades.`);
    reasoning.push(`Context relevance: ${(contextSimilarity.score * 100).toFixed(0)}% match to current ${direction} ${pair} conditions.`);
  }
  
  // Cap confidence
  confidence = Math.min(Math.round(confidence), THRESHOLDS.MAX_CONFIDENCE);
  confidence = Math.max(confidence, 20); // Floor at 20
  
  return buildResponse(verdict, confidence, reasoning, dataSufficiency, edgeValidation, contextSimilarity, stability, biasDetection);
}

function buildResponse(
  verdict: PreflightVerdict,
  confidence: number,
  reasoning: string[],
  dataSufficiency: DataSufficiencyResult,
  edgeValidation: EdgeValidationResult,
  contextSimilarity: ContextSimilarityResult,
  stability: StabilityResult,
  biasDetection: BiasDetectionResult
): PreflightResponse {
  return {
    verdict,
    confidence,
    expectancy: edgeValidation.expectancy,
    edgeStrength: edgeValidation.edgeStrength,
    contextSimilarity: contextSimilarity.score,
    riskFlags: stability.flags,
    biasFlags: biasDetection.flags,
    layers: {
      dataSufficiency,
      edgeValidation,
      contextSimilarity,
      stability,
      biasDetection,
    },
    reasoning: reasoning.join('\n'),
    analyzedAt: new Date().toISOString(),
    tradesSampled: dataSufficiency.totalTrades,
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const body = await req.json() as PreflightRequest;
    const { pair, direction, historicalTrades, marketSnapshot } = body;
    
    console.log(`[AI-Preflight] Analyzing ${direction} ${pair} with ${historicalTrades.length} trades`);
    
    // ===== LAYER 1: DATA SUFFICIENCY =====
    const dataSufficiency = analyzeDataSufficiency(historicalTrades);
    console.log(`[Layer 1] Data Sufficiency: ${dataSufficiency.passed ? 'PASS' : 'FAIL'}`);
    
    // ===== LAYER 2: EDGE VALIDATION =====
    // Filter to pair-specific trades if enough data
    const pairTrades = historicalTrades.filter(t => 
      t.pair.toUpperCase() === pair.toUpperCase()
    );
    const tradesToAnalyze = pairTrades.length >= 10 ? pairTrades : historicalTrades;
    
    const edgeValidation = analyzeEdge(tradesToAnalyze);
    console.log(`[Layer 2] Edge Validation: ${edgeValidation.edgeStrength} (EV: ${edgeValidation.expectancy}R)`);
    
    // ===== LAYER 3: CONTEXT SIMILARITY =====
    const contextSimilarity = analyzeContextSimilarity(tradesToAnalyze, direction, marketSnapshot);
    console.log(`[Layer 3] Context Similarity: ${(contextSimilarity.score * 100).toFixed(0)}%`);
    
    // ===== LAYER 4: STABILITY =====
    const stability = analyzeStability(tradesToAnalyze, edgeValidation.avgWinR);
    console.log(`[Layer 4] Stability: ${stability.passed ? 'PASS' : 'FAIL'} (Factor: ${stability.stabilityFactor})`);
    
    // ===== LAYER 5: BIAS DETECTION =====
    const biasDetection = analyzeBias(tradesToAnalyze, direction, edgeValidation);
    console.log(`[Layer 5] Bias Detection: ${biasDetection.flags.length} flags`);
    
    // ===== GENERATE VERDICT =====
    const response = generateVerdict(
      dataSufficiency,
      edgeValidation,
      contextSimilarity,
      stability,
      biasDetection,
      pair,
      direction
    );
    
    console.log(`[Verdict] ${response.verdict} (Confidence: ${response.confidence}%)`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[AI-Preflight] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      verdict: 'SKIP',
      confidence: 0,
      reasoning: 'System error during analysis. Defaulting to SKIP for safety.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
