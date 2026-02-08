/**
 * useBinanceFullSync - Hook for syncing complete Binance history to local database
 * Supports chunked fetching (3-month intervals) AND cursor-based pagination
 * to handle Binance API limits (1000 records per request, 90 days per chunk)
 * 
 * Features:
 * - Fetches up to 2 years of income history
 * - Cursor-based pagination within chunks (handles >1000 records per chunk)
 * - Progress tracking for UI feedback
 * - Deduplication against existing trades
 * - Batch insert for performance
 * - AUTO-ENRICHMENT: Fetches userTrades to get accurate entry/exit prices
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { invalidateTradeQueries } from "@/lib/query-invalidation";
import type { BinanceIncome } from "@/features/binance/types";
import {
  fetchEnrichedTradesForSymbols,
  getUniqueSymbolsFromIncome,
  type EnrichedTradeData,
} from "@/services/binance-trade-enricher";

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;

// Binance API limit: 3 months (90 days) per request
const CHUNK_DAYS = 90;
const RATE_LIMIT_DELAY = 300; // ms between requests
const MAX_EMPTY_CHUNKS = 5; // Increased from 2 to handle longer trading gaps
const RECORDS_PER_PAGE = 1000; // Binance API limit per request

export interface FullSyncProgress {
  phase: 'fetching' | 'filtering' | 'deduplicating' | 'enriching' | 'inserting' | 'done';
  chunk: number;
  totalChunks: number;
  page: number;
  recordsFetched: number;
  recordsToInsert: number;
  enrichedCount: number;
  percent: number;
  // Rate limit info
  rateLimitWarning?: boolean;
  rateLimitMessage?: string;
}

export interface FullSyncOptions {
  monthsBack?: number;
  fetchAll?: boolean; // Fetch unlimited history (up to account creation)
  skipEnrichment?: boolean; // Skip userTrades enrichment (faster but less accurate)
  forceRefetch?: boolean; // Ignore duplicates and re-download all income records
  onProgress?: (progress: FullSyncProgress) => void;
}

export interface FullSyncResult {
  synced: number;
  skipped: number;
  enriched: number;
  totalFetched: number;
  errors: string[];
}

/**
 * Call Binance edge function with fromId support for pagination
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
 * Fetch ALL income records within a time chunk using cursor-based pagination
 * This handles the case where a single chunk has >1000 records
 */
async function fetchPaginatedIncomeChunk(
  startTime: number,
  endTime: number,
  onPageProgress?: (page: number, recordsInChunk: number) => void
): Promise<{ records: BinanceIncome[]; errors: string[] }> {
  const allRecords: BinanceIncome[] = [];
  const errors: string[] = [];
  let fromId: number | undefined = undefined;
  let page = 0;
  
  while (true) {
    page++;
    
    try {
      const result = await callBinanceApi<BinanceIncome[]>('income', {
        startTime,
        endTime,
        limit: RECORDS_PER_PAGE,
        ...(fromId && { fromId }),
      });
      
      if (!result.success) {
        errors.push(`Page ${page}: ${result.error || 'Unknown error'}`);
        break; // Stop pagination on error
      }
      
      if (!result.data?.length) {
        break; // No more records
      }
      
      allRecords.push(...result.data);
      onPageProgress?.(page, allRecords.length);
      
      // Stop if we got fewer than the limit (no more pages)
      if (result.data.length < RECORDS_PER_PAGE) {
        break;
      }
      
      // Set cursor to next record ID
      // Binance returns records in ascending order by tranId when using fromId
      fromId = result.data[result.data.length - 1].tranId + 1;
      
      // Rate limit delay between pages
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
      
    } catch (error) {
      errors.push(`Page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      break;
    }
  }
  
  return { records: allRecords, errors };
}

/**
 * Fetch income history in 3-month chunks with cursor pagination within each chunk
 * Supports unlimited history fetching with fetchAll option
 */
async function fetchChunkedIncomeHistory(
  monthsBack: number = 24,
  fetchAll: boolean = false,
  onProgress?: (progress: FullSyncProgress) => void
): Promise<{ incomes: BinanceIncome[]; errors: string[] }> {
  const allIncome: BinanceIncome[] = [];
  const errors: string[] = [];
  const now = Date.now();
  const chunkMs = CHUNK_DAYS * 24 * 60 * 60 * 1000;
  
  // Calculate number of chunks needed
  const maxChunks = fetchAll ? 40 : Math.ceil((monthsBack * 30) / CHUNK_DAYS);
  let completedChunks = 0;
  let emptyChunksInRow = 0;
  
  console.log(`[FullSync] Starting fetch: ${monthsBack} months back, fetchAll=${fetchAll}, maxChunks=${maxChunks}`);
  
  for (let i = 0; i < maxChunks; i++) {
    const endTime = now - (i * chunkMs);
    const startTime = endTime - chunkMs;
    
    const chunkStartDate = new Date(startTime).toISOString().split('T')[0];
    const chunkEndDate = new Date(endTime).toISOString().split('T')[0];
    console.log(`[FullSync] Chunk ${i + 1}/${maxChunks}: ${chunkStartDate} - ${chunkEndDate}`);
    
    // Update progress: fetching phase
    onProgress?.({
      phase: 'fetching',
      chunk: i + 1,
      totalChunks: fetchAll ? Math.max(maxChunks, i + 1) : maxChunks,
      page: 0,
      recordsFetched: allIncome.length,
      recordsToInsert: 0,
      enrichedCount: 0,
      percent: ((i / maxChunks) * 40), // 0-40% for fetching
    });
    
    // Fetch all records in this chunk with pagination
    const { records: chunkRecords, errors: chunkErrors } = await fetchPaginatedIncomeChunk(
      startTime,
      endTime,
      (page, recordsInChunk) => {
        onProgress?.({
          phase: 'fetching',
          chunk: i + 1,
          totalChunks: fetchAll ? Math.max(maxChunks, i + 1) : maxChunks,
          page,
          recordsFetched: allIncome.length + recordsInChunk,
          recordsToInsert: 0,
          enrichedCount: 0,
          percent: ((i / maxChunks) * 40) + (page * 0.5),
        });
      }
    );
    
    if (chunkErrors.length > 0) {
      errors.push(...chunkErrors.map(e => `Chunk ${i + 1}: ${e}`));
      console.warn(`[FullSync] Chunk ${i + 1} had errors:`, chunkErrors);
    }
    
    if (chunkRecords.length > 0) {
      allIncome.push(...chunkRecords);
      emptyChunksInRow = 0;
      console.log(`[FullSync] Chunk ${i + 1} fetched ${chunkRecords.length} records. Total: ${allIncome.length}`);
    } else {
      emptyChunksInRow++;
      console.log(`[FullSync] Chunk ${i + 1} empty. Empty chunks in row: ${emptyChunksInRow}/${MAX_EMPTY_CHUNKS}`);
      if (fetchAll && emptyChunksInRow >= MAX_EMPTY_CHUNKS) {
        console.log(`[FullSync] Stopping after ${MAX_EMPTY_CHUNKS} consecutive empty chunks`);
        break;
      }
    }
    
    completedChunks++;
    
    if (i < maxChunks - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
  
  console.log(`[FullSync] Fetching complete. Total records: ${allIncome.length}, Completed chunks: ${completedChunks}`);
  
  // Deduplicate by tranId
  onProgress?.({
    phase: 'filtering',
    chunk: completedChunks,
    totalChunks: completedChunks,
    page: 0,
    recordsFetched: allIncome.length,
    recordsToInsert: 0,
    enrichedCount: 0,
    percent: 45,
  });
  
  const uniqueMap = new Map<number, BinanceIncome>();
  allIncome.forEach(r => uniqueMap.set(r.tranId, r));
  
  // Sort by time descending (newest first)
  const dedupedIncome = Array.from(uniqueMap.values()).sort((a, b) => b.time - a.time);
  
  return { incomes: dedupedIncome, errors };
}

/**
 * Convert BinanceIncome record to trade_entries format (basic version without enrichment)
 */
/**
 * Convert BinanceIncome record to trade_entries format (basic version without enrichment)
 * Direction is set to 'UNKNOWN' to explicitly mark trades needing enrichment
 */
function incomeToTradeEntry(income: BinanceIncome, userId: string) {
  const result = income.income > 0 ? 'win' : income.income < 0 ? 'loss' : 'breakeven';
  
  return {
    user_id: userId,
    pair: income.symbol,
    // Set 'UNKNOWN' instead of hardcoded 'LONG' - will be updated during enrichment
    direction: 'UNKNOWN',
    entry_price: 0, // Explicitly 0 = needs enrichment
    exit_price: 0,
    quantity: 0,
    pnl: income.income,
    realized_pnl: income.income,
    trade_date: new Date(income.time).toISOString(),
    status: 'closed' as const,
    result,
    source: 'binance',
    binance_trade_id: `income_${income.tranId}`,
    notes: `Auto-synced from Binance REALIZED_PNL. Needs enrichment for accurate entry/exit prices.`,
  };
}

/**
 * Convert EnrichedTradeData to trade_entries format (with accurate data from userTrades)
 */
function enrichedTradeToEntry(trade: EnrichedTradeData, userId: string, tranId: number) {
  const result = trade.realizedPnl > 0 ? 'win' : trade.realizedPnl < 0 ? 'loss' : 'breakeven';
  
  return {
    user_id: userId,
    pair: trade.symbol,
    direction: trade.direction,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    quantity: trade.quantity,
    pnl: trade.realizedPnl,
    realized_pnl: trade.realizedPnl,
    fees: trade.totalFees,
    is_maker: trade.isMaker,
    hold_time_minutes: trade.holdTimeMinutes,
    entry_datetime: trade.entryTime.toISOString(),
    exit_datetime: trade.exitTime.toISOString(),
    trade_date: trade.exitTime.toISOString(),
    status: 'closed' as const,
    result,
    source: 'binance',
    binance_trade_id: `income_${tranId}`,
    notes: `Auto-synced from Binance with enrichment`,
  };
}

/**
 * Hook for syncing complete Binance history to local database
 * Now includes automatic trade enrichment with userTrades data
 */
export function useBinanceFullSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const syncFullHistory = useMutation({
    mutationFn: async (options: FullSyncOptions = {}): Promise<FullSyncResult> => {
      const { monthsBack = 24, fetchAll = false, skipEnrichment = false, forceRefetch = false, onProgress } = options;
      
      console.log('[FullSync] Starting sync with options:', { monthsBack, fetchAll, skipEnrichment, forceRefetch });
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const errors: string[] = [];
      
      // Step 1: Fetch all income from Binance (chunked + paginated)
      const { incomes: allIncome, errors: fetchErrors } = await fetchChunkedIncomeHistory(
        monthsBack,
        fetchAll,
        onProgress
      );
      errors.push(...fetchErrors);
      
      if (allIncome.length === 0) {
        onProgress?.({
          phase: 'done',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: 0,
          recordsToInsert: 0,
          enrichedCount: 0,
          percent: 100,
        });
        return { synced: 0, skipped: 0, enriched: 0, totalFetched: 0, errors };
      }
      
      // Step 2: Filter to REALIZED_PNL only (trades)
      const pnlRecords = allIncome.filter(r => 
        r.incomeType === 'REALIZED_PNL' && r.income !== 0
      );
      
      onProgress?.({
        phase: 'deduplicating',
        chunk: 0,
        totalChunks: 0,
        page: 0,
        recordsFetched: allIncome.length,
        recordsToInsert: pnlRecords.length,
        enrichedCount: 0,
        percent: 50,
      });
      
      if (pnlRecords.length === 0) {
        onProgress?.({
          phase: 'done',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: allIncome.length,
          recordsToInsert: 0,
          enrichedCount: 0,
          percent: 100,
        });
        return { synced: 0, skipped: 0, enriched: 0, totalFetched: allIncome.length, errors };
      }
      
      // Step 3: Check for duplicates (skip if forceRefetch is enabled)
      const incomeIds = pnlRecords.map(r => `income_${r.tranId}`);
      const existingIds = new Set<string>();
      
      if (forceRefetch) {
        console.log('[FullSync] Force re-fetch enabled - deleting existing trades first');
        
        // Delete existing trades with these binance_trade_ids to allow re-insert
        for (let i = 0; i < incomeIds.length; i += 500) {
          const batch = incomeIds.slice(i, i + 500);
          await supabase
            .from('trade_entries')
            .delete()
            .in('binance_trade_id', batch);
        }
        console.log(`[FullSync] Deleted ${incomeIds.length} existing trades for force re-fetch`);
      } else {
        // Normal deduplication check
        for (let i = 0; i < incomeIds.length; i += 500) {
          const batch = incomeIds.slice(i, i + 500);
          const { data: existing } = await supabase
            .from('trade_entries')
            .select('binance_trade_id')
            .in('binance_trade_id', batch);
          
          existing?.forEach(t => existingIds.add(t.binance_trade_id));
        }
        
        console.log(`[FullSync] Found ${existingIds.size} existing trades (will skip)`);
      }
      
      const newRecords = forceRefetch 
        ? pnlRecords 
        : pnlRecords.filter(r => !existingIds.has(`income_${r.tranId}`));
      
      console.log(`[FullSync] New records to process: ${newRecords.length} (from ${pnlRecords.length} REALIZED_PNL)`);
      
      if (newRecords.length === 0) {
        onProgress?.({
          phase: 'done',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: allIncome.length,
          recordsToInsert: 0,
          enrichedCount: 0,
          percent: 100,
        });
        return { 
          synced: 0, 
          skipped: pnlRecords.length, 
          enriched: 0,
          totalFetched: allIncome.length,
          errors 
        };
      }
      
      // Step 4: Enrich trades with userTrades data (unless skipped)
      let enrichedCount = 0;
      let entries: ReturnType<typeof incomeToTradeEntry>[] = [];
      
      if (!skipEnrichment) {
        onProgress?.({
          phase: 'enriching',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: allIncome.length,
          recordsToInsert: newRecords.length,
          enrichedCount: 0,
          percent: 55,
        });
        
        // Get unique symbols for fetching userTrades
        const symbols = getUniqueSymbolsFromIncome(newRecords);
        const oldestRecord = Math.min(...newRecords.map(r => r.time));
        const newestRecord = Math.max(...newRecords.map(r => r.time));
        
        try {
          const enrichedTrades = await fetchEnrichedTradesForSymbols(
            symbols,
            oldestRecord - (24 * 60 * 60 * 1000), // 1 day buffer before
            newestRecord + (60 * 60 * 1000), // 1 hour buffer after
            allIncome,
            (current, total) => {
              onProgress?.({
                phase: 'enriching',
                chunk: current,
                totalChunks: total,
                page: 0,
                recordsFetched: allIncome.length,
                recordsToInsert: newRecords.length,
                enrichedCount: current,
                percent: 55 + (current / total) * 20,
              });
            }
          );
          
          // Map enriched data to trade entries
          const enrichedByTranId = new Map(
            enrichedTrades.map(t => [t.tranId, t])
          );
          
          entries = newRecords.map(income => {
            const enriched = enrichedByTranId.get(income.tranId);
            if (enriched && enriched.entryPrice > 0) {
              enrichedCount++;
              return enrichedTradeToEntry(enriched, user.id, income.tranId);
            }
            return incomeToTradeEntry(income, user.id);
          });
          
        } catch (enrichError) {
          console.warn('Enrichment failed, using basic data:', enrichError);
          errors.push(`Enrichment: ${enrichError instanceof Error ? enrichError.message : 'Failed'}`);
          entries = newRecords.map(r => incomeToTradeEntry(r, user.id));
        }
      } else {
        // Skip enrichment, use basic data
        entries = newRecords.map(r => incomeToTradeEntry(r, user.id));
      }
      
      // Step 5: Insert new trades in batches
      onProgress?.({
        phase: 'inserting',
        chunk: 0,
        totalChunks: 0,
        page: 0,
        recordsFetched: allIncome.length,
        recordsToInsert: entries.length,
        enrichedCount,
        percent: 80,
      });
      
      let synced = 0;
      const batchSize = 100;
      
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('trade_entries')
          .insert(batch)
          .select('id');
        
        if (error) {
          errors.push(`Insert batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          synced += data?.length || 0;
        }
        
        const insertProgress = 80 + ((i + batch.length) / entries.length) * 20;
        onProgress?.({
          phase: 'inserting',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: allIncome.length,
          recordsToInsert: entries.length,
          enrichedCount,
          percent: insertProgress,
        });
      }
      
      onProgress?.({
        phase: 'done',
        chunk: 0,
        totalChunks: 0,
        page: 0,
        recordsFetched: allIncome.length,
        recordsToInsert: synced,
        enrichedCount,
        percent: 100,
      });
      
      return { 
        synced, 
        skipped: pnlRecords.length - newRecords.length,
        enriched: enrichedCount,
        totalFetched: allIncome.length,
        errors 
      };
    },
    onSuccess: (result) => {
      invalidateTradeQueries(queryClient);
      queryClient.refetchQueries({ queryKey: ['trade-entries-paginated'] });
      
      if (result.synced > 0) {
        const enrichMsg = result.enriched > 0 
          ? ` (${result.enriched} with accurate prices)` 
          : '';
        toast.success(`Sync Complete`, {
          description: `${result.synced} new trades synced${enrichMsg}${result.skipped > 0 ? `, ${result.skipped} already existed` : ''}`,
          duration: 5000,
        });
      } else if (result.skipped > 0) {
        toast.success(`All Synced`, {
          description: `All ${result.skipped} trades are already in your journal`,
          duration: 4000,
        });
      } else {
        toast.info('No Trades Found', {
          description: `No trading history found in your Binance account`,
          duration: 4000,
        });
      }
      
      if (result.errors.length > 0) {
        console.warn('Sync completed with warnings:', result.errors);
      }
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  return {
    syncFullHistory: syncFullHistory.mutateAsync,
    isSyncing: syncFullHistory.isPending,
    lastResult: syncFullHistory.data,
    error: syncFullHistory.error,
    reset: syncFullHistory.reset,
  };
}

/**
 * Check if user has ever done a full sync
 */
export function useHasFullSyncHistory() {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (): Promise<{ hasHistory: boolean; oldestTradeDate: string | null }> => {
      if (!user?.id) {
        return { hasHistory: false, oldestTradeDate: null };
      }
      
      const { data } = await supabase
        .from('trade_entries')
        .select('trade_date')
        .eq('source', 'binance')
        .order('trade_date', { ascending: true })
        .limit(1);
      
      if (data && data.length > 0) {
        return { hasHistory: true, oldestTradeDate: data[0].trade_date };
      }
      
      return { hasHistory: false, oldestTradeDate: null };
    },
  });
}
