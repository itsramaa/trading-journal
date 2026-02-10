/**
 * Trade State Machine
 * 
 * Maps Binance order/position lifecycle states to the 6-state trade_state system:
 * OPENING → PARTIALLY_FILLED → ACTIVE → CLOSED / CANCELED / LIQUIDATED
 * 
 * State Definitions:
 * - OPENING: Entry order placed but not yet filled
 * - PARTIALLY_FILLED: Some entry fills received, position not fully open
 * - ACTIVE: Position fully opened, awaiting exit
 * - CLOSED: Position fully closed (exit qty >= entry qty)
 * - CANCELED: Orders canceled before any fill
 * - LIQUIDATED: Position closed via forced liquidation
 */

import type { PositionLifecycle, LifecycleState } from './types';
import type { BinanceOrder } from '@/features/binance/types';

// =============================================================================
// Trade State Types
// =============================================================================

export type TradeState = 
  | 'OPENING'
  | 'PARTIALLY_FILLED'
  | 'ACTIVE'
  | 'CLOSED'
  | 'CANCELED'
  | 'LIQUIDATED';

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<TradeState, TradeState[]> = {
  OPENING:          ['PARTIALLY_FILLED', 'ACTIVE', 'CANCELED'],
  PARTIALLY_FILLED: ['ACTIVE', 'CANCELED'],
  ACTIVE:           ['CLOSED', 'LIQUIDATED'],
  CLOSED:           [],       // Terminal state
  CANCELED:         [],       // Terminal state
  LIQUIDATED:       [],       // Terminal state
};

// =============================================================================
// State Resolution
// =============================================================================

/**
 * Determine trade_state from a PositionLifecycle
 * 
 * Logic:
 * 1. If isComplete → CLOSED (or LIQUIDATED if exit was forced)
 * 2. If has exit fills but not complete → ACTIVE (partially closing)
 * 3. If has entry fills only → ACTIVE (position open)
 * 4. If no fills at all → OPENING or CANCELED
 */
export function resolveTradeState(lifecycle: PositionLifecycle): TradeState {
  const hasEntryFills = lifecycle.entryFills.length > 0;
  const hasExitFills = lifecycle.exitFills.length > 0;
  
  // Terminal: fully closed
  if (lifecycle.isComplete && hasEntryFills && hasExitFills) {
    // Check for liquidation
    if (isLiquidation(lifecycle)) {
      return 'LIQUIDATED';
    }
    return 'CLOSED';
  }
  
  // Position has entry fills → it's active
  if (hasEntryFills) {
    return 'ACTIVE';
  }
  
  // No fills at all → check orders
  return 'OPENING';
}

/**
 * Determine trade_state from Binance order status
 * Used for single-trade sync (non-lifecycle)
 */
export function resolveStateFromOrder(order: BinanceOrder): TradeState {
  switch (order.status) {
    case 'NEW':
      return 'OPENING';
    case 'PARTIALLY_FILLED':
      return 'PARTIALLY_FILLED';
    case 'FILLED':
      return 'ACTIVE'; // Filled entry = active position
    case 'CANCELED':
    case 'REJECTED':
    case 'EXPIRED':
      return 'CANCELED';
    default:
      return 'OPENING';
  }
}

/**
 * Determine trade_state from a simple Binance trade (single fill context)
 * Used in useSyncTradeToJournal for individual trade imports
 */
export function resolveStateFromTrade(params: {
  status: string;
  hasExitPrice: boolean;
  realizedPnl: number;
}): TradeState {
  if (params.status === 'closed' && params.hasExitPrice) {
    return 'CLOSED';
  }
  if (params.status === 'open') {
    return 'ACTIVE';
  }
  return 'CLOSED'; // Default for synced trades with P&L
}

// =============================================================================
// Lifecycle State Mapping
// =============================================================================

/**
 * Map LifecycleState (from grouper) to TradeState
 */
export function mapLifecycleToTradeState(lifecycleState: LifecycleState): TradeState {
  const mapping: Record<LifecycleState, TradeState> = {
    'PENDING': 'OPENING',
    'OPEN': 'ACTIVE',
    'PARTIALLY_CLOSED': 'ACTIVE', // Still active, just partially exited
    'CLOSED': 'CLOSED',
  };
  return mapping[lifecycleState];
}

// =============================================================================
// Liquidation Detection
// =============================================================================

/**
 * Detect if a lifecycle was closed via liquidation
 * 
 * Heuristics:
 * 1. Exit order type is LIQUIDATION
 * 2. Exit order type contains 'LIQUIDAT'
 * 3. All exit fills have realizedPnl that's very negative relative to position size
 */
function isLiquidation(lifecycle: PositionLifecycle): boolean {
  // Check exit orders for liquidation type
  for (const order of lifecycle.exitOrders) {
    const orderType = order.type?.toUpperCase() || '';
    if (orderType.includes('LIQUIDAT') || orderType === 'LIQUIDATION') {
      return true;
    }
  }
  
  // Check if any exit fill has buyer/seller as liquidator 
  // (Binance marks forced liquidation trades)
  for (const fill of lifecycle.exitFills) {
    if (fill.buyer && fill.maker === false) {
      // Forced liquidation fills are typically taker fills
      // combined with extreme loss - check realizedPnl
      if (fill.realizedPnl < 0) {
        const entryQty = lifecycle.entryFills.reduce((s, f) => s + f.qty, 0);
        const avgEntry = lifecycle.entryFills.reduce((s, f) => s + f.price * f.qty, 0) / entryQty;
        const lossPercent = Math.abs(fill.realizedPnl) / (avgEntry * fill.qty);
        
        // Loss exceeding 90% of position value suggests liquidation
        if (lossPercent > 0.9) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// =============================================================================
// State Validation
// =============================================================================

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: TradeState, to: TradeState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a state is terminal (no further transitions allowed)
 */
export function isTerminalState(state: TradeState): boolean {
  return VALID_TRANSITIONS[state]?.length === 0;
}

/**
 * Get all valid next states from current state
 */
export function getNextStates(state: TradeState): TradeState[] {
  return VALID_TRANSITIONS[state] || [];
}
