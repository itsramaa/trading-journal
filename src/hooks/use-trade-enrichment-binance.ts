/**
 * useTradeEnrichmentBinance - Hook for enriching trade entries with detailed Binance data
 * 
 * This hook enables:
 * - Fetching exact entry/exit prices from userTrades
 * - Getting accurate direction (LONG/SHORT)
 * - Calculating hold time and linking commissions
 * - RE-ENRICHING existing trades that have entry_price = 0
 * 
 * Use case: After syncing trades, run enrichment to fill missing data
 */

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
const RATE_LIMIT_DELAY = 300;
const RECORDS_PER_PAGE = 1000;

export interface EnrichmentProgress {
  phase: 'checking' | 'fetching-income' | 'fetching-trades' | 'enriching' | 'updating' | 'done';
  current: number;
  total: number;
  percent: number;
  message?: string;
}

export interface EnrichmentResult {
  enriched: number;
  failed: number;
  tradesNeedingEnrichment: number;
  errors: string[];
}

export interface EnrichmentOptions {
  daysBack?: number;
  onProgress?: (progress: EnrichmentProgress) => void;
}

/**
 * Call Binance edge function with pagination support
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
 * Fetch ALL income records with cursor-based pagination
 */
async function fetchPaginatedIncome(
  startTime: number,
  endTime: number,
  onProgress?: (fetched: number) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  let fromId: number | undefined = undefined;
  
  while (true) {
    const result = await callBinanceApi<BinanceIncome[]>('income', {
      startTime,
      endTime,
      limit: RECORDS_PER_PAGE,
      ...(fromId && { fromId }),
    });
    
    if (!result.success || !result.data?.length) break;
    
    allRecords.push(...result.data);
    onProgress?.(allRecords.length);
    
    if (result.data.length < RECORDS_PER_PAGE) break;
    
    fromId = result.data[result.data.length - 1].tranId + 1;
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
  
  return allRecords;
}

/**
 * Hook to get count of trades needing enrichment
 */
export function useTradesNeedingEnrichmentCount() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['trades-needing-enrichment-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('trade_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source', 'binance')
        .eq('entry_price', 0)
        .is('deleted_at', null);
      
      if (error) {
        console.error('Error counting trades needing enrichment:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Hook to enrich existing trades with detailed Binance data
 */
export function useTradeEnrichmentBinance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const enrichTrades = useMutation({
    mutationFn: async (options: EnrichmentOptions = {}): Promise<EnrichmentResult> => {
      const { daysBack = 730, onProgress } = options; // Default 2 years
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const errors: string[] = [];
      
      // Step 1: Check how many trades need enrichment
      onProgress?.({
        phase: 'checking',
        current: 0,
        total: 1,
        percent: 2,
        message: 'Checking trades needing enrichment...',
      });
      
      const { data: tradesToEnrich, error: fetchError } = await supabase
        .from('trade_entries')
        .select('id, binance_trade_id, trade_date, pair, realized_pnl')
        .eq('user_id', user.id)
        .eq('source', 'binance')
        .eq('entry_price', 0)
        .is('deleted_at', null)
        .order('trade_date', { ascending: false });
      
      if (fetchError) {
        throw new Error(`Failed to fetch trades: ${fetchError.message}`);
      }
      
      const tradesNeedingEnrichment = tradesToEnrich?.length || 0;
      
      if (tradesNeedingEnrichment === 0) {
        onProgress?.({
          phase: 'done',
          current: 0,
          total: 0,
          percent: 100,
          message: 'All trades already enriched!',
        });
        return { enriched: 0, failed: 0, tradesNeedingEnrichment: 0, errors: [] };
      }
      
      // Step 2: Determine date range from trades
      const tradeDates = tradesToEnrich!.map(t => new Date(t.trade_date).getTime());
      const oldestTrade = Math.min(...tradeDates);
      const newestTrade = Math.max(...tradeDates);
      
      // Extend range by 2 days on each side to capture entry trades
      const startTime = oldestTrade - (2 * 24 * 60 * 60 * 1000);
      const endTime = newestTrade + (2 * 24 * 60 * 60 * 1000);
      
      onProgress?.({
        phase: 'fetching-income',
        current: 0,
        total: tradesNeedingEnrichment,
        percent: 5,
        message: `Fetching income data for ${tradesNeedingEnrichment} trades...`,
      });
      
      // Step 3: Fetch income history with pagination
      const allIncome = await fetchPaginatedIncome(
        startTime,
        endTime,
        (fetched) => {
          onProgress?.({
            phase: 'fetching-income',
            current: fetched,
            total: tradesNeedingEnrichment,
            percent: 5 + Math.min(20, (fetched / 1000) * 5),
            message: `Fetched ${fetched} income records...`,
          });
        }
      );
      
      if (allIncome.length === 0) {
        return { 
          enriched: 0, 
          failed: tradesNeedingEnrichment, 
          tradesNeedingEnrichment,
          errors: ['No income data found from Binance'] 
        };
      }
      
      // Step 4: Get unique symbols
      const uniqueSymbols = getUniqueSymbolsFromIncome(allIncome);
      
      if (uniqueSymbols.length === 0) {
        return { 
          enriched: 0, 
          failed: tradesNeedingEnrichment,
          tradesNeedingEnrichment,
          errors: ['No symbols found in income data'] 
        };
      }
      
      // Step 5: Fetch userTrades for each symbol
      onProgress?.({
        phase: 'fetching-trades',
        current: 0,
        total: uniqueSymbols.length,
        percent: 25,
        message: `Fetching userTrades for ${uniqueSymbols.length} symbols...`,
      });
      
      const enrichedTrades = await fetchEnrichedTradesForSymbols(
        uniqueSymbols,
        startTime,
        endTime,
        allIncome,
        (current, total) => {
          onProgress?.({
            phase: 'fetching-trades',
            current,
            total,
            percent: 25 + (current / total) * 30,
            message: `Processing ${current}/${total} symbols...`,
          });
        }
      );
      
      // Step 6: Create lookup map for enriched data
      const enrichedByTranId = new Map<number, EnrichedTradeData>();
      for (const trade of enrichedTrades) {
        enrichedByTranId.set(trade.tranId, trade);
      }
      
      // Step 7: Update trades in database
      onProgress?.({
        phase: 'updating',
        current: 0,
        total: tradesNeedingEnrichment,
        percent: 60,
        message: 'Updating trades in database...',
      });
      
      let enriched = 0;
      let failed = 0;
      
      for (let i = 0; i < tradesToEnrich!.length; i++) {
        const trade = tradesToEnrich![i];
        
        // Extract tranId from binance_trade_id (format: "income_12345")
        const tranIdMatch = trade.binance_trade_id?.match(/income_(\d+)/);
        if (!tranIdMatch) {
          failed++;
          errors.push(`Trade ${trade.id}: Invalid binance_trade_id format`);
          continue;
        }
        
        const tranId = parseInt(tranIdMatch[1], 10);
        const enrichedData = enrichedByTranId.get(tranId);
        
        if (enrichedData && enrichedData.entryPrice > 0) {
          // Update with enriched data
          const updateData: Record<string, unknown> = {
            entry_price: enrichedData.entryPrice,
            exit_price: enrichedData.exitPrice,
            quantity: enrichedData.quantity,
            direction: enrichedData.direction,
            entry_datetime: enrichedData.entryTime.toISOString(),
            exit_datetime: enrichedData.exitTime.toISOString(),
            fees: enrichedData.totalFees,
            is_maker: enrichedData.isMaker,
            hold_time_minutes: enrichedData.holdTimeMinutes,
            notes: `Enriched with accurate Binance data`,
          };
          
          const { error: updateError } = await supabase
            .from('trade_entries')
            .update(updateData)
            .eq('id', trade.id)
            .eq('user_id', user.id);
          
          if (updateError) {
            failed++;
            errors.push(`Trade ${trade.id}: ${updateError.message}`);
          } else {
            enriched++;
          }
        } else {
          failed++;
          errors.push(`Trade ${trade.id}: No matching userTrade data found`);
        }
        
        // Update progress
        onProgress?.({
          phase: 'updating',
          current: i + 1,
          total: tradesNeedingEnrichment,
          percent: 60 + ((i + 1) / tradesNeedingEnrichment) * 40,
          message: `Updated ${i + 1}/${tradesNeedingEnrichment} trades...`,
        });
      }
      
      onProgress?.({
        phase: 'done',
        current: enriched,
        total: tradesNeedingEnrichment,
        percent: 100,
        message: `Completed: ${enriched} enriched, ${failed} failed`,
      });
      
      return { enriched, failed, tradesNeedingEnrichment, errors };
    },
    onSuccess: (result) => {
      invalidateTradeQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['trades-needing-enrichment-count'] });
      
      if (result.enriched > 0) {
        toast.success(`Enrichment Complete`, {
          description: `${result.enriched} trades updated with accurate entry/exit prices`,
          duration: 5000,
        });
      } else if (result.tradesNeedingEnrichment === 0) {
        toast.info('All Trades Already Enriched', {
          description: 'No trades with missing data found',
          duration: 4000,
        });
      } else {
        toast.warning('Enrichment Incomplete', {
          description: `${result.failed} trades could not be enriched`,
          duration: 5000,
        });
      }
      
      if (result.failed > 0 && result.errors.length > 0) {
        console.warn('Enrichment errors:', result.errors.slice(0, 10));
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
