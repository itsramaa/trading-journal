/**
 * Binance Futures Hooks
 * TanStack Query hooks for Binance Futures API integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  BinanceAccountSummary,
  BinancePosition,
  BinanceTrade,
  BinanceOrder,
  BinanceConnectionStatus,
  BinanceApiResponse,
  PlaceOrderParams,
  CancelOrderParams,
} from './types';

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;

/**
 * Call Binance edge function with action
 */
async function callBinanceApi<T>(
  action: string,
  params: Record<string, any> = {}
): Promise<BinanceApiResponse<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(BINANCE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    },
    body: JSON.stringify({ action, ...params }),
  });
  
  const result = await response.json();
  return result;
}

/**
 * Hook to get Binance connection status (cached)
 * Use this for UI components that need to check if connected
 */
export function useBinanceConnectionStatus() {
  return useQuery<BinanceConnectionStatus>({
    queryKey: ['binance', 'connection-status'],
    queryFn: async () => {
      const result = await callBinanceApi<{ canTrade: boolean; permissions: string[] }>('validate');
      
      if (result.success && result.data) {
        return {
          isConnected: true,
          lastChecked: new Date().toISOString(),
          permissions: result.data.permissions || [],
        };
      }
      
      return {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        permissions: [],
        error: result.error || 'Connection failed',
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to validate and check Binance connection
 */
export function useBinanceConnection() {
  return useQuery<BinanceConnectionStatus>({
    queryKey: ['binance', 'connection'],
    queryFn: async () => {
      const result = await callBinanceApi<{ canTrade: boolean; permissions: string[] }>('validate');
      
      if (result.success && result.data) {
        return {
          isConnected: true,
          lastChecked: new Date().toISOString(),
          permissions: result.data.permissions || [],
        };
      }
      
      return {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        permissions: [],
        error: result.error || 'Connection failed',
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to test Binance connection manually
 */
export function useTestBinanceConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const result = await callBinanceApi<{ canTrade: boolean; permissions: string[] }>('validate');
      
      if (!result.success) {
        throw new Error(result.error || 'Connection failed');
      }
      
      return {
        isConnected: true,
        lastChecked: new Date().toISOString(),
        permissions: result.data?.permissions || [],
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['binance', 'connection'], data);
    },
  });
}

/**
 * Hook to get account balance
 */
export function useBinanceBalance() {
  return useQuery<BinanceAccountSummary | null>({
    queryKey: ['binance', 'balance'],
    queryFn: async () => {
      const result = await callBinanceApi<BinanceAccountSummary>('balance');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch balance');
      }
      
      return result.data || null;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    retry: 2,
  });
}

/**
 * Hook to get current positions
 */
export function useBinancePositions(symbol?: string) {
  return useQuery<BinancePosition[]>({
    queryKey: ['binance', 'positions', symbol],
    queryFn: async () => {
      const result = await callBinanceApi<BinancePosition[]>('positions', { symbol });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch positions');
      }
      
      return result.data || [];
    },
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 15 * 1000, // Poll every 15 seconds
    retry: 2,
  });
}

/**
 * Hook to get trade history
 */
export function useBinanceTrades(symbol: string, limit = 50) {
  return useQuery<BinanceTrade[]>({
    queryKey: ['binance', 'trades', symbol, limit],
    queryFn: async () => {
      const result = await callBinanceApi<BinanceTrade[]>('trades', { symbol, limit });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trades');
      }
      
      return result.data || [];
    },
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

/**
 * Hook to get open orders
 */
export function useBinanceOpenOrders(symbol?: string) {
  return useQuery<BinanceOrder[]>({
    queryKey: ['binance', 'open-orders', symbol],
    queryFn: async () => {
      const result = await callBinanceApi<BinanceOrder[]>('open-orders', { symbol });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch open orders');
      }
      
      return result.data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    retry: 2,
  });
}

/**
 * Hook to place order (optional - for future use)
 */
export function usePlaceBinanceOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: PlaceOrderParams) => {
      const result = await callBinanceApi<any>('place-order', { orderParams: params });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to place order');
      }
      
      return result.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['binance', 'positions'] });
      queryClient.invalidateQueries({ queryKey: ['binance', 'open-orders'] });
      queryClient.invalidateQueries({ queryKey: ['binance', 'balance'] });
    },
  });
}

/**
 * Hook to cancel order
 */
export function useCancelBinanceOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CancelOrderParams) => {
      const result = await callBinanceApi<any>('cancel-order', { orderParams: params });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel order');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['binance', 'open-orders'] });
    },
  });
}

/**
 * Hook to refresh all Binance data
 */
export function useRefreshBinanceData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['binance', 'balance'] }),
        queryClient.invalidateQueries({ queryKey: ['binance', 'positions'] }),
        queryClient.invalidateQueries({ queryKey: ['binance', 'open-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['binance', 'income'] }),
        queryClient.invalidateQueries({ queryKey: ['binance', 'all-income'] }),
      ]);
    },
  });
}

/**
 * Hook to fetch income history (realized PnL, commissions, funding fees) across ALL symbols
 * This is the preferred endpoint for getting trade history without symbol restrictions
 */
export function useBinanceIncomeHistory(
  incomeType?: string,
  startTime?: number,
  limit = 1000
) {
  return useQuery({
    queryKey: ['binance', 'income', incomeType, startTime, limit],
    queryFn: async () => {
      const result = await callBinanceApi<any[]>('income', { 
        incomeType, 
        startTime,
        limit 
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch income history');
      }
      
      return result.data || [];
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

/**
 * Hook to fetch ALL income types in a single call (no type filter)
 * Best for comprehensive income analysis across all categories
 */
export function useBinanceAllIncome(daysBack = 7, limit = 1000) {
  const startTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  return useQuery({
    queryKey: ['binance', 'all-income', daysBack, limit],
    queryFn: async () => {
      // No incomeType filter = fetch ALL types
      const result = await callBinanceApi<any[]>('income', { startTime, limit });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch all income');
      }
      
      return result.data || [];
    },
    staleTime: 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook specifically for fetching Realized P&L across all symbols
 * Convenience wrapper for income history with REALIZED_PNL filter
 */
export function useBinanceRealizedPnL(limit = 1000) {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return useBinanceIncomeHistory('REALIZED_PNL', oneDayAgo, limit);
}

/**
 * Hook specifically for fetching commissions/fees
 */
export function useBinanceCommissions(limit = 500) {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return useBinanceIncomeHistory('COMMISSION', oneDayAgo, limit);
}

/**
 * Hook specifically for fetching funding fees
 */
export function useBinanceFundingFees(limit = 500) {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return useBinanceIncomeHistory('FUNDING_FEE', oneDayAgo, limit);
}
