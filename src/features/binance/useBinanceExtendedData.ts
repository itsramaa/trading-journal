/**
 * Binance Extended Account Data Hooks
 * Phase 4: Extended Account Data
 * 
 * Provides hooks for extended account-specific data:
 * - Symbol configuration (margin type, leverage per symbol)
 * - Multi-assets mode status
 * - Position margin change history
 * - Account configuration
 * - BNB burn status for fee discount
 * - ADL quantile for position risk
 * - Order rate limit status
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  SymbolAccountConfig,
  MultiAssetsMode,
  MarginChangeHistory,
  MarginHistoryParams,
  AccountConfig,
  BnbBurnStatus,
  AdlQuantile,
  OrderRateLimit,
  BinanceApiResponse,
} from "./types";

/**
 * Call binance-futures edge function with specified action
 */
async function callBinanceFutures<T>(
  action: string,
  params?: Record<string, unknown>
): Promise<BinanceApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke("binance-futures", {
    body: { action, ...params },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as BinanceApiResponse<T>;
}

// ============================================================================
// Symbol Configuration Hook
// ============================================================================

/**
 * Get user symbol configuration (margin type, leverage)
 * 
 * @param symbol - Optional trading pair symbol. If omitted, returns all symbols.
 * @returns Symbol configuration with margin type and leverage
 * 
 * @example
 * const { data: config } = useBinanceSymbolConfig("BTCUSDT");
 * console.log(`Margin: ${config.marginType}, Leverage: ${config.leverage}x`);
 */
export function useBinanceSymbolConfig(symbol?: string) {
  return useQuery({
    queryKey: ["binance", "symbol-config", symbol || "all"],
    queryFn: async () => {
      const response = await callBinanceFutures<SymbolAccountConfig | SymbolAccountConfig[]>(
        "symbol-config",
        symbol ? { symbol } : {}
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch symbol config");
      }
      return response.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// Multi-Assets Mode Hook
// ============================================================================

/**
 * Get multi-assets margin mode status
 * Affects how collateral is calculated across assets
 * 
 * @returns Multi-assets mode status
 * 
 * @example
 * const { data: mode } = useBinanceMultiAssetsMode();
 * if (mode?.multiAssetsMargin) {
 *   // Show multi-asset collateral info
 * }
 */
export function useBinanceMultiAssetsMode() {
  return useQuery({
    queryKey: ["binance", "multi-assets-mode"],
    queryFn: async () => {
      const response = await callBinanceFutures<MultiAssetsMode>("multi-assets-mode");
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch multi-assets mode");
      }
      return response.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user config
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// Position Margin History Hook
// ============================================================================

/**
 * Get position margin change history
 * Track margin additions and reductions for risk audit
 * 
 * @param symbol - Trading pair symbol
 * @param params - Optional filter parameters
 * @returns Array of margin change events
 * 
 * @example
 * const { data: history } = useBinanceMarginHistory("BTCUSDT", { limit: 50 });
 * // Display in Risk Event Log
 */
export function useBinanceMarginHistory(symbol: string, params?: MarginHistoryParams) {
  return useQuery({
    queryKey: ["binance", "position-margin-history", symbol, params || {}],
    queryFn: async () => {
      const response = await callBinanceFutures<MarginChangeHistory[]>(
        "position-margin-history",
        {
          symbol,
          params: params || {},
        }
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch margin history");
      }
      return response.data || [];
    },
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Account Configuration Hook
// ============================================================================

/**
 * Get account configuration (fee tier, trading permissions, modes)
 * 
 * @returns Account configuration
 * 
 * @example
 * const { data: config } = useBinanceAccountConfig();
 * console.log(`Fee Tier: ${config.feeTier}, Hedge Mode: ${config.dualSidePosition}`);
 */
export function useBinanceAccountConfig() {
  return useQuery({
    queryKey: ["binance", "account-config"],
    queryFn: async () => {
      const response = await callBinanceFutures<AccountConfig>("account-config");
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch account config");
      }
      return response.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// BNB Burn Status Hook
// ============================================================================

/**
 * Get BNB burn status for fee discount
 * If enabled, fees are paid in BNB with discount
 * 
 * @returns BNB burn status
 * 
 * @example
 * const { data: bnbBurn } = useBinanceBnbBurn();
 * const feeDiscount = bnbBurn?.feeBurn ? 0.9 : 1.0; // 10% discount if enabled
 */
export function useBinanceBnbBurn() {
  return useQuery({
    queryKey: ["binance", "bnb-burn"],
    queryFn: async () => {
      const response = await callBinanceFutures<BnbBurnStatus>("bnb-burn");
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch BNB burn status");
      }
      return response.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// ADL Quantile Hook
// ============================================================================

/**
 * Get ADL (Auto-Deleveraging) quantile for positions
 * Higher quantile = higher risk of being auto-deleveraged
 * 
 * @param symbol - Optional trading pair symbol
 * @returns ADL quantile data
 * 
 * @example
 * const { data: adl } = useBinanceAdlQuantile("BTCUSDT");
 * if (adl?.adlQuantile.LONG >= 4) {
 *   // Show ADL warning
 * }
 */
export function useBinanceAdlQuantile(symbol?: string) {
  return useQuery({
    queryKey: ["binance", "adl-quantile", symbol || "all"],
    queryFn: async () => {
      const response = await callBinanceFutures<AdlQuantile | AdlQuantile[]>(
        "adl-quantile",
        symbol ? { symbol } : {}
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch ADL quantile");
      }
      return response.data!;
    },
    staleTime: 60 * 1000, // 1 minute - position-related
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Order Rate Limit Hook
// ============================================================================

/**
 * Get order rate limit status
 * Shows remaining order capacity to prevent rate limit errors
 * 
 * @returns Array of rate limit info
 * 
 * @example
 * const { data: limits } = useBinanceOrderRateLimit();
 * const orderLimit = limits?.find(l => l.rateLimitType === 'ORDERS');
 * const remaining = orderLimit ? orderLimit.limit - orderLimit.count : 0;
 */
export function useBinanceOrderRateLimit() {
  return useQuery({
    queryKey: ["binance", "order-rate-limit"],
    queryFn: async () => {
      const response = await callBinanceFutures<OrderRateLimit[]>("order-rate-limit");
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch order rate limit");
      }
      return response.data || [];
    },
    staleTime: 10 * 1000, // 10 seconds - frequently changing
    gcTime: 60 * 1000,
  });
}

// ============================================================================
// Combined Extended Account Data Hook
// ============================================================================

interface ExtendedAccountData {
  accountConfig: AccountConfig | null;
  multiAssetsMode: MultiAssetsMode | null;
  bnbBurnStatus: BnbBurnStatus | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Combined hook for extended account data
 * Fetches account config, multi-assets mode, and BNB burn status in parallel
 * 
 * @returns Combined extended account data
 * 
 * @example
 * const { accountConfig, multiAssetsMode, bnbBurnStatus } = useExtendedAccountData();
 * const isHedgeMode = accountConfig?.dualSidePosition;
 */
export function useExtendedAccountData(): ExtendedAccountData {
  const configQuery = useBinanceAccountConfig();
  const multiAssetsQuery = useBinanceMultiAssetsMode();
  const bnbBurnQuery = useBinanceBnbBurn();

  return {
    accountConfig: configQuery.data || null,
    multiAssetsMode: multiAssetsQuery.data || null,
    bnbBurnStatus: bnbBurnQuery.data || null,
    isLoading: configQuery.isLoading || multiAssetsQuery.isLoading || bnbBurnQuery.isLoading,
    error: configQuery.error || multiAssetsQuery.error || bnbBurnQuery.error || null,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get ADL risk level label
 */
export function getAdlRiskLevel(quantile: number): 'low' | 'medium' | 'high' | 'critical' {
  if (quantile <= 1) return 'low';
  if (quantile <= 2) return 'medium';
  if (quantile <= 3) return 'high';
  return 'critical';
}

/**
 * Calculate fee with BNB discount
 */
export function calculateFeeWithDiscount(
  baseFee: number,
  bnbBurnEnabled: boolean
): number {
  return bnbBurnEnabled ? baseFee * 0.9 : baseFee; // 10% discount with BNB
}

/**
 * Get rate limit usage percentage
 */
export function getRateLimitUsage(rateLimit: OrderRateLimit): number {
  if (!rateLimit.limit) return 0;
  return (rateLimit.count / rateLimit.limit) * 100;
}

/**
 * Check if rate limit is approaching
 */
export function isRateLimitWarning(rateLimit: OrderRateLimit, threshold = 80): boolean {
  return getRateLimitUsage(rateLimit) >= threshold;
}
