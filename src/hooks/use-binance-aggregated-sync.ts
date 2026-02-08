/**
 * Binance Full Sync Hook (Aggregate-First Architecture)
 * 
 * This hook orchestrates the complete sync process:
 * 1. Fetch raw data from Binance APIs
 * 2. Group into position lifecycles
 * 3. Aggregate into trade entries
 * 4. Validate and insert to local DB
 * 5. Reconcile totals
 * 6. Record sync result for monitoring (Phase 5)
 * 
 * Key Principles:
 * - No direct insert of raw Binance data
 * - All data passes through aggregation layer
 * - Validation before every insert
 * - Monitoring integration for health tracking
 * - Checkpoint-based resume capability
 * - Batched inserts with retry logic
 * - Error tolerance (partial success)
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { invalidateTradeQueries } from '@/lib/query-invalidation';
import { useSyncMonitoring } from '@/hooks/use-sync-monitoring';
import { useSyncStore, selectCheckpoint, selectHasResumableSync } from '@/store/sync-store';
import type { SyncRangeDays } from '@/store/sync-store';

import type { BinanceTrade, BinanceOrder, BinanceIncome } from '@/features/binance/types';
import type { RawBinanceData, AggregationProgress, AggregationResult, AggregatedTrade, SyncCheckpoint } from '@/services/binance/types';
import { 
  groupIntoLifecycles,
  aggregateAllLifecycles,
  validateAllTrades,
  calculateReconciliation,
} from '@/services/binance';

// =============================================================================
// Constants
// =============================================================================

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;
const BASE_RATE_LIMIT_DELAY = 500; // Increased for stability
const MAX_TRADES_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days
const MAX_INCOME_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RECORDS_PER_PAGE = 1000;
const DEFAULT_HISTORY_DAYS = 90; // Optimized default
const MAX_PARALLEL_SYMBOLS = 4; // Increased for faster sync (was 2)
const BATCH_INSERT_SIZE = 50; // Trades per DB insert batch
const MAX_INSERT_RETRIES = 3; // Retries per batch

// Rate limit state (shared across calls)
let currentRateLimitDelay = BASE_RATE_LIMIT_DELAY;

// =============================================================================
// API Helper with Rate Limit Handling
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryAfter?: number;
}

async function callBinanceApi<T>(
  action: string,
  params: Record<string, unknown> = {},
  maxRetries = 3
): Promise<ApiResponse<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(BINANCE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify({ action, ...params }),
    });
    
    const result: ApiResponse<T> = await response.json();
    
    // Handle rate limit - wait and retry
    if (response.status === 429 || result.code === 'RATE_LIMITED') {
      const retryAfter = result.retryAfter || 10;
      console.warn(`[BinanceAPI] Rate limited, waiting ${retryAfter}s before retry (attempt ${attempt + 1}/${maxRetries})`);
      
      // Increase delay for future requests
      currentRateLimitDelay = Math.min(currentRateLimitDelay * 1.5, 2000);
      
      await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
      continue;
    }
    
    // Success - gradually reduce delay
    if (result.success) {
      currentRateLimitDelay = Math.max(currentRateLimitDelay * 0.95, BASE_RATE_LIMIT_DELAY);
    }
    
    return result;
  }
  
  return { success: false, error: 'Max retries exceeded due to rate limiting' };
}

/**
 * Get adaptive delay based on current rate limit state
 */
function getAdaptiveDelay(): number {
  return currentRateLimitDelay;
}

// =============================================================================
// Data Fetching Functions
// =============================================================================

/**
 * Fetch all trades for a symbol within time range (handles 7-day limit)
 */
async function fetchTradesForSymbol(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<BinanceTrade[]> {
  const allTrades: BinanceTrade[] = [];
  const numChunks = Math.ceil((endTime - startTime) / MAX_TRADES_INTERVAL_MS);
  
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = startTime + (i * MAX_TRADES_INTERVAL_MS);
    const chunkEnd = Math.min(chunkStart + MAX_TRADES_INTERVAL_MS, endTime);
    
    let fromId: number | undefined = undefined;
    
    while (true) {
      const result = await callBinanceApi<BinanceTrade[]>('trades', {
        symbol,
        startTime: chunkStart,
        endTime: chunkEnd,
        limit: RECORDS_PER_PAGE,
        ...(fromId && { fromId }),
      });
      
      if (!result.success || !result.data?.length) break;
      
      allTrades.push(...result.data);
      
      if (result.data.length < RECORDS_PER_PAGE) break;
      
      fromId = result.data[result.data.length - 1].id + 1;
      await new Promise(r => setTimeout(r, getAdaptiveDelay()));
    }
    
    if (i < numChunks - 1) {
      await new Promise(r => setTimeout(r, getAdaptiveDelay()));
    }
  }
  
  return allTrades;
}

/**
 * Fetch all orders for a symbol within time range (handles 7-day limit)
 */
async function fetchOrdersForSymbol(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<BinanceOrder[]> {
  const allOrders: BinanceOrder[] = [];
  const numChunks = Math.ceil((endTime - startTime) / MAX_TRADES_INTERVAL_MS);
  
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = startTime + (i * MAX_TRADES_INTERVAL_MS);
    const chunkEnd = Math.min(chunkStart + MAX_TRADES_INTERVAL_MS, endTime);
    
    const result = await callBinanceApi<BinanceOrder[]>('all-orders', {
      symbol,
      startTime: chunkStart,
      endTime: chunkEnd,
      limit: RECORDS_PER_PAGE,
    });
    
    if (result.success && result.data) {
      allOrders.push(...result.data);
    }
    
    if (i < numChunks - 1) {
      await new Promise(r => setTimeout(r, getAdaptiveDelay()));
    }
  }
  
  return allOrders;
}

/**
 * Fetch all income records within time range (handles 30-day limit)
 * Uses cursor-based pagination with fromId (tranId) instead of page parameter
 */
async function fetchAllIncome(
  startTime: number,
  endTime: number,
  onProgress?: (fetched: number) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  const numChunks = Math.ceil((endTime - startTime) / MAX_INCOME_INTERVAL_MS);
  const MAX_RECORDS_SAFETY = 20000; // Safety limit to prevent infinite loops
  
  console.log(`[FullSync] Fetching income from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
  console.log(`[FullSync] Time range: ${Math.round((endTime - startTime) / (24 * 60 * 60 * 1000))} days in ${numChunks} chunks`);
  
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = startTime + (i * MAX_INCOME_INTERVAL_MS);
    const chunkEnd = Math.min(chunkStart + MAX_INCOME_INTERVAL_MS, endTime);
    
    console.log(`[FullSync] Chunk ${i + 1}/${numChunks}: ${new Date(chunkStart).toISOString()} - ${new Date(chunkEnd).toISOString()}`);
    
    // Cursor-based pagination within chunk using tranId
    let lastTranId: number | undefined = undefined;
    let chunkRecords = 0;
    
    while (allRecords.length < MAX_RECORDS_SAFETY) {
      const result = await callBinanceApi<BinanceIncome[]>('income', {
        startTime: chunkStart,
        endTime: chunkEnd,
        limit: RECORDS_PER_PAGE,
        ...(lastTranId && { fromId: lastTranId }),
      });
      
      if (!result.success || !result.data?.length) break;
      
      allRecords.push(...result.data);
      chunkRecords += result.data.length;
      onProgress?.(allRecords.length);
      
      // If less than limit, we've got all records for this chunk
      if (result.data.length < RECORDS_PER_PAGE) break;
      
      // Get cursor for next page (tranId of last record + 1)
      const lastRecord = result.data[result.data.length - 1];
      lastTranId = typeof lastRecord.tranId === 'string' 
        ? parseInt(lastRecord.tranId, 10) + 1
        : (lastRecord.tranId as number) + 1;
      
      await new Promise(r => setTimeout(r, getAdaptiveDelay()));
    }
    
    console.log(`[FullSync] Chunk ${i + 1} fetched ${chunkRecords} records`);
    
    if (i < numChunks - 1) {
      await new Promise(r => setTimeout(r, getAdaptiveDelay()));
    }
  }
  
  console.log(`[FullSync] Total income records fetched: ${allRecords.length}`);
  
  return allRecords;
}

/**
 * Validate if a symbol is a proper Binance Futures symbol
 * Valid symbols end with USDT/BUSD and have at least 4 chars (e.g., BTCUSDT, 1000PEPEUSDT)
 */
function isValidFuturesSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  
  // Must be at least 6 chars (BTC + USDT = 7 minimum)
  if (symbol.length < 6) return false;
  
  // Must end with USDT or BUSD (Binance Futures quote assets)
  if (!symbol.endsWith('USDT') && !symbol.endsWith('BUSD')) return false;
  
  // Base asset should be at least 2 chars
  const baseAsset = symbol.replace(/USDT$|BUSD$/, '');
  if (baseAsset.length < 2) return false;
  
  // Must only contain uppercase letters and numbers
  if (!/^[A-Z0-9]+$/.test(symbol)) return false;
  
  return true;
}

/**
 * Get unique symbols from income records with validation
 * OPTIMIZATION: Only return symbols with REALIZED_PNL (not just any income type)
 */
function getUniqueSymbols(income: BinanceIncome[]): string[] {
  const symbols = new Set<string>();
  const invalidSymbols: string[] = [];
  
  for (const record of income) {
    // OPTIMIZATION: Only include symbols with non-zero REALIZED_PNL
    // This reduces API calls by ~50% (skip symbols with only funding/commission)
    if (record.symbol && record.incomeType === 'REALIZED_PNL' && record.income !== 0) {
      if (isValidFuturesSymbol(record.symbol)) {
        symbols.add(record.symbol);
      } else {
        // Log invalid symbols for debugging
        if (!invalidSymbols.includes(record.symbol)) {
          invalidSymbols.push(record.symbol);
          console.warn(`[FullSync] Skipping invalid symbol: "${record.symbol}"`);
        }
      }
    }
  }
  
  if (invalidSymbols.length > 0) {
    console.warn(`[FullSync] Filtered out ${invalidSymbols.length} invalid symbols:`, invalidSymbols);
  }
  
  return Array.from(symbols);
}

// =============================================================================
// Symbol Fetch Result Type
// =============================================================================

interface SymbolFetchResult {
  symbol: string;
  trades: BinanceTrade[];
  orders: BinanceOrder[];
  success: boolean;
  error?: string;
}

// =============================================================================
// Main Sync Hook
// =============================================================================

export interface FullSyncOptions {
  daysToSync?: SyncRangeDays;
  resumeFromCheckpoint?: boolean;
  forceRefetch?: boolean; // Ignore duplicates and re-download all income records
}

export function useBinanceAggregatedSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Global sync store - persistent across navigation
  const {
    fullSyncStatus,
    fullSyncProgress: progress,
    fullSyncResult: result,
    fullSyncError,
    startFullSync,
    updateProgress,
    completeFullSync,
    failFullSync,
    saveCheckpoint,
    clearCheckpoint,
    hasResumableSync,
  } = useSyncStore();
  
  const checkpoint = useSyncStore(selectCheckpoint);
  const canResume = useSyncStore(selectHasResumableSync);
  
  // Phase 5: Monitoring integration
  const { 
    recordSyncSuccess, 
    recordSyncFailure, 
    lastSyncResult,
    lastSyncTimestamp,
    consecutiveFailures,
  } = useSyncMonitoring();
  
  /**
   * Fetch trades for symbols with error tolerance (Promise.allSettled)
   */
  const fetchTradesWithTolerance = useCallback(async (
    symbols: string[],
    startTime: number,
    endTime: number,
    checkpointData: SyncCheckpoint,
    onSymbolComplete: (symbol: string, result: SymbolFetchResult) => void
  ): Promise<{
    allTrades: BinanceTrade[];
    allOrders: BinanceOrder[];
    processedSymbols: string[];
    failedSymbols: Array<{ symbol: string; error: string }>;
  }> => {
    const allTrades: BinanceTrade[] = [];
    const allOrders: BinanceOrder[] = [];
    const processedSymbols: string[] = [...checkpointData.processedSymbols];
    const failedSymbols: Array<{ symbol: string; error: string }> = [...checkpointData.failedSymbols];
    
    // Filter out already processed symbols
    const remainingSymbols = symbols.filter(s => 
      !processedSymbols.includes(s) && !failedSymbols.some(f => f.symbol === s)
    );
    
    // Add trades from checkpoint
    for (const [symbol, trades] of Object.entries(checkpointData.tradesBySymbol)) {
      allTrades.push(...trades);
    }
    for (const [symbol, orders] of Object.entries(checkpointData.ordersBySymbol)) {
      allOrders.push(...orders);
    }
    
    // Process remaining symbols in parallel batches
    for (let batchStart = 0; batchStart < remainingSymbols.length; batchStart += MAX_PARALLEL_SYMBOLS) {
      const batch = remainingSymbols.slice(batchStart, batchStart + MAX_PARALLEL_SYMBOLS);
      
      updateProgress({
        phase: 'fetching-trades',
        current: processedSymbols.length,
        total: symbols.length,
        message: `Fetching ${batch.join(', ')} (${processedSymbols.length + 1}/${symbols.length})...`,
      });
      
      // Use Promise.allSettled for error tolerance
      const batchResults = await Promise.allSettled(
        batch.map(async (symbol): Promise<SymbolFetchResult> => {
          try {
            const [trades, orders] = await Promise.all([
              fetchTradesForSymbol(symbol, startTime, endTime),
              fetchOrdersForSymbol(symbol, startTime, endTime),
            ]);
            return { symbol, trades, orders, success: true };
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[FullSync] Failed to fetch ${symbol}:`, error);
            return { symbol, trades: [], orders: [], success: false, error: errorMsg };
          }
        })
      );
      
      // Process results - continue with successful ones
      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled') {
          const fetchResult = settledResult.value;
          
          if (fetchResult.success) {
            allTrades.push(...fetchResult.trades);
            allOrders.push(...fetchResult.orders);
            processedSymbols.push(fetchResult.symbol);
            
            // Save checkpoint after each successful symbol
            saveCheckpoint({
              currentPhase: 'fetching-trades',
              tradesBySymbol: {
                ...checkpointData.tradesBySymbol,
                [fetchResult.symbol]: fetchResult.trades,
              },
              ordersBySymbol: {
                ...checkpointData.ordersBySymbol,
                [fetchResult.symbol]: fetchResult.orders,
              },
              processedSymbols,
              failedSymbols,
            });
          } else {
            failedSymbols.push({ 
              symbol: fetchResult.symbol, 
              error: fetchResult.error || 'Unknown error' 
            });
          }
          
          onSymbolComplete(fetchResult.symbol, fetchResult);
        } else {
          // Promise rejected (shouldn't happen with our try-catch, but handle it)
          const symbol = batch[batchResults.indexOf(settledResult)];
          failedSymbols.push({ symbol, error: settledResult.reason?.message || 'Promise rejected' });
        }
      }
      
      // Delay between batches
      if (batchStart + MAX_PARALLEL_SYMBOLS < remainingSymbols.length) {
        await new Promise(r => setTimeout(r, getAdaptiveDelay() * 3));
      }
    }
    
    return { allTrades, allOrders, processedSymbols, failedSymbols };
  }, [updateProgress, saveCheckpoint]);
  
  /**
   * Insert trades in batches with retry logic
   */
  const batchInsertTrades = useCallback(async (
    trades: AggregatedTrade[],
    userId: string,
    existingIds: Set<string>
  ): Promise<{
    insertedCount: number;
    failedBatches: Array<{ batch: number; error: string }>;
  }> => {
    const newTrades = trades.filter(t => !existingIds.has(t.binance_trade_id));
    
    if (newTrades.length === 0) {
      return { insertedCount: 0, failedBatches: [] };
    }
    
    let insertedCount = 0;
    const failedBatches: Array<{ batch: number; error: string }> = [];
    const totalBatches = Math.ceil(newTrades.length / BATCH_INSERT_SIZE);
    
    for (let i = 0; i < newTrades.length; i += BATCH_INSERT_SIZE) {
      const batchIndex = Math.floor(i / BATCH_INSERT_SIZE) + 1;
      const batch = newTrades.slice(i, i + BATCH_INSERT_SIZE);
      const dbRows = batch.map(t => mapToDbRow(t, userId));
      
      updateProgress({
        phase: 'inserting',
        current: Math.min(i + BATCH_INSERT_SIZE, newTrades.length),
        total: newTrades.length,
        message: `Saving batch ${batchIndex}/${totalBatches}...`,
      });
      
      // Retry logic per batch
      let retries = MAX_INSERT_RETRIES;
      let success = false;
      
      while (retries > 0 && !success) {
        const { error } = await supabase
          .from('trade_entries')
          .insert(dbRows);
        
        if (!error) {
          success = true;
          insertedCount += batch.length;
          console.log(`[FullSync] Batch ${batchIndex}/${totalBatches} inserted successfully (${batch.length} trades)`);
        } else {
          retries--;
          if (retries > 0) {
            console.warn(`[FullSync] Batch ${batchIndex} failed, retrying (${retries} left)...`, error.message);
            await new Promise(r => setTimeout(r, 1000 * (MAX_INSERT_RETRIES - retries)));
          } else {
            console.error(`[FullSync] Batch ${batchIndex} failed after all retries:`, error.message);
            failedBatches.push({ batch: batchIndex, error: error.message });
          }
        }
      }
    }
    
    return { insertedCount, failedBatches };
  }, [updateProgress]);
  
  const syncMutation = useMutation({
    mutationFn: async (options: FullSyncOptions = {}): Promise<AggregationResult> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const forceRefetch = options.forceRefetch || false;
      
      console.log('[FullSync] Starting aggregated sync with options:', {
        daysToSync: options.daysToSync,
        resumeFromCheckpoint: options.resumeFromCheckpoint,
        forceRefetch,
      });
      
      // Guard: prevent duplicate syncs
      if (fullSyncStatus === 'running') {
        throw new Error('Sync already in progress');
      }
      
      // Check if resuming from checkpoint
      const isResuming = options.resumeFromCheckpoint && checkpoint && canResume;
      
      // Mark sync as started in global store
      startFullSync();
      
      // Handle 'max', 'incremental', or days
      const endTime = Date.now();
      let startTime: number;
      
      if (options.daysToSync === 'max') {
        startTime = new Date('2019-09-01').getTime();
      } else if (options.daysToSync === 'incremental') {
        // Incremental sync: start from last successful sync
        const incrementalStart = useSyncStore.getState().getIncrementalStartTime();
        if (incrementalStart) {
          startTime = incrementalStart;
          console.log(`[FullSync] Incremental sync from ${new Date(startTime).toISOString()}`);
        } else {
          // Fallback to 7 days if no previous sync
          startTime = endTime - (7 * 24 * 60 * 60 * 1000);
          console.log('[FullSync] No previous sync found, falling back to 7 days');
        }
      } else {
        const daysToSync = options.daysToSync || DEFAULT_HISTORY_DAYS;
        startTime = endTime - (daysToSync * 24 * 60 * 60 * 1000);
      }
      
      // Use checkpoint time range if resuming
      if (isResuming && checkpoint) {
        startTime = checkpoint.timeRange.startTime || startTime;
      }
      
      // Track failed symbols and partial success
      let failedSymbols: Array<{ symbol: string; error: string }> = [];
      let income: BinanceIncome[] = [];
      let symbols: string[] = [];
      
      // =======================================================================
      // Phase 1: Fetch Income Records (or use checkpoint)
      // =======================================================================
      if (isResuming && checkpoint?.incomeData) {
        console.log('[FullSync] Resuming with cached income data');
        income = checkpoint.incomeData;
        symbols = checkpoint.allSymbols;
      } else {
        updateProgress({
          phase: 'fetching-income',
          current: 0,
          total: 100,
          message: 'Fetching income records from Binance...',
        });
        
        income = await fetchAllIncome(startTime, endTime, (fetched) => {
          updateProgress({
            phase: 'fetching-income',
            current: Math.min(fetched, 10000),
            total: 10000,
            message: `Fetched ${fetched} income records...`,
          });
        });
        
        console.log(`[FullSync] Fetched ${income.length} income records`);
        
        // Log breakdown of income types for debugging
        const incomeTypeBreakdown = income.reduce((acc, r) => {
          acc[r.incomeType] = (acc[r.incomeType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[FullSync] Income breakdown by type:', incomeTypeBreakdown);
        
        // Count REALIZED_PNL with tradeId for accuracy tracking
        const realizedPnlRecords = income.filter(i => i.incomeType === 'REALIZED_PNL');
        const withTradeId = realizedPnlRecords.filter(i => i.tradeId !== null && i.tradeId !== '');
        const nonZeroPnl = realizedPnlRecords.filter(i => i.income !== 0);
        console.log(`[FullSync] REALIZED_PNL: ${realizedPnlRecords.length} total, ${withTradeId.length} with tradeId, ${nonZeroPnl.length} non-zero`);
        
        // Get unique symbols from income (OPTIMIZED: only symbols with non-zero REALIZED_PNL)
        symbols = getUniqueSymbols(income);
        console.log(`[FullSync] Found ${symbols.length} unique symbols with trades (filtered from ${new Set(income.map(i => i.symbol)).size} total)`);
        
        // Save checkpoint after income fetch
        saveCheckpoint({
          currentPhase: 'fetching-trades',
          incomeData: income,
          allSymbols: symbols,
          timeRange: { startTime, endTime },
        });
      }
      
      if (symbols.length === 0) {
        clearCheckpoint();
        return {
          success: true,
          trades: [],
          stats: {
            totalLifecycles: 0,
            completeLifecycles: 0,
            incompleteLifecycles: 0,
            validTrades: 0,
            invalidTrades: 0,
            warningTrades: 0,
          },
          failures: [],
          reconciliation: {
            binanceTotalPnl: 0,
            aggregatedTotalPnl: 0,
            matchedIncomePnl: 0,
            unmatchedIncomePnl: 0,
            difference: 0,
            differencePercent: 0,
            isReconciled: true,
            incompletePositionsNote: '',
          },
          partialSuccess: {
            insertedCount: 0,
            failedBatches: [],
            failedSymbols: [],
            skippedDueToError: 0,
          },
        };
      }
      
      // =======================================================================
      // Phase 2: Fetch Trades for Each Symbol (with error tolerance)
      // =======================================================================
      // Determine syncRangeDays for checkpoint (convert 'incremental' to number)
      const syncRangeDaysForCheckpoint: number | 'max' = 
        options.daysToSync === 'incremental' 
          ? 7 
          : (options.daysToSync || DEFAULT_HISTORY_DAYS);
      
      const checkpointData: SyncCheckpoint = isResuming && checkpoint ? checkpoint : {
        currentPhase: 'fetching-trades',
        incomeData: income,
        tradesBySymbol: {},
        ordersBySymbol: {},
        processedSymbols: [],
        failedSymbols: [],
        allSymbols: symbols,
        syncStartTime: Date.now(),
        syncRangeDays: syncRangeDaysForCheckpoint,
        lastCheckpointTime: Date.now(),
        timeRange: { startTime, endTime },
      };
      
      const { 
        allTrades, 
        allOrders, 
        processedSymbols, 
        failedSymbols: fetchFailedSymbols 
      } = await fetchTradesWithTolerance(
        symbols,
        startTime,
        endTime,
        checkpointData,
        (symbol, result) => {
          if (!result.success) {
            console.warn(`[FullSync] Symbol ${symbol} failed, continuing with others...`);
          }
        }
      );
      
      failedSymbols = fetchFailedSymbols;
      
      console.log(`[FullSync] Fetched ${allTrades.length} trades, ${allOrders.length} orders`);
      console.log(`[FullSync] Processed ${processedSymbols.length}/${symbols.length} symbols, ${failedSymbols.length} failed`);
      
      // =======================================================================
      // Phase 3: Group into Lifecycles
      // =======================================================================
      updateProgress({
        phase: 'grouping',
        current: 0,
        total: 100,
        message: 'Grouping trades into position lifecycles...',
      });
      
      saveCheckpoint({ currentPhase: 'grouping' });
      
      const rawData: RawBinanceData = {
        trades: allTrades,
        orders: allOrders,
        income,
        fetchedAt: new Date(),
        periodStart: startTime,
        periodEnd: endTime,
        symbols: processedSymbols,
      };
      
      const lifecycles = groupIntoLifecycles(rawData);
      console.log(`[FullSync] Created ${lifecycles.length} lifecycles`);
      
      // =======================================================================
      // Phase 4: Aggregate Lifecycles
      // =======================================================================
      updateProgress({
        phase: 'aggregating',
        current: 0,
        total: lifecycles.length,
        message: 'Aggregating position data...',
      });
      
      saveCheckpoint({ currentPhase: 'aggregating' });
      
      const { trades: aggregatedTrades, failures } = aggregateAllLifecycles(
        lifecycles,
        (current, total) => {
          updateProgress({
            phase: 'aggregating',
            current,
            total,
            message: `Aggregating trade ${current}/${total}...`,
          });
        }
      );
      
      console.log(`[FullSync] Aggregated ${aggregatedTrades.length} trades, ${failures.length} failures`);
      
      // =======================================================================
      // Phase 5: Validate
      // =======================================================================
      updateProgress({
        phase: 'validating',
        current: 0,
        total: aggregatedTrades.length,
        message: 'Validating trade data...',
      });
      
      const validationResult = validateAllTrades(aggregatedTrades);
      console.log(`[FullSync] Validation: ${validationResult.valid.length} valid, ${validationResult.invalid.length} invalid`);
      
      // =======================================================================
      // Phase 6: Insert Valid Trades to DB (batched with retry)
      // =======================================================================
      const tradesToInsert = validationResult.valid;
      let insertResult = { insertedCount: 0, failedBatches: [] as Array<{ batch: number; error: string }> };
      
      if (tradesToInsert.length > 0) {
        saveCheckpoint({ currentPhase: 'inserting' });
        
        // Check for existing trades to avoid duplicates (or delete if forceRefetch)
        const binanceTradeIds = tradesToInsert.map(t => t.binance_trade_id);
        let existingIds = new Set<string>();
        
        if (forceRefetch) {
          console.log('[FullSync] Force re-fetch enabled - deleting existing trades first');
          
          // Delete existing trades in batches
          for (let i = 0; i < binanceTradeIds.length; i += 500) {
            const batch = binanceTradeIds.slice(i, i + 500);
            await supabase
              .from('trade_entries')
              .delete()
              .eq('user_id', user.id)
              .in('binance_trade_id', batch);
          }
          
          console.log(`[FullSync] Deleted ${binanceTradeIds.length} existing trades for force re-fetch`);
        } else {
          const { data: existingTrades } = await supabase
            .from('trade_entries')
            .select('binance_trade_id')
            .eq('user_id', user.id)
            .eq('source', 'binance')
            .in('binance_trade_id', binanceTradeIds);
          
          existingIds = new Set(existingTrades?.map(t => t.binance_trade_id) || []);
          console.log(`[FullSync] Found ${existingIds.size} existing trades (will skip)`);
        }
        
        // Batched insert with retry
        insertResult = await batchInsertTrades(tradesToInsert, user.id, existingIds);
        
        console.log(`[FullSync] Inserted ${insertResult.insertedCount} new trades, ${insertResult.failedBatches.length} batches failed`);
      }
      
      // =======================================================================
      // Phase 7: Calculate Reconciliation + Enhanced Summary Logging
      // =======================================================================
      const reconciliation = calculateReconciliation(tradesToInsert, income);
      
      // ENHANCED SYNC SUMMARY (Phase 3 of optimization plan)
      const realizedPnlRecords = income.filter(i => i.incomeType === 'REALIZED_PNL');
      const nonZeroPnl = realizedPnlRecords.filter(i => i.income !== 0).length;
      const commissionRecords = income.filter(i => i.incomeType === 'COMMISSION').length;
      const fundingRecords = income.filter(i => i.incomeType === 'FUNDING_FEE').length;
      
      const matchRate = nonZeroPnl > 0 
        ? ((aggregatedTrades.length / nonZeroPnl) * 100).toFixed(1)
        : '100';
      
      const syncQuality = parseFloat(matchRate) >= 95 ? 'Excellent' 
        : parseFloat(matchRate) >= 80 ? 'Good'
        : parseFloat(matchRate) >= 60 ? 'Fair' 
        : 'Poor';
      
      console.log('[FullSync] ========== SYNC SUMMARY ==========');
      console.log(`[FullSync] Total Income Records: ${income.length}`);
      console.log(`[FullSync]   - REALIZED_PNL: ${realizedPnlRecords.length} (non-zero: ${nonZeroPnl})`);
      console.log(`[FullSync]   - COMMISSION: ${commissionRecords}`);
      console.log(`[FullSync]   - FUNDING_FEE: ${fundingRecords}`);
      console.log(`[FullSync] Symbols Processed: ${processedSymbols.length}/${symbols.length}`);
      console.log(`[FullSync] Lifecycles Created: ${lifecycles.length}`);
      console.log(`[FullSync]   - Complete: ${lifecycles.filter(l => l.isComplete).length}`);
      console.log(`[FullSync]   - Incomplete: ${lifecycles.filter(l => !l.isComplete).length}`);
      console.log(`[FullSync] Trades Aggregated: ${aggregatedTrades.length}`);
      console.log(`[FullSync] Trades Inserted: ${insertResult.insertedCount}`);
      console.log(`[FullSync] Match Rate: ${matchRate}% (${syncQuality})`);
      console.log(`[FullSync] P&L Reconciliation: ${reconciliation.isReconciled ? '✓ OK' : '⚠ DIFF'} (${reconciliation.differencePercent.toFixed(3)}%)`);
      console.log(`[FullSync]   - Aggregated: $${reconciliation.aggregatedTotalPnl.toFixed(2)}`);
      console.log(`[FullSync]   - Binance Total: $${reconciliation.binanceTotalPnl.toFixed(2)}`);
      console.log(`[FullSync]   - Unmatched (open positions): $${reconciliation.unmatchedIncomePnl.toFixed(2)}`);
      console.log('[FullSync] ====================================');
      
      // Clear checkpoint on success
      clearCheckpoint();
      
      // Store sync quality in result for use in onSuccess
      const syncQualityTyped = syncQuality as 'Excellent' | 'Good' | 'Fair' | 'Poor';
      const matchRateNum = parseFloat(matchRate);
      
      return {
        success: true,
        trades: tradesToInsert,
        stats: {
          totalLifecycles: lifecycles.length,
          completeLifecycles: lifecycles.filter(l => l.isComplete).length,
          incompleteLifecycles: lifecycles.filter(l => !l.isComplete).length,
          validTrades: validationResult.valid.length,
          invalidTrades: validationResult.invalid.length,
          warningTrades: validationResult.withWarnings.length,
        },
        failures,
        reconciliation,
        partialSuccess: {
          insertedCount: insertResult.insertedCount,
          failedBatches: insertResult.failedBatches,
          failedSymbols,
          skippedDueToError: failedSymbols.length,
        },
        // Internal metadata for sync quality (not in type, accessed via _meta)
        _syncMeta: {
          syncQuality: syncQualityTyped,
          matchRate: matchRateNum,
        },
      };
    },
    onSuccess: (successResult) => {
      invalidateTradeQueries(queryClient);
      
      // Extract sync quality from result metadata
      const meta = (successResult as any)._syncMeta;
      const syncQuality = meta?.syncQuality || 'Fair';
      const matchRate = meta?.matchRate || 0;
      
      // Update global store with result
      completeFullSync(successResult, syncQuality, matchRate);
      
      // Phase 5: Record success for monitoring
      recordSyncSuccess(successResult);
      
      // Build success message
      const { partialSuccess } = successResult;
      const hasPartialFailures = partialSuccess && (
        partialSuccess.failedSymbols.length > 0 || 
        partialSuccess.failedBatches.length > 0
      );
      
      if (hasPartialFailures) {
        toast.warning(
          `Synced ${successResult.stats.validTrades} trades. ` +
          `${partialSuccess.failedSymbols.length} symbols failed. ` +
          `PnL diff: ${successResult.reconciliation.differencePercent.toFixed(2)}%`
        );
      } else if (successResult.reconciliation.isReconciled) {
        toast.success(
          `Synced ${successResult.stats.validTrades} trades successfully. ` +
          `PnL reconciled within 0.1% tolerance.`
        );
      } else {
        toast.warning(
          `Synced ${successResult.stats.validTrades} trades. ` +
          `Warning: PnL differs by ${successResult.reconciliation.differencePercent.toFixed(2)}%`
        );
      }
    },
    onError: (error) => {
      // Update global store with error (checkpoint is preserved for resume)
      failFullSync(error.message);
      
      // Phase 5: Record failure for monitoring
      recordSyncFailure(error);
      
      toast.error(`Sync failed: ${error.message}. You can try to resume.`);
    },
  });
  
  /**
   * Resume sync from last checkpoint
   */
  const resumeSync = useCallback(() => {
    if (!canResume || !checkpoint) {
      toast.error('No resumable sync found');
      return;
    }
    
    syncMutation.mutate({
      daysToSync: checkpoint.syncRangeDays,
      resumeFromCheckpoint: true,
    });
  }, [canResume, checkpoint, syncMutation]);
  
  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    resumeSync,
    canResume,
    clearCheckpoint,
    isLoading: fullSyncStatus === 'running',
    progress,
    error: fullSyncError ? new Error(fullSyncError) : syncMutation.error,
    result,
    // Phase 5: Monitoring data
    monitoring: {
      lastSyncResult,
      lastSyncTimestamp,
      consecutiveFailures,
    },
  };
}

/**
 * Map aggregated trade to database row format
 */
function mapToDbRow(trade: AggregatedTrade, userId: string) {
  return {
    user_id: userId,
    pair: trade.pair,
    direction: trade.direction,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price,
    quantity: trade.quantity,
    realized_pnl: trade.realized_pnl,
    pnl: trade.pnl,
    fees: trade.fees,
    commission: trade.commission,
    commission_asset: trade.commission_asset,
    funding_fees: trade.funding_fees,
    entry_datetime: trade.entry_datetime.toISOString(),
    exit_datetime: trade.exit_datetime.toISOString(),
    trade_date: trade.trade_date.toISOString(),
    hold_time_minutes: trade.hold_time_minutes,
    leverage: trade.leverage,
    margin_type: trade.margin_type,
    is_maker: trade.is_maker,
    entry_order_type: trade.entry_order_type,
    exit_order_type: trade.exit_order_type,
    result: trade.result,
    status: trade.status,
    source: trade.source as 'binance',
    binance_trade_id: trade.binance_trade_id,
    binance_order_id: trade.binance_order_id,
  } as const;
}
