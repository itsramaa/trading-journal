/**
 * AI Pre-flight Types - Advanced Layered Edge Validation System
 * 
 * This is NOT an entry signal generator.
 * This is a BAD ENTRY KILLER.
 * 
 * Core principle: "Does this trade have a STABLE EDGE in the CURRENT CONTEXT?"
 */

// ============================================
// INPUT TYPES
// ============================================

/**
 * Raw historical trade data from user's trading history
 * Used to calculate expectancy, edge stability, and detect biases
 */
export interface RawHistoricalTrade {
  id: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  rMultiple: number;           // (exitPrice - entryPrice) / riskPerUnit
  timestamp: string;           // ISO timestamp
  session: TradingSession;
  dayOfWeek: number;           // 0-6
  result: 'WIN' | 'LOSS';
  pnl: number;
}

export type TradingSession = 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OFF_HOURS';
export type TrendDirection = 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
export type TrendStrength = 'STRONG' | 'MODERATE' | 'WEAK';
export type VolatilityBucket = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

/**
 * Current market snapshot for context matching
 */
export interface MarketSnapshot {
  trendDirection: TrendDirection;
  trendStrength: TrendStrength;
  volatilityPercentile: number;    // 0-100
  volatilityBucket: VolatilityBucket;
  session: TradingSession;
  dayOfWeek: number;
}

/**
 * Pre-flight check input - Complete data for analysis
 */
export interface PreflightInput {
  pair: string;
  direction: 'LONG' | 'SHORT';
  timeframe: string;
  
  // Historical data (RAW - no pre-processing)
  historicalTrades: RawHistoricalTrade[];
  
  // Current market context
  marketSnapshot: MarketSnapshot;
}

// ============================================
// OUTPUT TYPES
// ============================================

export type PreflightVerdict = 'PROCEED' | 'CAUTION' | 'SKIP';

export type EdgeStrength = 'STRONG' | 'WEAK' | 'NONE' | 'NEGATIVE';

/**
 * Layer 1: Data Sufficiency Gate result
 */
export interface DataSufficiencyResult {
  passed: boolean;
  totalTrades: number;
  tradesLast60Days: number;
  maxGapDays: number;
  issues: string[];
}

/**
 * Layer 2: Edge Validation result
 */
export interface EdgeValidationResult {
  passed: boolean;
  expectancy: number;           // In R-multiples
  edgeStrength: EdgeStrength;
  winRate: number;
  avgWinR: number;
  avgLossR: number;
  profitFactor: number;
}

/**
 * Layer 3: Context Similarity result
 */
export interface ContextSimilarityResult {
  score: number;                // 0-1
  matchedDimensions: string[];
  mismatchedDimensions: string[];
  relevantTradeCount: number;
}

/**
 * Layer 4: Stability & Risk Filter result
 */
export interface StabilityResult {
  passed: boolean;
  stdDevR: number;              // Standard deviation of R-multiples
  maxDrawdownR: number;         // Max drawdown in R
  maxLosingStreak: number;
  profitConcentration: number;  // % of profit from top 20% trades
  stabilityFactor: number;      // 0-1 multiplier for confidence
  flags: RiskFlag[];
}

export type RiskFlag = 
  | 'HIGH_VOLATILITY_RETURNS'
  | 'EXCESSIVE_DRAWDOWN'
  | 'LONG_LOSING_STREAK'
  | 'PROFIT_CONCENTRATION'
  | 'UNSTABLE_EDGE';

/**
 * Layer 5: Bias & Behavior Detection result
 */
export interface BiasDetectionResult {
  flags: BiasFlag[];
  penalty: number;              // 0-20 confidence penalty
  details: BiasDetail[];
}

export interface BiasDetail {
  type: BiasFlag;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type BiasFlag =
  | 'ILLUSION_OF_SKILL'         // High WR + Negative EV
  | 'DIRECTIONAL_BIAS'          // Only profitable in one direction
  | 'SESSION_DEPENDENT'         // Edge only in specific session
  | 'RECENCY_BIAS'              // Recent trades deviate from historical
  | 'OVERCONFIDENCE'            // Taking too large positions
  | 'REVENGE_PATTERN';          // Clustering after losses

/**
 * Complete Pre-flight Response
 */
export interface PreflightResponse {
  // Core verdict
  verdict: PreflightVerdict;
  confidence: number;           // 0-80% MAX (no certainty in markets)
  
  // Edge metrics (NOT win prediction)
  expectancy: number;           // In R-multiples
  edgeStrength: EdgeStrength;
  
  // Context relevance
  contextSimilarity: number;    // 0-1
  
  // Flags
  riskFlags: RiskFlag[];
  biasFlags: BiasFlag[];
  
  // Layer details (for transparency)
  layers: {
    dataSufficiency: DataSufficiencyResult;
    edgeValidation: EdgeValidationResult;
    contextSimilarity: ContextSimilarityResult;
    stability: StabilityResult;
    biasDetection: BiasDetectionResult;
  };
  
  // Human-readable reasoning (data-driven, no false hope)
  reasoning: string;
  
  // Metadata
  analyzedAt: string;
  tradesSampled: number;
}

// ============================================
// THRESHOLDS (STRICT)
// ============================================

export const PREFLIGHT_THRESHOLDS = {
  // Layer 1: Data Sufficiency
  MIN_TOTAL_TRADES: 20,
  MIN_TRADES_LAST_60_DAYS: 10,
  MAX_GAP_DAYS: 14,
  
  // Layer 2: Edge Validation
  STRONG_EDGE_R: 0.30,          // ≥ +0.30R
  WEAK_EDGE_R: 0.10,            // +0.10R to +0.30R
  NO_EDGE_R: -0.10,             // -0.10R to +0.10R
  // < -0.10R = Negative Edge
  
  // Layer 3: Context Similarity
  HIGH_SIMILARITY: 0.60,
  MIN_SIMILARITY: 0.40,
  
  // Layer 4: Stability
  MAX_STDDEV_R: 2.0,
  MAX_DRAWDOWN_MULTIPLIER: 2.0, // Max DD should be ≤ 2x AvgWin
  MAX_LOSING_STREAK_PENALTY: 5,
  PROFIT_CONCENTRATION_THRESHOLD: 0.50, // 50% from top 20%
  
  // Confidence
  MAX_CONFIDENCE: 80,           // NEVER 100%
  INSUFFICIENT_DATA_MAX_CONFIDENCE: 35,
} as const;
