/**
 * Backtest Types - Per BACKTESTING_YOUTUBE_STRATEGY_GUIDE.md spec
 */

// Enhanced filter types for contextual backtesting
export interface BacktestEventFilter {
  excludeHighImpact: boolean;
  bufferHours: number;
}

export type BacktestSessionFilter = 'all' | 'asian' | 'london' | 'ny';
export type BacktestVolatilityFilter = 'all' | 'low' | 'medium' | 'high';

export interface BacktestConfig {
  strategyId: string;
  pair: string;
  periodStart: string; // ISO date string
  periodEnd: string;   // ISO date string
  initialCapital: number;
  commissionRate: number; // e.g., 0.0004 for 0.04%
  slippage?: number; // e.g., 0.001 for 0.1%
  riskPerTrade?: number;   // e.g., 0.02 for 2%
  compounding?: boolean;   // recalculate from running equity
  leverage?: number;       // default 1, max 125
  // Enhanced filters
  eventFilter?: BacktestEventFilter;
  sessionFilter?: BacktestSessionFilter;
  volatilityFilter?: BacktestVolatilityFilter;
}

export interface BacktestTrade {
  id: string;
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  direction: 'long' | 'short';
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  exitType: 'take_profit' | 'stop_loss' | 'trailing_stop' | 'time_based' | 'signal';
}

export interface BacktestMetrics {
  totalReturn: number;         // Total return percentage
  totalReturnAmount: number;   // Total return in currency
  winRate: number;             // Percentage of winning trades (0-1)
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;              // Average winning trade amount
  avgLoss: number;             // Average losing trade amount
  avgWinPercent: number;       // Average win percentage
  avgLossPercent: number;      // Average loss percentage
  profitFactor: number;        // Gross profit / Gross loss
  maxDrawdown: number;         // Maximum drawdown percentage
  maxDrawdownAmount: number;   // Maximum drawdown in currency
  sharpeRatio: number;         // Risk-adjusted return
  consecutiveWins: number;     // Maximum consecutive wins
  consecutiveLosses: number;   // Maximum consecutive losses
  avgRiskReward: number;       // Average risk-reward ratio
  holdingPeriodAvg: number;    // Average holding period in hours
  expectancy: number;          // (WR * avgWin) - (LR * avgLoss)
  expectancyPerR: number;      // WR * R - (1 - WR)
  calmarRatio: number;         // annualized return / max drawdown
  grossPnl: number;            // PnL before commissions
  totalCommissions: number;    // Total fees paid
  netPnl: number;              // PnL after commissions
  exposurePercent: number;     // % of time in market
}

export interface EquityCurvePoint {
  timestamp: string;
  balance: number;
  drawdown: number;
  tradeId?: string;
}

// Simulation assumptions metadata for transparency
export interface BacktestAssumptions {
  slippage?: number;
  slippageModel?: string;
  commissionModel?: string;
  executionModel?: string;
  liquidationRisk?: string;
  fundingRates?: string;
  marketImpact?: string;
  // NEW: Multi-Timeframe Analysis context
  multiTimeframe?: {
    higherTF: string | null;
    primaryTF: string | null;
    lowerTF: string | null;
  };
  methodology?: string;
  tradingStyle?: string;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  strategyName: string;
  pair: string;
  periodStart: string;
  periodEnd: string;
  initialCapital: number;
  finalCapital: number;
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: EquityCurvePoint[];
  createdAt: string;
  // Phase 1: Accuracy metadata
  assumptions?: BacktestAssumptions;
  accuracyNotes?: string;
  simulationVersion?: string;
  // NEW: Strategy metadata for context
  strategyMethodology?: string;
  strategyTradingStyle?: string;
  strategySessionPreference?: string[];
}

// ============================================
// YouTube Strategy Import V2 Types
// ============================================

// Trading methodology taxonomy
export type TradingMethodology = 
  | 'indicator_based'
  | 'price_action' 
  | 'smc'           // Smart Money Concepts
  | 'ict'           // Inner Circle Trader
  | 'wyckoff'
  | 'elliott_wave'
  | 'hybrid';

// SMC/ICT concept taxonomy
export type SMCConcept = 
  | 'order_block'
  | 'fair_value_gap'
  | 'break_of_structure'
  | 'change_of_character'
  | 'liquidity_sweep'
  | 'mitigation_block'
  | 'premium_discount'
  | 'equilibrium'
  | 'inducement'
  | 'killzone'
  | 'optimal_trade_entry'
  | 'market_structure_shift'
  | 'displacement';

// Structured entry rule (V2 - type-safe)
export interface StructuredEntryRule {
  id: string;
  type: 'smc' | 'ict' | 'indicator' | 'price_action' | 'liquidity' | 'structure' | 'time' | 'confluence';
  concept: string;       // e.g., "order_block", "rsi_divergence"
  condition: string;     // Observable & testable condition
  parameters?: Record<string, unknown>;
  sourceQuote?: string;  // Direct quote from transcript for evidence
  timeframe?: string;
  is_mandatory: boolean;
}

// Structured exit rule (V2)
export interface StructuredExitRule {
  id: string;
  type: 'take_profit' | 'stop_loss' | 'trailing_stop' | 'time_based' | 'fixed_target' | 'risk_reward' | 'structure' | 'indicator' | 'trailing';
  value?: number | null;
  unit?: 'percent' | 'atr' | 'rr' | 'pips' | null;
  description?: string;
  parameters?: Record<string, unknown>;
  sourceQuote?: string;  // Direct quote from transcript for evidence
  concept?: string;
}

// Import status enum
export type YouTubeImportStatus = 'success' | 'warning' | 'blocked' | 'failed';

// V2 Strategy data structure
export interface YouTubeStrategyDataV2 {
  strategyName: string;
  description: string;
  methodology: TradingMethodology;
  methodologyConfidence: number;
  
  conceptsUsed: string[];    // SMC: OB, FVG, BOS | ICT: Killzones, OTE
  indicatorsUsed: string[];  // RSI, MACD (empty for pure SMC)
  patternsUsed: string[];    // Double top, H&S, Wyckoff accumulation
  
  entryRules: StructuredEntryRule[];
  exitRules: StructuredExitRule[];
  
  riskManagement: {
    riskRewardRatio?: number | null;
    stopLossLogic?: string | null;
    positionSizing?: string | null;
  };
  
  timeframeContext: {
    primary: string;
    higherTF?: string | null;
    lowerTF?: string | null;
  };
  
  suitablePairs: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  riskLevel: 'low' | 'medium' | 'high';
  
  // NEW: Session preference for professional alignment
  sessionPreference?: string; // 'all' | 'asian' | 'london' | 'ny'
  
  // Scores
  confidence: number;      // 0-100 (final calculated)
  automationScore: number; // 0-100
  
  // Source
  sourceUrl: string;
  sourceTitle: string;
  transcriptLength?: number;
  
  // Extraction confidence breakdown (optional)
  extractionConfidence?: {
    entryClarity: number;
    exitClarity: number;
    riskClarity: number;
    reproducibility: number;
  };
}

// V2 Validation result
export interface StrategyValidationV2 {
  isActionable: boolean;
  hasEntry: boolean;
  hasExit: boolean;
  hasRiskManagement: boolean;
  warnings: string[];
  missingElements: string[];
  score: number;
}

// V2 Import result (full response from edge function)
export interface YouTubeStrategyImportV2 {
  status: YouTubeImportStatus;
  reason?: string;
  strategy?: YouTubeStrategyDataV2;
  validation?: StrategyValidationV2;
  debug?: YouTubeImportDebugInfo; // Debug info for transparency
}

// ============================================
// Legacy YouTube Strategy Import Types (V1)
// Keep for backwards compatibility
// ============================================

export interface YouTubeStrategyImport {
  strategyName: string;
  description: string;
  type: 'scalping' | 'day_trading' | 'swing' | 'position';
  timeframe: string;
  entryConditions: string[];
  exitConditions: {
    takeProfit: number;
    takeProfitUnit: 'percent' | 'atr' | 'rr';
    stopLoss: number;
    stopLossUnit: 'percent' | 'atr' | 'rr';
    trailingStop?: number;
  };
  indicatorsUsed: string[];
  positionSizing: string;
  suitablePairs: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number; // 0-100
  automationScore: number; // 0-100
  sourceUrl: string;
  sourceTitle: string;
}

export interface StrategyValidation {
  isValid: boolean;
  missingElements: string[];
  score: number; // 0-100
  warnings: string[];
}

export interface YouTubeImportProgress {
  stage: 'idle' | 'fetching' | 'transcribing' | 'detecting' | 'extracting' | 'validating' | 'complete' | 'error' | 'blocked' | 'warning';
  progress: number; // 0-100
  message: string;
  details?: string;
}

// ============================================
// YouTube Import Debug Types (Transparency)
// ============================================

export interface YouTubeImportDebugStep {
  step: string;
  status: 'success' | 'warning' | 'failed' | 'skipped';
  details: string;
  timestamp?: string;
}

export interface YouTubeImportDebugInfo {
  transcriptSource: 'gemini' | 'youtube_captions' | 'manual' | 'unknown';
  transcriptLength: number;
  transcriptPreview: string; // First 500 chars
  methodologyRaw?: {
    methodology: string;
    confidence: number;
    evidence: string[];
    reasoning?: string;
    secondaryElements?: string[];
    terminologyScore?: {
      indicator_based: number;
      price_action: number;
      smc: number;
      ict: number;
      wyckoff: number;
      elliott_wave: number;
    };
  };
  extractionQuality?: {
    overall: number;
    entryClarity: number;
    exitClarity: number;
    riskClarity: number;
    reproducibility?: number;
  };
  informationGaps?: string[];
  ambiguities?: string[];
  processingSteps: YouTubeImportDebugStep[];
}

// Default backtest config
export const DEFAULT_BACKTEST_CONFIG: Partial<BacktestConfig> = {
  initialCapital: 10000,
  commissionRate: 0.0004, // 0.04%
  slippage: 0.001, // 0.1%
};

// Helper to calculate metrics
export function calculateMetrics(
  trades: BacktestTrade[], 
  initialCapital: number,
  periodStart?: string,
  periodEnd?: string
): BacktestMetrics {
  if (trades.length === 0) {
    return {
      totalReturn: 0,
      totalReturnAmount: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownAmount: 0,
      sharpeRatio: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      avgRiskReward: 0,
      holdingPeriodAvg: 0,
      expectancy: 0,
      expectancyPerR: 0,
      calmarRatio: 0,
      grossPnl: 0,
      totalCommissions: 0,
      netPnl: 0,
      exposurePercent: 0,
    };
  }

  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const totalCommissions = trades.reduce((sum, t) => sum + t.commission, 0);
  const grossPnl = totalPnl + totalCommissions;

  // Market exposure calculation
  let exposurePercent = 0;
  if (periodStart && periodEnd && trades.length > 0) {
    const totalPeriodMs = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
    const totalInMarketMs = trades.reduce((sum, t) => {
      return sum + (new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime());
    }, 0);
    exposurePercent = totalPeriodMs > 0 ? (totalInMarketMs / totalPeriodMs) * 100 : 0;
  }
  
  // Calculate consecutive wins/losses
  let maxConsecWins = 0, maxConsecLosses = 0;
  let currentConsec = 0;
  let lastWin: boolean | null = null;
  
  for (const trade of trades) {
    const isWin = trade.pnl > 0;
    if (lastWin === null || lastWin === isWin) {
      currentConsec++;
    } else {
      currentConsec = 1;
    }
    
    if (isWin) {
      maxConsecWins = Math.max(maxConsecWins, currentConsec);
    } else {
      maxConsecLosses = Math.max(maxConsecLosses, currentConsec);
    }
    lastWin = isWin;
  }

  // Calculate max drawdown
  let peak = initialCapital;
  let maxDD = 0;
  let balance = initialCapital;
  
  for (const trade of trades) {
    balance += trade.pnl;
    peak = Math.max(peak, balance);
    const dd = (peak - balance) / peak;
    maxDD = Math.max(maxDD, dd);
  }

  // Calculate holding period
  const holdingPeriods = trades.map(t => {
    const entry = new Date(t.entryTime).getTime();
    const exit = new Date(t.exitTime).getTime();
    return (exit - entry) / (1000 * 60 * 60); // hours
  });
  const avgHolding = holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length;

  // Calculate Sharpe Ratio (simplified: using daily returns approximation)
  const returns = trades.map(t => t.pnlPercent / 100);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const avgRiskReward = losingTrades.length > 0 && winningTrades.length > 0
    ? avgWin / avgLoss : 0;

  const finalCapital = initialCapital + totalPnl;
  const totalReturn = (totalPnl / initialCapital) * 100;

  // Calmar Ratio: use annualized return (CAGR) / max drawdown
  let calmarRatio = 0;
  if (maxDD > 0 && periodStart && periodEnd) {
    const periodDays = (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24);
    const periodYears = periodDays / 365;
    const cagr = periodYears > 0 && initialCapital > 0
      ? (Math.pow(finalCapital / initialCapital, 1 / periodYears) - 1) * 100
      : totalReturn;
    calmarRatio = cagr / (maxDD * 100);
  } else if (maxDD > 0) {
    // Fallback if no period info: use raw return
    calmarRatio = totalReturn / (maxDD * 100);
  }

  return {
    totalReturn,
    totalReturnAmount: totalPnl,
    winRate,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin,
    avgLoss,
    avgWinPercent: winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length 
      : 0,
    avgLossPercent: losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / losingTrades.length)
      : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown: maxDD * 100,
    maxDrawdownAmount: maxDD * peak,
    sharpeRatio: sharpe,
    consecutiveWins: maxConsecWins,
    consecutiveLosses: maxConsecLosses,
    avgRiskReward,
    holdingPeriodAvg: avgHolding,
    expectancy: winRate * avgWin - ((1 - winRate) * Math.abs(avgLoss)),
    expectancyPerR: avgRiskReward > 0 ? (winRate * avgRiskReward) - (1 - winRate) : 0,
    calmarRatio,
    grossPnl,
    totalCommissions,
    netPnl: totalPnl,
    exposurePercent,
  };
}
