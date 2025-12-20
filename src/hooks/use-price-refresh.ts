/**
 * Hook to refresh prices from the fetch-prices edge function
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assetKeys, holdingKeys } from '@/hooks/use-portfolio';
import { toast } from 'sonner';

interface PriceRefreshResult {
  success: boolean;
  updated: number;
  duration_ms: number;
  breakdown?: {
    crypto: number;
    us_stocks: number;
    id_stocks: number;
    alpha_vantage: number;
  };
  message?: string;
  error?: string;
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<PriceRefreshResult> => {
      console.log('[Price Refresh] Starting price refresh...');
      
      const { data, error } = await supabase.functions.invoke<PriceRefreshResult>(
        'fetch-prices',
        { body: {} }
      );

      if (error) {
        console.error('[Price Refresh] Error:', error);
        throw new Error(error.message || 'Failed to refresh prices');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Price refresh failed');
      }

      console.log('[Price Refresh] Complete:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate price-related queries to refetch with new prices
      queryClient.invalidateQueries({ queryKey: assetKeys.prices() });
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      
      toast.success(`Updated ${data.updated} asset prices`);
    },
    onError: (error) => {
      console.error('[Price Refresh] Failed:', error);
      toast.error(`Price refresh failed: ${error.message}`);
    },
  });
}

/**
 * Hook to trigger price refresh when the page loads if prices are stale
 */
export function usePriceRefreshOnMount(staleMinutes: number = 5) {
  const refreshPrices = useRefreshPrices();
  
  // We can implement auto-refresh logic here if needed
  // For now, we expose the mutation for manual triggering
  
  return refreshPrices;
}
