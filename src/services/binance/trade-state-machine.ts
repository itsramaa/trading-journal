/**
 * Trade State Machine
 * 
 * Maps Binance order/position lifecycle states to the 6-state trade_state system:
 * opening → partially_filled → active → closed / canceled / liquidated
 * 
 * State Definitions:
 * - opening: Entry order placed but not yet filled
 * - partially_filled: Some entry fills received, position not fully open
 * - active: Position fully opened, awaiting exit
 * - closed: Position fully closed (exit qty >= entry qty)
 * - canceled: Orders canceled before any fill
 * - liquidated: Position closed via forced liquidation
 */

import type { PositionLifecycle, LifecycleState } from './types';
import type { BinanceOrder } from '@/features/binance/types';

// =============================================================================
// Trade State Types
// =============================================================================

export type TradeState = 
  | 'opening'
  | 'partially_filled'
  | 'active'
  | 'closed'
  | 'canceled'
  | 'liquidated';

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<TradeState, TradeState[]> = {
  opening:          ['partially_filled', 'active', 'canceled'],
  partially_filled: ['active', 'canceled'],
  active:           ['closed', 'liquidated'],
  closed:           [],       // Terminal state
  canceled:         [],       // Terminal state
  liquidated:       [],       // Terminal state
};

// =============================================================================
// State Resolution
// =============================================================================

/**
 * Determine trade_state from a PositionLifecycle
 */
export function resolveTradeState(lifecycle: PositionLifecycle): TradeState {
  const hasEntryFills = lifecycle.entryFills.length > 0;
  const hasExitFills = lifecycle.exitFills.length > 0;
  
  // Terminal: fully closed
  if (lifecycle.isComplete && hasEntryFills && hasExitFills) {
    if (isLiquidation(lifecycle)) {
      return 'liquidated';
    }
    return 'closed';
  }
  
  // Position has entry fills → it's active
  if (hasEntryFills) {
    return 'active';
  }
  
  // No fills at all → check orders
  return 'opening';
}

/**
 * Determine trade_state from Binance order status
 * Used for single-trade sync (non-lifecycle)
 */
export function resolveStateFromOrder(order: BinanceOrder): TradeState {
  switch (order.status) {
    case 'NEW':
      return 'opening';
    case 'PARTIALLY_FILLED':
      return 'partially_filled';
    case 'FILLED':
      return 'active'; // Filled entry = active position
    case 'CANCELED':
    case 'REJECTED':
    case 'EXPIRED':
      return 'canceled';
    default:
      return 'opening';
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
    return 'closed';
  }
  if (params.status === 'open') {
    return 'active';
  }
  return 'closed'; // Default for synced trades with P&L
}

// =============================================================================
// Lifecycle State Mapping
// =============================================================================

/**
 * Map LifecycleState (from grouper) to TradeState
 */
export function mapLifecycleToTradeState(lifecycleState: LifecycleState): TradeState {
  const mapping: Record<LifecycleState, TradeState> = {
    'PENDING': 'opening',
    'OPEN': 'active',
    'PARTIALLY_CLOSED': 'active', // Still active, just partially exited
    'CLOSED': 'closed',
  };
  return mapping[lifecycleState];
}

// =============================================================================
// Liquidation Detection
// =============================================================================

function isLiquidation(lifecycle: PositionLifecycle): boolean {
  for (const order of lifecycle.exitOrders) {
    const orderType = order.type?.toUpperCase() || '';
    if (orderType.includes('LIQUIDAT') || orderType === 'LIQUIDATION') {
      return true;
    }
  }
  
  for (const fill of lifecycle.exitFills) {
    if (fill.buyer && fill.maker === false) {
      if (fill.realizedPnl < 0) {
        const entryQty = lifecycle.entryFills.reduce((s, f) => s + f.qty, 0);
        const avgEntry = lifecycle.entryFills.reduce((s, f) => s + f.price * f.qty, 0) / entryQty;
        const lossPercent = Math.abs(fill.realizedPnl) / (avgEntry * fill.qty);
        
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

export function isValidTransition(from: TradeState, to: TradeState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalState(state: TradeState): boolean {
  return VALID_TRANSITIONS[state]?.length === 0;
}

export function getNextStates(state: TradeState): TradeState[] {
  return VALID_TRANSITIONS[state] || [];
}
