/**
 * useExchangeBalance - Exchange-agnostic balance hook
 * Wraps exchange-specific hooks and returns generic ExchangeAccountSummary
 * 
 * Currently supports:
 * - Binance Futures (active)
 * 
 * Coming Soon:
 * - Bybit Futures
 * - OKX Futures
 */

import { useBinanceBalance } from '@/features/binance/useBinanceFutures';
import { mapBinanceAccountSummary } from '@/lib/exchange-mappers';
import type { ExchangeAccountSummary, ExchangeType } from '@/types/exchange';

export interface UseExchangeBalanceOptions {
  /** Exchange to fetch balance from (default: 'binance') */
  exchange?: ExchangeType;
  /** Enable/disable the query */
  enabled?: boolean;
}

export interface UseExchangeBalanceResult {
  /** Account summary with balances */
  balance: ExchangeAccountSummary | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object if any */
  error: Error | null;
  /** Refetch balance */
  refetch: () => void;
  /** Is currently fetching */
  isFetching: boolean;
}

/**
 * Generic hook for fetching account balance across exchanges
 * 
 * @example
 * // Fetch Binance balance
 * const { balance, isLoading } = useExchangeBalance();
 * 
 * @example
 * // Access specific values
 * const { balance } = useExchangeBalance();
 * console.log(balance?.totalBalance, balance?.availableBalance);
 * 
 * @example
 * // Future: Fetch from different exchange
 * const { balance } = useExchangeBalance({ exchange: 'bybit' });
 */
export function useExchangeBalance(
  options: UseExchangeBalanceOptions = {}
): UseExchangeBalanceResult {
  const { exchange = 'binance', enabled = true } = options;
  
  // Currently only Binance is supported
  const binanceQuery = useBinanceBalance();
  
  // Map Binance account summary to generic ExchangeAccountSummary
  const balance: ExchangeAccountSummary | null = binanceQuery.data 
    ? mapBinanceAccountSummary(binanceQuery.data)
    : null;
  
  // For future exchanges:
  // switch (exchange) {
  //   case 'binance':
  //     return useBinanceBalance mapped
  //   case 'bybit':
  //     return useBybitBalance mapped
  //   case 'okx':
  //     return useOkxBalance mapped
  // }
  
  return {
    balance,
    isLoading: binanceQuery.isLoading,
    isError: binanceQuery.isError,
    error: binanceQuery.error as Error | null,
    refetch: binanceQuery.refetch,
    isFetching: binanceQuery.isFetching,
  };
}

/**
 * Get total wallet balance
 */
export function useTotalBalance(options?: UseExchangeBalanceOptions): number {
  const { balance } = useExchangeBalance(options);
  return balance?.totalBalance ?? 0;
}

/**
 * Get available balance for trading
 */
export function useAvailableBalance(options?: UseExchangeBalanceOptions): number {
  const { balance } = useExchangeBalance(options);
  return balance?.availableBalance ?? 0;
}

/**
 * Get total margin balance
 */
export function useMarginBalance(options?: UseExchangeBalanceOptions): number {
  const { balance } = useExchangeBalance(options);
  return balance?.totalMarginBalance ?? 0;
}
