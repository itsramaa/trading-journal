/**
 * Binance Algo Orders Hooks - Phase 6
 * Hooks for tracking conditional orders (TP/SL, TWAP, VP)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// Types
// =============================================================================

export interface AlgoOrder {
  algoId: number;
  symbol: string;
  orderId: number;
  side: 'BUY' | 'SELL';
  positionSide: string;
  totalQty: number;
  executedQty: number;
  avgPrice: number;
  status: string;
  triggerPrice: number;
  algoType: string;
  createTime: number;
  updateTime: number;
}

export interface AlgoSubOrder {
  algoId: number;
  orderId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  executedQty: number;
  status: string;
  time: number;
}

export interface AlgoOrdersParams {
  symbol?: string;
  side?: 'BUY' | 'SELL';
  startTime?: number;
  endTime?: number;
  limit?: number;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get historical algo orders (VP, TWAP, etc.)
 */
export function useBinanceAlgoOrders(params: AlgoOrdersParams = {}) {
  return useQuery({
    queryKey: ['binance', 'algo-orders', params],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('binance-futures', {
        body: { action: 'algo-orders', params },
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch algo orders');
      
      return data.data as AlgoOrder[];
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get open/active algo orders
 */
export function useBinanceAlgoOpenOrders() {
  return useQuery({
    queryKey: ['binance', 'algo-open-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('binance-futures', {
        body: { action: 'algo-open-orders' },
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch open algo orders');
      
      return data.data as AlgoOrder[];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000,
  });
}

/**
 * Get sub-orders for a specific algo order
 */
export function useBinanceAlgoOrder(algoId: number | undefined) {
  return useQuery({
    queryKey: ['binance', 'algo-order', algoId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('binance-futures', {
        body: { action: 'algo-order', algoId },
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch algo order');
      
      return data.data as AlgoSubOrder[];
    },
    enabled: !!algoId,
    staleTime: 60 * 1000,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getAlgoTypeLabel(algoType: string): string {
  switch (algoType) {
    case 'VP':
      return 'Volume Participation';
    case 'TWAP':
      return 'Time-Weighted Avg Price';
    case 'SL':
      return 'Stop Loss';
    case 'TP':
      return 'Take Profit';
    default:
      return algoType;
  }
}

export function getAlgoStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'FILLED':
    case 'SUCCESS':
      return 'default';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'secondary';
    case 'FAILED':
    case 'REJECTED':
      return 'destructive';
    default:
      return 'outline';
  }
}
