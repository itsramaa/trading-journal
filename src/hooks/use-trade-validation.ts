/**
 * useTradeValidation - Hook for validating trade data completeness
 * 
 * Checks if trades from Binance have been properly enriched with:
 * - Entry price
 * - Exit price  
 * - Quantity
 * - Correct direction (not UNKNOWN)
 */

import type { TradeEntry } from "@/hooks/use-trade-entries";

export interface TradeValidationResult {
  isComplete: boolean;
  needsEnrichment: boolean;
  issues: string[];
  canDisplay: boolean;
}

export interface TradeValidationSummary {
  total: number;
  complete: number;
  needsEnrichment: number;
  incompletePercent: number;
}

/**
 * Validate a single trade entry for data completeness
 */
export function validateTrade(trade: TradeEntry): TradeValidationResult {
  const issues: string[] = [];
  
  // Only validate Binance-sourced trades
  if (trade.source !== 'binance') {
    return {
      isComplete: true,
      needsEnrichment: false,
      issues: [],
      canDisplay: true,
    };
  }
  
  // Check for missing or zero values
  if (!trade.entry_price || trade.entry_price === 0) {
    issues.push('Missing entry price');
  }
  
  if (!trade.exit_price || trade.exit_price === 0) {
    issues.push('Missing exit price');
  }
  
  if (!trade.quantity || trade.quantity === 0) {
    issues.push('Missing quantity');
  }
  
  if (trade.direction === 'UNKNOWN') {
    issues.push('Unknown direction');
  }
  
  const needsEnrichment = issues.length > 0;
  
  return {
    isComplete: !needsEnrichment,
    needsEnrichment,
    issues,
    // Trade can still be displayed if it has P&L data
    canDisplay: trade.realized_pnl !== undefined && trade.realized_pnl !== null,
  };
}

/**
 * Validate multiple trades and return summary
 */
export function validateTrades(trades: TradeEntry[]): TradeValidationSummary {
  const binanceTrades = trades.filter(t => t.source === 'binance');
  
  let complete = 0;
  let needsEnrichment = 0;
  
  for (const trade of binanceTrades) {
    const result = validateTrade(trade);
    if (result.isComplete) {
      complete++;
    } else {
      needsEnrichment++;
    }
  }
  
  return {
    total: binanceTrades.length,
    complete,
    needsEnrichment,
    incompletePercent: binanceTrades.length > 0 
      ? (needsEnrichment / binanceTrades.length) * 100 
      : 0,
  };
}

/**
 * Hook for trade validation utilities
 */
export function useTradeValidation() {
  return {
    validateTrade,
    validateTrades,
  };
}
