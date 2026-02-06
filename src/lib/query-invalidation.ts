/**
 * Centralized Query Invalidation Helpers
 * 
 * These helpers ensure consistent invalidation across all related queries
 * when data changes. This prevents stale data in Dashboard, Analytics, and
 * other components that depend on trade/account data.
 * 
 * Usage:
 * - Call invalidateTradeQueries() after any trade mutation (create, update, delete, close)
 * - Call invalidateAccountQueries() after any account mutation
 * - Call invalidateBinanceQueries() after Binance sync operations
 */
import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate all trade-related queries
 * Used after any trade mutation (create, update, delete, close, sync)
 */
export function invalidateTradeQueries(queryClient: QueryClient) {
  // Primary trade data
  queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
  queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
  
  // Dashboard widgets (dependent on trade P&L calculations)
  queryClient.invalidateQueries({ queryKey: ["unified-portfolio"] });
  queryClient.invalidateQueries({ queryKey: ["unified-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["unified-weekly-pnl"] });
  
  // Analytics (recalculates from trades)
  queryClient.invalidateQueries({ queryKey: ["contextual-analytics"] });
  queryClient.invalidateQueries({ queryKey: ["symbol-breakdown"] });
  
  // Binance P&L (recalculates with new trades)
  queryClient.invalidateQueries({ queryKey: ["binance-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["binance-weekly-pnl"] });
}

/**
 * Invalidate account-related queries
 * Used after any account mutation (create, update, delete, transaction)
 */
export function invalidateAccountQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["accounts"] });
  queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
  queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
  queryClient.invalidateQueries({ queryKey: ["unified-portfolio"] });
}

/**
 * Invalidate Binance-specific queries
 * Used after Binance sync operations or credential changes
 */
export function invalidateBinanceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["binance-connection-status"] });
  queryClient.invalidateQueries({ queryKey: ["binance-balance"] });
  queryClient.invalidateQueries({ queryKey: ["binance-positions"] });
  queryClient.invalidateQueries({ queryKey: ["binance-income"] });
  queryClient.invalidateQueries({ queryKey: ["binance-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["binance-weekly-pnl"] });
}

/**
 * Invalidate all queries after major sync operations
 * Combines trade, account, and binance invalidation
 */
export function invalidateAllSyncQueries(queryClient: QueryClient) {
  invalidateTradeQueries(queryClient);
  invalidateAccountQueries(queryClient);
  invalidateBinanceQueries(queryClient);
}
