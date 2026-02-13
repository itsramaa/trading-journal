/**
 * useTradeEnrichmentBinance - Hook for enriching trade entries with detailed Binance data
 * 
 * This hook enables:
 * - Fetching exact entry/exit prices from userTrades
 * - Getting accurate direction (LONG/SHORT)
 * - Calculating hold time and linking commissions
 * - RE-ENRICHING existing trades that have entry_price = 0
 * 
 * OPTIMIZED: Uses weekly windowed fetching instead of full date range
 * to reduce income records from 100k+ to ~500
 */

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
const MAX_INCOME_RECORDS = 10000; // Safety limit to prevent 100k+ fetches

export interface EnrichmentProgress {
  phase: 'checking' | 'fetching-income' | 'fetching-trades' | 'enriching' | 'updating' | 'done';
  current: number;
  total: number;
  percent: number;
  message?: string;
  windowInfo?: { current: number; total: number };
  recordsFetched?: number;
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
 * Trade window for grouping fetches by time period
 */
interface TradeWindow {
  startTime: number;
  endTime: number;
  trades: Array<{ id: string; trade_date: string; pair: string }>;
  index: number;
}

/**
 * Group trades into 7-day windows for efficient fetching
 */
function groupTradesIntoWeeklyWindows(
  trades: Array<{ id: string; trade_date: string; pair: string }>
): TradeWindow[] {
  if (trades.length === 0) return [];
  
  // Sort by date
  const sorted = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  
  const windows: TradeWindow[] = [];
  const WINDOW_SIZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const BUFFER_MS = 2 * 60 * 60 * 1000; // 2 hour buffer
  
  let currentWindow: TradeWindow | null = null;
  
  for (const trade of sorted) {
    const tradeTime = new Date(trade.trade_date).getTime();
    
    if (!currentWindow || tradeTime > currentWindow.endTime) {
      // Start new window
      currentWindow = {
        startTime: tradeTime - BUFFER_MS,
        endTime: tradeTime + WINDOW_SIZE_MS,
        trades: [],
        index: windows.length,
      };
      windows.push(currentWindow);
    }
    
    currentWindow.trades.push(trade);
  }
  
  console.log(`[Enrichment] Grouped ${trades.length} trades into ${windows.length} weekly windows`);
  return windows;
}

/**
 * Deduplicate income records by tranId
 */
function deduplicateByTranId(records: BinanceIncome[]): BinanceIncome[] {
  const seen = new Map<number, BinanceIncome>();
  for (const record of records) {
    if (!seen.has(record.tranId)) {
      seen.set(record.tranId, record);
    }
  }
  return Array.from(seen.values());
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
 * Fetch income records with cursor-based pagination AND max limit
 */
async function fetchPaginatedIncome(
  startTime: number,
  endTime: number,
  maxRecords: number = 5000,
  onProgress?: (fetched: number) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  let fromId: number | undefined = undefined;
  
  while (true) {
    // Safety limit check
    if (allRecords.length >= maxRecords) {
      console.warn(`[Enrichment] Hit max records limit (${maxRecords}), stopping pagination`);
      break;
    }
    
    const remainingCapacity = maxRecords - allRecords.length;
    const requestLimit = Math.min(RECORDS_PER_PAGE, remainingCapacity);
    
    const result = await callBinanceApi<BinanceIncome[]>('income', {
      startTime,
      endTime,
      limit: requestLimit,
      ...(fromId && { fromId }),
    });
    
    if (!result.success || !result.data?.length) break;
    
    allRecords.push(...result.data);
    onProgress?.(allRecords.length);
    
    if (result.data.length < requestLimit) break;
    
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
    placeholderData: keepPreviousData,
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
      
      // Step 2: Group trades into weekly windows for efficient fetching
      const tradeWindows = groupTradesIntoWeeklyWindows(
        tradesToEnrich!.map(t => ({ id: t.id, trade_date: t.trade_date, pair: t.pair }))
      );
      
      if (tradeWindows.length === 0) {
        throw new Error('Failed to group trades into windows');
      }
      
      onProgress?.({
        phase: 'fetching-income',
        current: 0,
        total: tradeWindows.length,
        percent: 5,
        message: `Fetching income data from ${tradeWindows.length} time windows...`,
        windowInfo: { current: 0, total: tradeWindows.length },
        recordsFetched: 0,
      });
      
      // Step 3: Fetch income history per window (OPTIMIZED - not full range!)
      const allIncome: BinanceIncome[] = [];
      let totalRecordsFetched = 0;
      
      for (let w = 0; w < tradeWindows.length; w++) {
        const window = tradeWindows[w];
        
        // Safety limit check
        if (totalRecordsFetched >= MAX_INCOME_RECORDS) {
          console.warn(`[Enrichment] Hit global max limit (${MAX_INCOME_RECORDS}), stopping`);
          break;
        }
        
        const remainingCapacity = MAX_INCOME_RECORDS - totalRecordsFetched;
        
        const windowIncome = await fetchPaginatedIncome(
          window.startTime,
          window.endTime,
          Math.min(remainingCapacity, 2000), // Max 2000 per window
          (fetched) => {
            onProgress?.({
              phase: 'fetching-income',
              current: w + 1,
              total: tradeWindows.length,
              percent: 5 + (w / tradeWindows.length) * 20,
              message: `Window ${w + 1}/${tradeWindows.length}: ${fetched} records...`,
              windowInfo: { current: w + 1, total: tradeWindows.length },
              recordsFetched: totalRecordsFetched + fetched,
            });
          }
        );
        
        allIncome.push(...windowIncome);
        totalRecordsFetched += windowIncome.length;
        
        console.log(`[Enrichment] Window ${w + 1}/${tradeWindows.length}: fetched ${windowIncome.length} income records`);
        
        // Rate limit between windows
        if (w < tradeWindows.length - 1) {
          await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
        }
      }
      
      // Deduplicate income records
      const deduplicatedIncome = deduplicateByTranId(allIncome);
      console.log(`[Enrichment] Total income: ${allIncome.length} -> Deduplicated: ${deduplicatedIncome.length}`);
      
      if (deduplicatedIncome.length === 0) {
        return { 
          enriched: 0, 
          failed: tradesNeedingEnrichment, 
          tradesNeedingEnrichment,
          errors: ['No income data found from Binance'] 
        };
      }
      
      // Step 4: Get unique symbols from deduplicated income
      const uniqueSymbols = getUniqueSymbolsFromIncome(deduplicatedIncome);
      
      if (uniqueSymbols.length === 0) {
        return { 
          enriched: 0, 
          failed: tradesNeedingEnrichment,
          tradesNeedingEnrichment,
          errors: ['No symbols found in income data'] 
        };
      }
      
      // Step 5: Calculate overall time range for userTrades fetch
      const allTradeTimestamps = tradesToEnrich!.map(t => new Date(t.trade_date).getTime());
      const minTime = Math.min(...allTradeTimestamps) - (2 * 60 * 60 * 1000); // 2 hour buffer
      const maxTime = Math.max(...allTradeTimestamps) + (2 * 60 * 60 * 1000);
      
      onProgress?.({
        phase: 'fetching-trades',
        current: 0,
        total: uniqueSymbols.length,
        percent: 25,
        message: `Fetching userTrades for ${uniqueSymbols.length} symbols...`,
        recordsFetched: deduplicatedIncome.length,
      });
      
      const enrichedTrades = await fetchEnrichedTradesForSymbols(
        uniqueSymbols,
        minTime,
        maxTime,
        deduplicatedIncome,
        (current, total) => {
          onProgress?.({
            phase: 'fetching-trades',
            current,
            total,
            percent: 25 + (current / total) * 30,
            message: `Processing ${current}/${total} symbols...`,
            recordsFetched: deduplicatedIncome.length,
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
