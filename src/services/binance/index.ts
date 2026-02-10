/**
 * Binance Aggregation Layer - Public API
 * 
 * This module provides the complete aggregation pipeline:
 * 1. Group raw Binance data into position lifecycles
 * 2. Aggregate lifecycles into trade entries
 * 3. Validate before insertion
 * 4. Insert to local DB
 */

// Types
export type {
  PositionLifecycle,
  AggregatedTrade,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  AggregationProgress,
  AggregationResult,
  RawBinanceData,
  GroupedIncome,
  SyncCheckpoint,
} from './types';

// Position Lifecycle Grouper
export { 
  groupIntoLifecycles,
  detectAndSplitPositionFlips,
} from './position-lifecycle-grouper';

// Trade Aggregator
export {
  aggregateLifecycle,
  aggregateAllLifecycles,
  calculateReconciliation,
} from './trade-aggregator';

// Validator
export {
  validateAggregatedTrade,
  validateAllTrades,
} from './aggregation-validator';

// Trade State Machine
export type { TradeState } from './trade-state-machine';
export {
  resolveTradeState,
  resolveStateFromOrder,
  resolveStateFromTrade,
  mapLifecycleToTradeState,
  isValidTransition,
  isTerminalState,
  getNextStates,
} from './trade-state-machine';
