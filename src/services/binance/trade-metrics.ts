/**
 * Trade Metrics Calculator
 * 
 * Auto-calculates R-multiple and MAE (Max Adverse Excursion) for trades.
 * 
 * R-Multiple: Measures profit/loss relative to initial risk.
 *   Formula: (exit_price - entry_price) / (entry_price - stop_loss) * direction_multiplier
 *   Requires: entry_price, exit_price, stop_loss
 * 
 * MAE: Tracks the maximum unrealized drawdown during a trade's lifetime.
 *   For Binance synced trades: approximated from exit fills worst price vs entry.
 *   For paper trades: can be updated in real-time if position tracking is active.
 */

import type { PositionLifecycle } from './types';

// =============================================================================
// R-Multiple Calculation
// =============================================================================

export interface RMultipleParams {
  entry_price: number;
  exit_price: number;
  stop_loss: number | null;
  direction: 'LONG' | 'SHORT';
}

/**
 * Calculate R-multiple for a closed trade.
 * Returns null if stop_loss is missing or risk is zero.
 * 
 * R = reward / risk
 * - LONG:  reward = exit - entry, risk = entry - stop_loss
 * - SHORT: reward = entry - exit, risk = stop_loss - entry
 */
export function calculateRMultiple(params: RMultipleParams): number | null {
  const { entry_price, exit_price, stop_loss, direction } = params;

  if (!stop_loss || stop_loss <= 0 || entry_price <= 0) return null;

  let risk: number;
  let reward: number;

  if (direction === 'LONG') {
    risk = entry_price - stop_loss;
    reward = exit_price - entry_price;
  } else {
    risk = stop_loss - entry_price;
    reward = entry_price - exit_price;
  }

  // Risk must be positive (stop_loss on correct side)
  if (risk <= 0) return null;

  return reward / risk;
}

// =============================================================================
// MAE Calculation
// =============================================================================

export interface MAEParams {
  entry_price: number;
  direction: 'LONG' | 'SHORT';
  /** All fill prices during the trade (entry + exit fills) */
  allFillPrices: number[];
}

/**
 * Calculate Max Adverse Excursion (MAE) from fill prices.
 * 
 * MAE represents the maximum unrealized loss during the trade.
 * Since we don't have tick-by-tick data, we approximate using:
 * - Worst fill price relative to entry for the given direction
 * 
 * Returns the MAE as a positive dollar amount per unit (price difference).
 * Returns null if insufficient data.
 */
export function calculateMAE(params: MAEParams): number | null {
  const { entry_price, direction, allFillPrices } = params;

  if (allFillPrices.length === 0 || entry_price <= 0) return null;

  let maxAdverse = 0;

  for (const price of allFillPrices) {
    let adverse: number;
    if (direction === 'LONG') {
      // For LONG, adverse = how far price dropped below entry
      adverse = entry_price - price;
    } else {
      // For SHORT, adverse = how far price rose above entry
      adverse = price - entry_price;
    }
    // Only count adverse (positive) movements
    if (adverse > maxAdverse) {
      maxAdverse = adverse;
    }
  }

  return maxAdverse > 0 ? maxAdverse : null;
}

/**
 * Calculate MAE from a PositionLifecycle.
 * Uses all exit fill prices to approximate worst drawdown.
 */
export function calculateMAEFromLifecycle(lifecycle: PositionLifecycle): number | null {
  const entryFillPrices = lifecycle.entryFills.map(f => f.price);
  const exitFillPrices = lifecycle.exitFills.map(f => f.price);
  
  // Weighted average entry price
  const totalQty = lifecycle.entryFills.reduce((s, f) => s + f.qty, 0);
  if (totalQty === 0) return null;
  const entryPrice = lifecycle.entryFills.reduce((s, f) => s + f.price * f.qty, 0) / totalQty;

  return calculateMAE({
    entry_price: entryPrice,
    direction: lifecycle.direction,
    allFillPrices: [...entryFillPrices, ...exitFillPrices],
  });
}
