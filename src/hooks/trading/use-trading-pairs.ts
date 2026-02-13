/**
 * Hook for managing centralized trading pairs from database
 * Pairs are synced from Binance Futures API via edge function
 */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TradingPair {
  id: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  is_active: boolean;
  source: string;
  last_synced_at: string;
  created_at: string;
}

export function useTradingPairs() {
  return useQuery({
    queryKey: ["trading-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("*")
        .eq("is_active", true)
        .order("symbol");
      
      if (error) throw error;
      return data as TradingPair[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour - pairs don't change often
  });
}

export function useTradingPairsByQuote(quoteAsset: string = 'USDT') {
  return useQuery({
    queryKey: ["trading-pairs", quoteAsset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("*")
        .eq("is_active", true)
        .eq("quote_asset", quoteAsset)
        .order("symbol");
      
      if (error) throw error;
      return data as TradingPair[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useSyncTradingPairs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-trading-pairs');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trading-pairs"] });
      toast({
        title: "Pairs Synced",
        description: `Successfully synced ${data.pairs_synced} trading pairs from Binance`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to get last sync time
export function usePairsSyncStatus() {
  return useQuery({
    queryKey: ["trading-pairs-sync-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("last_synced_at")
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.last_synced_at ? new Date(data.last_synced_at) : null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook untuk mendapatkan unique base assets (BTC, ETH, dll)
 * Digunakan untuk Strategy valid pairs selection
 * @deprecated COMMON_PAIRS - gunakan hook ini sebagai gantinya
 */
export function useBaseAssets() {
  const { data: tradingPairs, isLoading } = useTradingPairs();
  
  const baseAssets = useMemo(() => {
    if (!tradingPairs) return [];
    const assets = [...new Set(tradingPairs.map(p => p.base_asset))];
    return assets.sort();
  }, [tradingPairs]);

  return { data: baseAssets, isLoading };
}
