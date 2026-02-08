/**
 * Binance Aggregation Layer - Type Definitions
 * 
 * Types for position lifecycle grouping, trade aggregation, and validation.
 * These types bridge raw Binance API data to local DB trade entries.
 */

import type { BinanceTrade, BinanceOrder, BinanceIncome } from '@/features/binance/types';

// =============================================================================
// Position Lifecycle Types
// =============================================================================

/**
 * Represents a complete position lifecycle from open to close.
 * A position lifecycle groups all related fills, orders, and income records.
 */
export interface PositionLifecycle {
  /** Trading symbol (e.g., BTCUSDT) */
  symbol: string;
  
  /** Position direction: LONG or SHORT */
  direction: 'LONG' | 'SHORT';
  
  /** Position side from Binance (LONG, SHORT, or BOTH for one-way mode) */
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  
  /** All entry fills (BUY for LONG, SELL for SHORT) */
  entryFills: BinanceTrade[];
  
  /** All exit fills (SELL for LONG, BUY for SHORT) */
  exitFills: BinanceTrade[];
  
  /** Entry orders (optional - for order type info) */
  entryOrders: BinanceOrder[];
  
  /** Exit orders (optional - for SL/TP detection) */
  exitOrders: BinanceOrder[];
  
  /** Related income records (PnL, commission, funding) */
  incomeRecords: BinanceIncome[];
  
  /** Timestamp of first entry fill */
  entryTime: number;
  
  /** Timestamp of last exit fill */
  exitTime: number;
  
  /** Whether position is fully closed (entry qty = exit qty) */
  isComplete: boolean;
  
  /** Lifecycle unique identifier for deduplication */
  lifecycleId: string;
}

/**
 * Lifecycle state for tracking position changes
 */
export type LifecycleState = 
  | 'PENDING'           // Orders placed, not filled
  | 'OPEN'              // Position active
  | 'PARTIALLY_CLOSED'  // Some quantity closed
  | 'CLOSED';           // Fully closed

// =============================================================================
// Aggregated Trade Types
// =============================================================================

/**
 * Fully aggregated trade ready for local DB insertion.
 * All fields have clear source (API or calculated).
 */
export interface AggregatedTrade {
  // Identifiers
  binance_trade_id: string;      // Composite: {symbol}_{entryTime}_{exitTime}
  binance_order_id: number;      // Primary entry order ID
  
  // Core trade data
  pair: string;
  direction: 'LONG' | 'SHORT';
  
  // Prices (weighted averages)
  entry_price: number;           // Σ(price × qty) / Σ(qty) for entry fills
  exit_price: number;            // Σ(price × qty) / Σ(qty) for exit fills
  quantity: number;              // Σ(qty) of entry fills
  
  // P&L from Binance (not calculated)
  realized_pnl: number;          // From REALIZED_PNL income
  
  // Fees (all from income API)
  commission: number;            // From COMMISSION income (absolute value)
  commission_asset: string;      // Usually USDT
  funding_fees: number;          // From FUNDING_FEE income (between entry/exit)
  fees: number;                  // commission + |funding_fees|
  pnl: number;                   // realized_pnl - fees (net P&L)
  
  // Timestamps
  entry_datetime: Date;
  exit_datetime: Date;
  trade_date: Date;              // Date portion of entry_datetime
  hold_time_minutes: number;     // Duration in minutes
  
  // Trade metadata
  leverage: number | null;       // From position or account config
  margin_type: 'CROSSED' | 'ISOLATED' | null;
  is_maker: boolean | null;      // True if any entry fill is maker
  entry_order_type: string | null;  // LIMIT, MARKET, etc.
  exit_order_type: string | null;   // LIMIT, MARKET, STOP, etc.
  
  // Result derived from P&L
  result: 'win' | 'loss' | 'breakeven';
  status: 'closed';
  source: 'binance';
  
  // Validation metadata
  _validation: ValidationResult;
  _rawLifecycle?: PositionLifecycle;  // For debugging
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation result for an aggregated trade
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  
  // Cross-validation metrics
  crossValidation: {
    calculatedPnl: number;    // (exit - entry) × qty × direction
    reportedPnl: number;      // From income API
    pnlDifference: number;    // Absolute difference
    pnlDifferencePercent: number;  // Percentage difference
  };
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

// =============================================================================
// Aggregation Progress & Results
// =============================================================================

/**
 * Progress callback for long-running aggregation
 */
export interface AggregationProgress {
  phase: 'fetching-trades' | 'fetching-income' | 'grouping' | 'aggregating' | 'validating' | 'inserting';
  current: number;
  total: number;
  message: string;
}

/**
 * Result of full aggregation process
 */
export interface AggregationResult {
  success: boolean;
  
  // Successfully aggregated trades
  trades: AggregatedTrade[];
  
  // Statistics
  stats: {
    totalLifecycles: number;
    completeLifecycles: number;
    incompleteLifecycles: number;
    validTrades: number;
    invalidTrades: number;
    warningTrades: number;
  };
  
  // Failed lifecycles (for debugging)
  failures: Array<{
    lifecycleId: string;
    reason: string;
    lifecycle?: PositionLifecycle;
  }>;
  
  // Reconciliation data
  reconciliation: {
    binanceTotalPnl: number;      // Total raw income from Binance
    aggregatedTotalPnl: number;   // Sum from completed lifecycles
    matchedIncomePnl: number;     // Income matched to lifecycles
    unmatchedIncomePnl: number;   // Income from open/incomplete positions
    difference: number;           // |aggregatedTotalPnl - matchedIncomePnl|
    differencePercent: number;    // Difference as percentage
    isReconciled: boolean;        // Within 0.1% tolerance
    incompletePositionsNote: string;  // Explanation of unmatched income
  };
  
  // NEW: Partial success tracking
  partialSuccess?: {
    insertedCount: number;
    failedBatches: Array<{ batch: number; error: string }>;
    failedSymbols: Array<{ symbol: string; error: string }>;
    skippedDueToError: number;
  };
  
  // Sync quality metadata (internal use)
  _syncMeta?: {
    syncQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    matchRate: number;
  };
}

// =============================================================================
// Checkpoint Types (for resumable sync)
// =============================================================================

/**
 * Checkpoint state for resumable sync
 */
export interface SyncCheckpoint {
  /** Current sync phase */
  currentPhase: 'idle' | 'fetching-income' | 'fetching-trades' | 'grouping' | 'aggregating' | 'inserting';
  
  /** Fetched income data (checkpointed after income phase) */
  incomeData: BinanceIncome[] | null;
  
  /** Trades fetched per symbol */
  tradesBySymbol: Record<string, BinanceTrade[]>;
  
  /** Orders fetched per symbol */
  ordersBySymbol: Record<string, BinanceOrder[]>;
  
  /** Symbols that have been successfully processed */
  processedSymbols: string[];
  
  /** Symbols that failed with their error messages */
  failedSymbols: Array<{ symbol: string; error: string }>;
  
  /** All symbols to process */
  allSymbols: string[];
  
  /** Sync start time (ms) */
  syncStartTime: number;
  
  /** Sync range in days or 'max' */
  syncRangeDays: number | 'max';
  
  /** Last checkpoint timestamp (ms) */
  lastCheckpointTime: number;
  
  /** Timestamp range for this sync */
  timeRange: {
    startTime: number;
    endTime: number;
  };
}

// =============================================================================
// Raw Data Collection Types
// =============================================================================

/**
 * Raw data collected from Binance APIs before aggregation
 */
export interface RawBinanceData {
  trades: BinanceTrade[];
  orders: BinanceOrder[];
  income: BinanceIncome[];
  
  // Metadata
  fetchedAt: Date;
  periodStart: number;
  periodEnd: number;
  symbols: string[];
}

/**
 * Income records grouped by type for easier processing
 */
export interface GroupedIncome {
  realizedPnl: BinanceIncome[];
  commission: BinanceIncome[];
  fundingFee: BinanceIncome[];
  other: BinanceIncome[];
}
