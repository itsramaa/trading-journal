/**
 * useBinanceFullSync - Hook for syncing complete Binance history to local database
 * Supports chunked fetching (3-month intervals) to handle Binance API limits
 * 
 * Features:
 * - Fetches up to 1 year of income history
 * - Progress tracking for UI feedback
 * - Deduplication against existing trades
 * - Batch insert for performance
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { BinanceIncome } from "@/features/binance/types";

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;

// Binance API limit: 3 months (90 days) per request
const CHUNK_DAYS = 90;
const RATE_LIMIT_DELAY = 300; // ms between requests

export interface FullSyncOptions {
  monthsBack?: number;
  fetchAll?: boolean; // Fetch unlimited history (up to account creation)
  onProgress?: (progress: number) => void;
}

export interface FullSyncResult {
  synced: number;
  skipped: number;
  totalFetched: number;
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
 * Fetch income history in 3-month chunks to work around Binance API limits
 * Supports unlimited history fetching with fetchAll option
 */
async function fetchChunkedIncomeHistory(
  monthsBack: number = 24, // Increased default to 2 years
  fetchAll: boolean = false,
  onProgress?: (progress: number) => void
): Promise<{ incomes: BinanceIncome[]; errors: string[] }> {
  const allIncome: BinanceIncome[] = [];
  const errors: string[] = [];
  const now = Date.now();
  const chunkMs = CHUNK_DAYS * 24 * 60 * 60 * 1000;
  
  // Calculate number of chunks needed (or use max chunks for fetchAll)
  const maxChunks = fetchAll ? 40 : Math.ceil((monthsBack * 30) / CHUNK_DAYS); // 40 chunks = ~10 years
  let totalChunks = maxChunks;
  let emptyChunksInRow = 0;
  const MAX_EMPTY_CHUNKS = 2; // Stop after 2 consecutive empty chunks
  
  for (let i = 0; i < maxChunks; i++) {
    const endTime = now - (i * chunkMs);
    const startTime = endTime - chunkMs;
    
    try {
      const result = await callBinanceApi<BinanceIncome[]>('income', {
        startTime,
        endTime,
        limit: 1000,
      });
      
      if (result.success && result.data) {
        if (result.data.length > 0) {
          allIncome.push(...result.data);
          emptyChunksInRow = 0; // Reset counter
        } else {
          emptyChunksInRow++;
          // If fetchAll and we hit empty chunks, stop early
          if (fetchAll && emptyChunksInRow >= MAX_EMPTY_CHUNKS) {
            totalChunks = i + 1;
            break;
          }
        }
      } else if (result.error) {
        errors.push(`Chunk ${i + 1}: ${result.error}`);
        // Stop on error for fetchAll mode
        if (fetchAll) {
          totalChunks = i + 1;
          break;
        }
      }
    } catch (error) {
      errors.push(`Chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (fetchAll) {
        totalChunks = i + 1;
        break;
      }
    }
    
    // Progress update
    onProgress?.(((i + 1) / (fetchAll ? Math.max(totalChunks, i + 1) : totalChunks)) * 100);
    
    // Rate limit delay (only if not last chunk)
    if (i < maxChunks - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
  
  // Deduplicate by tranId
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
    direction: 'LONG', // Default, can be enhanced with position tracking
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
      
      // Step 1: Fetch all income from Binance (chunked)
      const { incomes: allIncome, errors } = await fetchChunkedIncomeHistory(
        monthsBack,
        fetchAll,
        (p) => onProgress?.(p * 0.5) // First 50% is fetching
      );
      
      if (allIncome.length === 0) {
        return { synced: 0, skipped: 0, totalFetched: 0, errors };
      }
      
      // Step 2: Filter to REALIZED_PNL only (trades)
      const pnlRecords = allIncome.filter(r => 
        r.incomeType === 'REALIZED_PNL' && r.income !== 0
      );
      
      if (pnlRecords.length === 0) {
        return { synced: 0, skipped: 0, totalFetched: allIncome.length, errors };
      }
      
      onProgress?.(60);
      
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
      
      onProgress?.(70);
      
      if (newRecords.length === 0) {
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
        onProgress?.(70 + ((i + batch.length) / entries.length) * 30);
      }
      
      return { 
        synced, 
        skipped: pnlRecords.length - newRecords.length,
        totalFetched: allIncome.length,
        errors 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
      queryClient.invalidateQueries({ queryKey: ['trade-entries-paginated'] });
      
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} new trades from Binance`);
      } else if (result.skipped > 0) {
        toast.info(`All ${result.skipped} trades already synced`);
      } else {
        toast.info('No new trades found in Binance history');
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
