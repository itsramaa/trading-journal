/**
 * useTradeEnrichmentBinance - Hook for enriching trade entries with detailed Binance data
 * 
 * This hook enables:
 * - Fetching exact entry/exit prices from userTrades
 * - Getting accurate direction (LONG/SHORT)
 * - Calculating hold time and linking commissions
 * 
 * Use case: After syncing trades, run enrichment to fill missing data
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { invalidateTradeQueries } from "@/lib/query-invalidation";
import {
  fetchEnrichedTradesForSymbols,
  getUniqueSymbolsFromIncome,
  type EnrichedTradeData,
} from "@/services/binance-trade-enricher";
import type { BinanceIncome } from "@/features/binance/types";

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;

export interface EnrichmentProgress {
  phase: 'fetching-income' | 'fetching-trades' | 'enriching' | 'updating' | 'done';
  current: number;
  total: number;
  percent: number;
}

export interface EnrichmentResult {
  enriched: number;
  failed: number;
  errors: string[];
}

/**
 * Call Binance edge function
 */
async function callBinanceApi<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(BINANCE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    },
    body: JSON.stringify({ action, ...params }),
  });
  
  return response.json();
}

/**
 * Hook to enrich existing trades with detailed Binance data
 */
export function useTradeEnrichmentBinance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const enrichTrades = useMutation({
    mutationFn: async (options: {
      daysBack?: number;
      onProgress?: (progress: EnrichmentProgress) => void;
    } = {}): Promise<EnrichmentResult> => {
      const { daysBack = 90, onProgress } = options;
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const errors: string[] = [];
      const now = Date.now();
      const startTime = now - (daysBack * 24 * 60 * 60 * 1000);
      
      // Step 1: Fetch income history for the period
      onProgress?.({
        phase: 'fetching-income',
        current: 0,
        total: 1,
        percent: 5,
      });
      
      const incomeResult = await callBinanceApi<BinanceIncome[]>('income', {
        startTime,
        endTime: now,
        limit: 1000,
      });
      
      if (!incomeResult.success || !incomeResult.data?.length) {
        return { enriched: 0, failed: 0, errors: ['No income data found'] };
      }
      
      const allIncome = incomeResult.data;
      
      // Step 2: Get unique symbols
      const symbols = getUniqueSymbolsFromIncome(allIncome);
      
      if (symbols.length === 0) {
        return { enriched: 0, failed: 0, errors: ['No symbols found in income data'] };
      }
      
      // Step 3: Fetch userTrades for each symbol
      onProgress?.({
        phase: 'fetching-trades',
        current: 0,
        total: symbols.length,
        percent: 10,
      });
      
      const enrichedTrades = await fetchEnrichedTradesForSymbols(
        symbols,
        startTime,
        now,
        allIncome,
        (current, total) => {
          onProgress?.({
            phase: 'fetching-trades',
            current,
            total,
            percent: 10 + (current / total) * 40,
          });
        }
      );
      
      // Step 4: Update existing trades in database
      onProgress?.({
        phase: 'updating',
        current: 0,
        total: enrichedTrades.length,
        percent: 55,
      });
      
      let enriched = 0;
      let failed = 0;
      
      for (let i = 0; i < enrichedTrades.length; i++) {
        const trade = enrichedTrades[i];
        const binanceTradeId = `income_${trade.tranId}`;
        
        // Update trade entry with enriched data
        const updateData: Record<string, unknown> = {
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          quantity: trade.quantity,
          direction: trade.direction,
          entry_datetime: trade.entryTime.toISOString(),
          exit_datetime: trade.exitTime.toISOString(),
          fees: trade.totalFees,
          is_maker: trade.isMaker,
          hold_time_minutes: trade.holdTimeMinutes,
        };
        
        const { error } = await supabase
          .from('trade_entries')
          .update(updateData)
          .eq('binance_trade_id', binanceTradeId)
          .eq('user_id', user.id);
        
        if (error) {
          failed++;
          errors.push(`Trade ${binanceTradeId}: ${error.message}`);
        } else {
          enriched++;
        }
        
        // Progress update
        onProgress?.({
          phase: 'updating',
          current: i + 1,
          total: enrichedTrades.length,
          percent: 55 + ((i + 1) / enrichedTrades.length) * 45,
        });
      }
      
      onProgress?.({
        phase: 'done',
        current: enriched,
        total: enrichedTrades.length,
        percent: 100,
      });
      
      return { enriched, failed, errors };
    },
    onSuccess: (result) => {
      invalidateTradeQueries(queryClient);
      
      if (result.enriched > 0) {
        toast.success(`Enrichment Complete`, {
          description: `${result.enriched} trades updated with detailed data`,
          duration: 5000,
        });
      } else {
        toast.info('No Trades Enriched', {
          description: 'No matching trades found to enrich',
          duration: 4000,
        });
      }
      
      if (result.failed > 0) {
        console.warn('Enrichment errors:', result.errors);
        toast.warning(`${result.failed} trades failed to enrich`, {
          description: 'Check console for details',
        });
      }
    },
    onError: (error) => {
      toast.error(`Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  return {
    enrichTrades: enrichTrades.mutateAsync,
    isEnriching: enrichTrades.isPending,
    lastResult: enrichTrades.data,
    error: enrichTrades.error,
    reset: enrichTrades.reset,
  };
}
