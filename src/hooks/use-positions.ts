/**
 * usePositions - Exchange-agnostic position hook
 * Wraps exchange-specific hooks and returns generic ExchangePosition[]
 * 
 * Currently supports:
 * - Binance Futures (active)
 * 
 * Coming Soon:
 * - Bybit Futures
 * - OKX Futures
 */

import { useBinancePositions } from '@/features/binance/useBinanceFutures';
import { mapBinancePositions } from '@/lib/exchange-mappers';
import type { ExchangePosition, ExchangeType } from '@/types/exchange';

export interface UsePositionsOptions {
  /** Exchange to fetch positions from (default: 'binance') */
  exchange?: ExchangeType;
  /** Filter by specific symbol */
  symbol?: string;
  /** Enable/disable the query */
  enabled?: boolean;
}

export interface UsePositionsResult {
  /** Array of positions (already filtered to non-zero) */
  positions: ExchangePosition[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object if any */
  error: Error | null;
  /** Refetch positions */
  refetch: () => void;
  /** Is currently fetching (initial or refetch) */
  isFetching: boolean;
}

/**
 * Generic hook for fetching positions across exchanges
 * 
 * @example
 * // Fetch all Binance positions
 * const { positions, isLoading } = usePositions();
 * 
 * @example
 * // Fetch specific symbol
 * const { positions } = usePositions({ symbol: 'BTCUSDT' });
 * 
 * @example
 * // Future: Fetch from different exchange
 * const { positions } = usePositions({ exchange: 'bybit' });
 */
export function usePositions(options: UsePositionsOptions = {}): UsePositionsResult {
  const { exchange = 'binance', symbol, enabled = true } = options;
  
  // Currently only Binance is supported
  // When adding new exchanges:
  // 1. Add useBybitPositions, useOkxPositions hooks
  // 2. Add switch case based on exchange param
  // 3. Map using respective mappers
  
  const binanceQuery = useBinancePositions(symbol);
  
  // Map Binance positions to generic ExchangePosition[]
  // mapBinancePositions already filters out zero positions
  const positions: ExchangePosition[] = binanceQuery.data 
    ? mapBinancePositions(binanceQuery.data)
    : [];
  
  // For future exchanges, the pattern would be:
  // switch (exchange) {
  //   case 'binance':
  //     return useBinancePositions mapped
  //   case 'bybit':
  //     return useBybitPositions mapped
  //   case 'okx':
  //     return useOkxPositions mapped
  // }
  
  return {
    positions,
    isLoading: binanceQuery.isLoading,
    isError: binanceQuery.isError,
    error: binanceQuery.error as Error | null,
    refetch: binanceQuery.refetch,
    isFetching: binanceQuery.isFetching,
  };
}

/**
 * Get total unrealized PnL across all positions
 */
export function useTotalUnrealizedPnl(options?: UsePositionsOptions): number {
  const { positions } = usePositions(options);
  return positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
}

/**
 * Get total notional value across all positions
 */
export function useTotalNotional(options?: UsePositionsOptions): number {
  const { positions } = usePositions(options);
  return positions.reduce((sum, p) => sum + Math.abs(p.notional), 0);
}

/**
 * Get position count
 */
export function usePositionCount(options?: UsePositionsOptions): number {
  const { positions } = usePositions(options);
  return positions.length;
}
