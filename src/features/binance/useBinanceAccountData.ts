/**
 * Binance Account Data Hooks
 * Phase 2: Account Data Enhancement
 * 
 * Provides hooks for account-specific data:
 * - Commission rates for accurate P&L calculation
 * - Leverage brackets for position sizing limits
 * - Force orders (liquidation history) for risk management
 * - Position mode (hedge vs one-way)
 * - All orders history
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CommissionRate,
  LeverageBracket,
  ForceOrder,
  PositionMode,
  ForceOrderParams,
  AllOrdersParams,
  BinanceOrder,
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
// Commission Rate Hook
// ============================================================================

/**
 * Get user commission rate for accurate fee calculation
 * 
 * @param symbol - Trading pair symbol (e.g., "BTCUSDT")
 * @returns Commission rates for maker and taker orders
 * 
 * @example
 * const { data: rates } = useBinanceCommissionRate("BTCUSDT");
 * const fee = isMarketOrder ? rates.takerCommissionRate : rates.makerCommissionRate;
 */
export function useBinanceCommissionRate(symbol: string) {
  return useQuery({
    queryKey: ["binance", "commission-rate", symbol],
    queryFn: async () => {
      const response = await callBinanceFutures<CommissionRate>("commission-rate", { symbol });
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch commission rate");
      }
      return response.data!;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes - commission rates rarely change
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// Leverage Brackets Hook
// ============================================================================

/**
 * Get leverage brackets for position sizing limits
 * 
 * @param symbol - Optional trading pair symbol. If omitted, returns all symbols.
 * @returns Leverage brackets with notional limits per tier
 * 
 * @example
 * const { data: brackets } = useBinanceLeverageBrackets("BTCUSDT");
 * const maxLeverage = brackets?.brackets[0]?.initialLeverage;
 */
export function useBinanceLeverageBrackets(symbol?: string) {
  return useQuery({
    queryKey: ["binance", "leverage-brackets", symbol || "all"],
    queryFn: async () => {
      const response = await callBinanceFutures<LeverageBracket | LeverageBracket[]>(
        "leverage-brackets",
        symbol ? { symbol } : {}
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch leverage brackets");
      }
      return response.data!;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - leverage brackets are static
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// ============================================================================
// Force Orders (Liquidation History) Hook
// ============================================================================

/**
 * Get force orders (liquidation history) for risk management
 * CRITICAL for risk audit trail and AI learning
 * 
 * @param params - Optional filter parameters
 * @returns Array of liquidation/ADL orders
 * 
 * @example
 * const { data: liquidations } = useBinanceForceOrders({ limit: 100 });
 * // Display in Risk Event Log
 */
export function useBinanceForceOrders(params?: ForceOrderParams) {
  return useQuery({
    queryKey: ["binance", "force-orders", params || {}],
    queryFn: async () => {
      const response = await callBinanceFutures<ForceOrder[]>("force-orders", {
        params: params || {},
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch force orders");
      }
      return response.data || [];
    },
    staleTime: 60 * 1000, // 1 minute - historical but important to stay updated
    gcTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Position Mode Hook
// ============================================================================

/**
 * Get position mode (hedge vs one-way)
 * Essential for correct order placement
 * 
 * @returns Position mode configuration
 * 
 * @example
 * const { data: mode } = useBinancePositionMode();
 * const positionSide = mode?.dualSidePosition ? "LONG" : "BOTH";
 */
export function useBinancePositionMode() {
  return useQuery({
    queryKey: ["binance", "position-mode"],
    queryFn: async () => {
      const response = await callBinanceFutures<PositionMode>("position-mode");
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch position mode");
      }
      return response.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user config, doesn't change often
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// All Orders History Hook
// ============================================================================

/**
 * Get all orders history (not just executed trades)
 * Includes cancelled, rejected, and expired orders
 * 
 * @param symbol - Trading pair symbol
 * @param params - Optional filter parameters
 * @returns Array of all orders
 * 
 * @example
 * const { data: orders } = useBinanceAllOrders("BTCUSDT", { limit: 100 });
 */
export function useBinanceAllOrders(symbol: string, params?: AllOrdersParams) {
  return useQuery({
    queryKey: ["binance", "all-orders", symbol, params || {}],
    queryFn: async () => {
      const response = await callBinanceFutures<BinanceOrder[]>("all-orders", {
        symbol,
        params: params || {},
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch all orders");
      }
      return response.data || [];
    },
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 minute - active data
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Combined Position Sizing Data Hook
// ============================================================================

interface PositionSizingData {
  commissionRate: CommissionRate | null;
  leverageBrackets: LeverageBracket | null;
  positionMode: PositionMode | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Combined hook for Position Size Calculator
 * Fetches commission rates, leverage brackets, and position mode in parallel
 * 
 * @param symbol - Trading pair symbol
 * @returns Combined data for position sizing calculations
 * 
 * @example
 * const { commissionRate, leverageBrackets, positionMode, isLoading } = usePositionSizingData("BTCUSDT");
 * const takerFee = commissionRate?.takerCommissionRate || 0.0004;
 */
export function usePositionSizingData(symbol: string): PositionSizingData {
  const commissionQuery = useBinanceCommissionRate(symbol);
  const bracketsQuery = useBinanceLeverageBrackets(symbol);
  const modeQuery = useBinancePositionMode();

  return {
    commissionRate: commissionQuery.data || null,
    leverageBrackets: (bracketsQuery.data as LeverageBracket) || null,
    positionMode: modeQuery.data || null,
    isLoading: commissionQuery.isLoading || bracketsQuery.isLoading || modeQuery.isLoading,
    error: commissionQuery.error || bracketsQuery.error || modeQuery.error || null,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate max leverage for a given notional value
 */
export function getMaxLeverageForNotional(
  brackets: LeverageBracket | null,
  notionalValue: number
): number {
  if (!brackets?.brackets?.length) return 125; // Default max

  // Find the bracket that contains the notional value
  for (const tier of brackets.brackets) {
    if (notionalValue >= tier.notionalFloor && notionalValue < tier.notionalCap) {
      return tier.initialLeverage;
    }
  }

  // Return lowest leverage for largest positions
  return brackets.brackets[brackets.brackets.length - 1]?.initialLeverage || 1;
}

/**
 * Get maintenance margin ratio for a given notional value
 */
export function getMaintMarginRatio(
  brackets: LeverageBracket | null,
  notionalValue: number
): number {
  if (!brackets?.brackets?.length) return 0.004; // Default 0.4%

  for (const tier of brackets.brackets) {
    if (notionalValue >= tier.notionalFloor && notionalValue < tier.notionalCap) {
      return tier.maintMarginRatio;
    }
  }

  return brackets.brackets[brackets.brackets.length - 1]?.maintMarginRatio || 0.5;
}
