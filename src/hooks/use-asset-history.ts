import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HistoricalPrice {
  date: string;
  price: number;
}

interface PriceHistoryResponse {
  success: boolean;
  symbol?: string;
  asset_type?: string;
  timeframe?: string;
  prices?: HistoricalPrice[];
  count?: number;
  error?: string;
}

export const ASSET_HISTORY_QUERY_KEY = "asset-history";

export function useAssetHistory(symbol: string | undefined, timeframe: string = '1M') {
  return useQuery({
    queryKey: [ASSET_HISTORY_QUERY_KEY, symbol, timeframe],
    queryFn: async (): Promise<HistoricalPrice[]> => {
      if (!symbol) return [];

      const { data, error } = await supabase.functions.invoke<PriceHistoryResponse>(
        'fetch-price-history',
        {
          body: { symbol, timeframe },
        }
      );

      if (error) {
        console.error('Error fetching price history:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('Price history fetch failed:', data?.error);
        return [];
      }

      return data.prices || [];
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}
