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
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { invalidateTradeQueries } from '@/lib/query-invalidation';
import { useSyncMonitoring } from '@/hooks/use-sync-monitoring';

import type { BinanceTrade, BinanceOrder, BinanceIncome } from '@/features/binance/types';
import type { RawBinanceData, AggregationProgress, AggregationResult, AggregatedTrade } from '@/services/binance/types';
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
const RATE_LIMIT_DELAY = 300;
const MAX_TRADES_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days
const MAX_INCOME_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RECORDS_PER_PAGE = 1000;
const MAX_HISTORY_DAYS = 730; // 2 years

// =============================================================================
// API Helper
// =============================================================================

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
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
    
    if (i < numChunks - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
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
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
  
  return allOrders;
}

/**
 * Fetch all income records within time range (handles 90-day limit)
 */
async function fetchAllIncome(
  startTime: number,
  endTime: number,
  onProgress?: (fetched: number) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  const numChunks = Math.ceil((endTime - startTime) / MAX_INCOME_INTERVAL_MS);
  
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = startTime + (i * MAX_INCOME_INTERVAL_MS);
    const chunkEnd = Math.min(chunkStart + MAX_INCOME_INTERVAL_MS, endTime);
    
    let page = 1;
    
    while (true) {
      const result = await callBinanceApi<BinanceIncome[]>('income', {
        startTime: chunkStart,
        endTime: chunkEnd,
        limit: RECORDS_PER_PAGE,
        page,
      });
      
      if (!result.success || !result.data?.length) break;
      
      allRecords.push(...result.data);
      onProgress?.(allRecords.length);
      
      if (result.data.length < RECORDS_PER_PAGE) break;
      
      page++;
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
    
    if (i < numChunks - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
  
  return allRecords;
}

/**
 * Get unique symbols from income records
 */
function getUniqueSymbols(income: BinanceIncome[]): string[] {
  const symbols = new Set<string>();
  for (const record of income) {
    if (record.symbol) {
      symbols.add(record.symbol);
    }
  }
  return Array.from(symbols);
}

// =============================================================================
// Main Sync Hook
// =============================================================================

export interface FullSyncOptions {
  daysToSync?: number;
}

export function useBinanceAggregatedSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<AggregationProgress | null>(null);
  
  // Phase 5: Monitoring integration
  const { 
    recordSyncSuccess, 
    recordSyncFailure, 
    scheduleRetry,
    lastSyncResult,
    lastSyncTimestamp,
    consecutiveFailures,
  } = useSyncMonitoring();
  
  const syncMutation = useMutation({
    mutationFn: async (options: FullSyncOptions = {}): Promise<AggregationResult> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const daysToSync = options.daysToSync || MAX_HISTORY_DAYS;
      const endTime = Date.now();
      const startTime = endTime - (daysToSync * 24 * 60 * 60 * 1000);
      
      // =======================================================================
      // Phase 1: Fetch Income Records
      // =======================================================================
      setProgress({
        phase: 'fetching-income',
        current: 0,
        total: 100,
        message: 'Fetching income records from Binance...',
      });
      
      const income = await fetchAllIncome(startTime, endTime, (fetched) => {
        setProgress(prev => prev ? {
          ...prev,
          current: Math.min(fetched, 10000),
          message: `Fetched ${fetched} income records...`,
        } : null);
      });
      
      console.log(`[FullSync] Fetched ${income.length} income records`);
      
      // Get unique symbols from income
      const symbols = getUniqueSymbols(income);
      console.log(`[FullSync] Found ${symbols.length} unique symbols`);
      
      if (symbols.length === 0) {
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
            difference: 0,
            differencePercent: 0,
            isReconciled: true,
          },
        };
      }
      
      // =======================================================================
      // Phase 2: Fetch Trades for Each Symbol
      // =======================================================================
      const allTrades: BinanceTrade[] = [];
      const allOrders: BinanceOrder[] = [];
      
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        
        setProgress({
          phase: 'fetching-trades',
          current: i + 1,
          total: symbols.length,
          message: `Fetching trades for ${symbol} (${i + 1}/${symbols.length})...`,
        });
        
        const trades = await fetchTradesForSymbol(symbol, startTime, endTime);
        allTrades.push(...trades);
        
        const orders = await fetchOrdersForSymbol(symbol, startTime, endTime);
        allOrders.push(...orders);
        
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
      }
      
      console.log(`[FullSync] Fetched ${allTrades.length} trades, ${allOrders.length} orders`);
      
      // =======================================================================
      // Phase 3: Group into Lifecycles
      // =======================================================================
      setProgress({
        phase: 'grouping',
        current: 0,
        total: 100,
        message: 'Grouping trades into position lifecycles...',
      });
      
      const rawData: RawBinanceData = {
        trades: allTrades,
        orders: allOrders,
        income,
        fetchedAt: new Date(),
        periodStart: startTime,
        periodEnd: endTime,
        symbols,
      };
      
      const lifecycles = groupIntoLifecycles(rawData);
      console.log(`[FullSync] Created ${lifecycles.length} lifecycles`);
      
      // =======================================================================
      // Phase 4: Aggregate Lifecycles
      // =======================================================================
      setProgress({
        phase: 'aggregating',
        current: 0,
        total: lifecycles.length,
        message: 'Aggregating position data...',
      });
      
      const { trades: aggregatedTrades, failures } = aggregateAllLifecycles(
        lifecycles,
        (current, total) => {
          setProgress(prev => prev ? {
            ...prev,
            current,
            total,
            message: `Aggregating trade ${current}/${total}...`,
          } : null);
        }
      );
      
      console.log(`[FullSync] Aggregated ${aggregatedTrades.length} trades, ${failures.length} failures`);
      
      // =======================================================================
      // Phase 5: Validate
      // =======================================================================
      setProgress({
        phase: 'validating',
        current: 0,
        total: aggregatedTrades.length,
        message: 'Validating trade data...',
      });
      
      const validationResult = validateAllTrades(aggregatedTrades);
      console.log(`[FullSync] Validation: ${validationResult.valid.length} valid, ${validationResult.invalid.length} invalid`);
      
      // =======================================================================
      // Phase 6: Insert Valid Trades to DB
      // =======================================================================
      const tradesToInsert = validationResult.valid;
      
      if (tradesToInsert.length > 0) {
        // Check for existing trades to avoid duplicates
        const binanceTradeIds = tradesToInsert.map(t => t.binance_trade_id);
        
        const { data: existingTrades } = await supabase
          .from('trade_entries')
          .select('binance_trade_id')
          .eq('user_id', user.id)
          .eq('source', 'binance')
          .in('binance_trade_id', binanceTradeIds);
        
        const existingIds = new Set(existingTrades?.map(t => t.binance_trade_id) || []);
        const newTrades = tradesToInsert.filter(t => !existingIds.has(t.binance_trade_id));
        
        if (newTrades.length > 0) {
          const dbRows = newTrades.map(t => mapToDbRow(t, user.id));
          
          const { error: insertError } = await supabase
            .from('trade_entries')
            .insert(dbRows);
          
          if (insertError) {
            throw new Error(`Failed to insert trades: ${insertError.message}`);
          }
          
          console.log(`[FullSync] Inserted ${newTrades.length} new trades`);
        }
      }
      
      // =======================================================================
      // Phase 7: Calculate Reconciliation
      // =======================================================================
      const reconciliation = calculateReconciliation(tradesToInsert, income);
      
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
      };
    },
    onSuccess: (result) => {
      invalidateTradeQueries(queryClient);
      setProgress(null);
      
      // Phase 5: Record success for monitoring
      recordSyncSuccess(result);
      
      if (result.reconciliation.isReconciled) {
        toast.success(
          `Synced ${result.stats.validTrades} trades successfully. ` +
          `PnL reconciled within 0.1% tolerance.`
        );
      } else {
        toast.warning(
          `Synced ${result.stats.validTrades} trades. ` +
          `Warning: PnL differs by ${result.reconciliation.differencePercent.toFixed(2)}%`
        );
      }
    },
    onError: (error) => {
      setProgress(null);
      
      // Phase 5: Record failure for monitoring and schedule retry
      const failures = recordSyncFailure(error);
      
      toast.error(`Sync failed: ${error.message}`);
    },
  });
  
  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    isLoading: syncMutation.isPending,
    progress,
    error: syncMutation.error,
    result: syncMutation.data,
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
