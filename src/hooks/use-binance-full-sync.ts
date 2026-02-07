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
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { invalidateTradeQueries } from "@/lib/query-invalidation";
import type { BinanceIncome } from "@/features/binance/types";

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;

// Binance API limit: 3 months (90 days) per request
const CHUNK_DAYS = 90;
const RATE_LIMIT_DELAY = 300; // ms between requests
const RECORDS_PER_PAGE = 1000; // Binance API limit per request

export interface FullSyncProgress {
  phase: 'fetching' | 'filtering' | 'deduplicating' | 'inserting' | 'done';
  chunk: number;
  totalChunks: number;
  page: number;
  recordsFetched: number;
  recordsToInsert: number;
  percent: number;
}

export interface FullSyncOptions {
  monthsBack?: number;
  fetchAll?: boolean; // Fetch unlimited history (up to account creation)
  onProgress?: (progress: FullSyncProgress) => void;
}

export interface FullSyncResult {
  synced: number;
  skipped: number;
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
  const MAX_EMPTY_CHUNKS = 2;
  
  for (let i = 0; i < maxChunks; i++) {
    const endTime = now - (i * chunkMs);
    const startTime = endTime - chunkMs;
    
    // Update progress: fetching phase
    onProgress?.({
      phase: 'fetching',
      chunk: i + 1,
      totalChunks: fetchAll ? Math.max(maxChunks, i + 1) : maxChunks,
      page: 0,
      recordsFetched: allIncome.length,
      recordsToInsert: 0,
      percent: ((i / maxChunks) * 50), // 0-50% for fetching
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
          percent: ((i / maxChunks) * 50) + (page * 0.5), // Progress within chunk
        });
      }
    );
    
    if (chunkErrors.length > 0) {
      errors.push(...chunkErrors.map(e => `Chunk ${i + 1}: ${e}`));
    }
    
    if (chunkRecords.length > 0) {
      allIncome.push(...chunkRecords);
      emptyChunksInRow = 0;
    } else {
      emptyChunksInRow++;
      // If fetchAll and we hit empty chunks, stop early
      if (fetchAll && emptyChunksInRow >= MAX_EMPTY_CHUNKS) {
        break;
      }
    }
    
    completedChunks++;
    
    // Rate limit delay between chunks
    if (i < maxChunks - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
  
  // Deduplicate by tranId
  onProgress?.({
    phase: 'filtering',
    chunk: completedChunks,
    totalChunks: completedChunks,
    page: 0,
    recordsFetched: allIncome.length,
    recordsToInsert: 0,
    percent: 55,
  });
  
  const uniqueMap = new Map<number, BinanceIncome>();
  allIncome.forEach(r => uniqueMap.set(r.tranId, r));
  
  // Sort by time descending (newest first)
  const dedupedIncome = Array.from(uniqueMap.values()).sort((a, b) => b.time - a.time);
  
  return { incomes: dedupedIncome, errors };
}

/**
 * Convert BinanceIncome record to trade_entries format
 */
function incomeToTradeEntry(income: BinanceIncome, userId: string) {
  const result = income.income > 0 ? 'win' : income.income < 0 ? 'loss' : 'breakeven';
  
  return {
    user_id: userId,
    pair: income.symbol,
    direction: 'LONG', // Default, will be enhanced in Phase 2 with userTrades
    entry_price: 0,
    exit_price: 0,
    quantity: 0,
    pnl: income.income,
    realized_pnl: income.income,
    trade_date: new Date(income.time).toISOString(),
    status: 'closed' as const,
    result,
    source: 'binance',
    binance_trade_id: `income_${income.tranId}`,
    notes: `Auto-synced from Binance REALIZED_PNL`,
  };
}

/**
 * Hook for syncing complete Binance history to local database
 */
export function useBinanceFullSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const syncFullHistory = useMutation({
    mutationFn: async (options: FullSyncOptions = {}): Promise<FullSyncResult> => {
      const { monthsBack = 24, fetchAll = false, onProgress } = options;
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Step 1: Fetch all income from Binance (chunked + paginated)
      const { incomes: allIncome, errors } = await fetchChunkedIncomeHistory(
        monthsBack,
        fetchAll,
        onProgress
      );
      
      if (allIncome.length === 0) {
        onProgress?.({
          phase: 'done',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: 0,
          recordsToInsert: 0,
          percent: 100,
        });
        return { synced: 0, skipped: 0, totalFetched: 0, errors };
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
        percent: 60,
      });
      
      if (pnlRecords.length === 0) {
        onProgress?.({
          phase: 'done',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: allIncome.length,
          recordsToInsert: 0,
          percent: 100,
        });
        return { synced: 0, skipped: 0, totalFetched: allIncome.length, errors };
      }
      
      // Step 3: Check for duplicates
      const incomeIds = pnlRecords.map(r => `income_${r.tranId}`);
      
      // Batch check in chunks of 500 (Supabase IN limit)
      const existingIds = new Set<string>();
      for (let i = 0; i < incomeIds.length; i += 500) {
        const batch = incomeIds.slice(i, i + 500);
        const { data: existing } = await supabase
          .from('trade_entries')
          .select('binance_trade_id')
          .in('binance_trade_id', batch);
        
        existing?.forEach(t => existingIds.add(t.binance_trade_id));
      }
      
      const newRecords = pnlRecords.filter(r => !existingIds.has(`income_${r.tranId}`));
      
      onProgress?.({
        phase: 'inserting',
        chunk: 0,
        totalChunks: 0,
        page: 0,
        recordsFetched: allIncome.length,
        recordsToInsert: newRecords.length,
        percent: 70,
      });
      
      if (newRecords.length === 0) {
        onProgress?.({
          phase: 'done',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: allIncome.length,
          recordsToInsert: 0,
          percent: 100,
        });
        return { 
          synced: 0, 
          skipped: pnlRecords.length, 
          totalFetched: allIncome.length,
          errors 
        };
      }
      
      // Step 4: Insert new trades in batches
      const entries = newRecords.map(r => incomeToTradeEntry(r, user.id));
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
        
        // Progress: 70% to 100%
        const insertProgress = 70 + ((i + batch.length) / entries.length) * 30;
        onProgress?.({
          phase: 'inserting',
          chunk: 0,
          totalChunks: 0,
          page: 0,
          recordsFetched: allIncome.length,
          recordsToInsert: newRecords.length,
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
        percent: 100,
      });
      
      return { 
        synced, 
        skipped: pnlRecords.length - newRecords.length,
        totalFetched: allIncome.length,
        errors 
      };
    },
    onSuccess: (result) => {
      invalidateTradeQueries(queryClient);
      
      // Force refetch paginated data to show new trades immediately
      queryClient.refetchQueries({ queryKey: ['trade-entries-paginated'] });
      
      if (result.synced > 0) {
        toast.success(`Sync Complete`, {
          description: `${result.synced} new trades synced from Binance${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''} — Total fetched: ${result.totalFetched}`,
          duration: 5000,
        });
      } else if (result.skipped > 0) {
        toast.success(`All Synced`, {
          description: `All ${result.skipped} trades are already in your journal (${result.totalFetched} records checked)`,
          duration: 4000,
        });
      } else {
        toast.info('No Trades Found', {
          description: `No trading history found in your Binance account (${result.totalFetched} records checked)`,
          duration: 4000,
        });
      }
      
      if (result.errors.length > 0) {
        console.warn('Sync completed with warnings:', result.errors);
        toast.warning('Sync completed with warnings', {
          description: `${result.errors.length} issue(s) encountered. Check console for details.`,
        });
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
      
      // Check for oldest Binance trade
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
