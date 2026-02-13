/**
 * Binance Incremental Sync Hook
 * 
 * Provides periodic auto-sync based on last sync timestamp.
 * Only fetches new trades since last successful sync.
 * 
 * Features:
 * - Tracks last sync timestamp in localStorage
 * - Auto-sync on mount (if stale)
 * - Manual trigger option
 * - Lightweight sync for recent trades only
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { invalidateTradeQueries } from '@/lib/query-invalidation';

import type { BinanceTrade, BinanceIncome } from '@/features/binance/types';
import type { RawBinanceData, AggregatedTrade } from '@/services/binance/types';
import { 
  groupIntoLifecycles,
  aggregateAllLifecycles,
  validateAllTrades,
} from '@/services/binance';

// =============================================================================
// Constants
// =============================================================================

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;
const STORAGE_KEY = 'binance_last_sync_timestamp';
const SYNC_LOCK_KEY = 'binance_incremental_sync_lock';
const LOCK_STALE_MS = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
const DEFAULT_LOOKBACK_DAYS = 7;
const RATE_LIMIT_DELAY = 200;
const RECORDS_PER_PAGE = 1000;

// =============================================================================
// Types
// =============================================================================

export interface IncrementalSyncProgress {
  phase: 'fetching' | 'processing' | 'inserting';
  message: string;
  newTradesFound: number;
}

export interface IncrementalSyncResult {
  success: boolean;
  newTrades: number;
  skippedDuplicates: number;
  lastSyncTime: Date;
}

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
// Storage Helpers
// =============================================================================

function getLastSyncTime(): Date | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  const ts = parseInt(stored, 10);
  return isNaN(ts) ? null : new Date(ts);
}

function setLastSyncTime(time: Date) {
  localStorage.setItem(STORAGE_KEY, time.getTime().toString());
}

function isSyncStale(): boolean {
  const lastSync = getLastSyncTime();
  if (!lastSync) return true;
  return Date.now() - lastSync.getTime() > STALE_THRESHOLD_MS;
}

// =============================================================================
// Cross-Tab Sync Lock
// =============================================================================

function acquireSyncLock(): boolean {
  const existing = localStorage.getItem(SYNC_LOCK_KEY);
  if (existing) {
    const lockTime = parseInt(existing, 10);
    if (!isNaN(lockTime) && Date.now() - lockTime < LOCK_STALE_MS) return false;
  }
  localStorage.setItem(SYNC_LOCK_KEY, Date.now().toString());
  return true;
}

function releaseSyncLock() {
  localStorage.removeItem(SYNC_LOCK_KEY);
}

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchRecentIncome(startTime: number, endTime: number): Promise<BinanceIncome[]> {
  const result = await callBinanceApi<BinanceIncome[]>('income', {
    startTime,
    endTime,
    limit: RECORDS_PER_PAGE,
  });
  
  return result.success ? (result.data || []) : [];
}

async function fetchRecentTrades(
  symbol: string, 
  startTime: number, 
  endTime: number
): Promise<BinanceTrade[]> {
  const result = await callBinanceApi<BinanceTrade[]>('trades', {
    symbol,
    startTime,
    endTime,
    limit: RECORDS_PER_PAGE,
  });
  
  return result.success ? (result.data || []) : [];
}

function getUniqueSymbols(income: BinanceIncome[]): string[] {
  const symbols = new Set<string>();
  for (const record of income) {
    if (record.symbol) symbols.add(record.symbol);
  }
  return Array.from(symbols);
}

// =============================================================================
// Main Hook
// =============================================================================

export function useBinanceIncrementalSync(options: {
  autoSyncOnMount?: boolean;
  autoSyncIntervalMs?: number;
} = {}) {
  const { autoSyncOnMount = true, autoSyncIntervalMs } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<IncrementalSyncProgress | null>(null);
  const [lastSyncTime, setLastSyncTimeState] = useState<Date | null>(getLastSyncTime);

  const syncMutation = useMutation({
    mutationFn: async (): Promise<IncrementalSyncResult> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Cross-tab lock: prevent multiple tabs from syncing simultaneously
      if (!acquireSyncLock()) {
        console.log('[IncrementalSync] Sync locked by another tab, skipping');
        return { success: true, newTrades: 0, skippedDuplicates: 0, lastSyncTime: new Date() };
      }

      const now = Date.now();
      const lastSync = getLastSyncTime();
      const startTime = lastSync 
        ? lastSync.getTime() 
        : now - (DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      
      // =======================================================================
      // Phase 1: Fetch Recent Income
      // =======================================================================
      setProgress({
        phase: 'fetching',
        message: 'Checking for new trades...',
        newTradesFound: 0,
      });

      const income = await fetchRecentIncome(startTime, now);
      
      if (income.length === 0) {
        const syncTime = new Date(now);
        setLastSyncTime(syncTime);
        return {
          success: true,
          newTrades: 0,
          skippedDuplicates: 0,
          lastSyncTime: syncTime,
        };
      }

      // =======================================================================
      // Phase 2: Fetch Trades for Symbols
      // =======================================================================
      const symbols = getUniqueSymbols(income);
      const allTrades: BinanceTrade[] = [];

      for (const symbol of symbols) {
        setProgress({
          phase: 'fetching',
          message: `Fetching ${symbol}...`,
          newTradesFound: allTrades.length,
        });

        const trades = await fetchRecentTrades(symbol, startTime, now);
        allTrades.push(...trades);
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
      }

      // =======================================================================
      // Phase 3: Process through Aggregation Layer
      // =======================================================================
      setProgress({
        phase: 'processing',
        message: 'Processing trades...',
        newTradesFound: allTrades.length,
      });

      const rawData: RawBinanceData = {
        trades: allTrades,
        orders: [],
        income,
        fetchedAt: new Date(),
        periodStart: startTime,
        periodEnd: now,
        symbols,
      };

      const lifecycles = groupIntoLifecycles(rawData);
      const completeLifecycles = lifecycles.filter(l => l.isComplete);
      
      if (completeLifecycles.length === 0) {
        const syncTime = new Date(now);
        setLastSyncTime(syncTime);
        return {
          success: true,
          newTrades: 0,
          skippedDuplicates: 0,
          lastSyncTime: syncTime,
        };
      }

      const { trades: aggregatedTrades } = aggregateAllLifecycles(completeLifecycles);
      const { valid: validTrades } = validateAllTrades(aggregatedTrades);

      // =======================================================================
      // Phase 4: Insert New Trades (Deduplicated)
      // =======================================================================
      setProgress({
        phase: 'inserting',
        message: `Saving ${validTrades.length} trades...`,
        newTradesFound: validTrades.length,
      });

      const binanceTradeIds = validTrades.map(t => t.binance_trade_id);
      
      const { data: existingTrades } = await supabase
        .from('trade_entries')
        .select('binance_trade_id')
        .eq('user_id', user.id)
        .eq('source', 'binance')
        .in('binance_trade_id', binanceTradeIds);

      const existingIds = new Set(existingTrades?.map(t => t.binance_trade_id) || []);
      const newTrades = validTrades.filter(t => !existingIds.has(t.binance_trade_id));

      if (newTrades.length > 0) {
        const dbRows = newTrades.map(t => mapToDbRow(t, user.id));
        
        const { error: insertError } = await supabase
          .from('trade_entries')
          .insert(dbRows);

        if (insertError) {
          throw new Error(`Failed to insert: ${insertError.message}`);
        }
      }

      const syncTime = new Date(now);
      setLastSyncTime(syncTime);

      return {
        success: true,
        newTrades: newTrades.length,
        skippedDuplicates: validTrades.length - newTrades.length,
        lastSyncTime: syncTime,
      };
    },
    onSuccess: (result) => {
      releaseSyncLock();
      setProgress(null);
      setLastSyncTimeState(result.lastSyncTime);
      invalidateTradeQueries(queryClient);

      if (result.newTrades > 0) {
        toast.success(`Synced ${result.newTrades} new trades`);
      }
    },
    onError: (error) => {
      releaseSyncLock();
      setProgress(null);
      console.error('[IncrementalSync] Error:', error);
    },
  });

  // Auto-sync on mount if stale
  useEffect(() => {
    if (autoSyncOnMount && user?.id && isSyncStale()) {
      syncMutation.mutate();
    }
  }, [user?.id, autoSyncOnMount]);

  // Periodic auto-sync
  useEffect(() => {
    if (!autoSyncIntervalMs || !user?.id) return;

    const interval = setInterval(() => {
      if (!syncMutation.isPending && isSyncStale()) {
        syncMutation.mutate();
      }
    }, autoSyncIntervalMs);

    return () => clearInterval(interval);
  }, [autoSyncIntervalMs, user?.id, syncMutation.isPending]);

  const triggerSync = useCallback(() => {
    if (!syncMutation.isPending) {
      syncMutation.mutate();
    }
  }, [syncMutation]);

  return {
    sync: triggerSync,
    isLoading: syncMutation.isPending,
    progress,
    lastSyncTime,
    isStale: isSyncStale(),
    error: syncMutation.error,
    result: syncMutation.data,
  };
}

// =============================================================================
// Helpers
// =============================================================================

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
    source: 'binance' as const,
    binance_trade_id: trade.binance_trade_id,
    binance_order_id: trade.binance_order_id,
  };
}
