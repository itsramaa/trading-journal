/**
 * useBinanceAutoSync - Hook for auto-syncing Binance income records to local database
 * Handles: Periodic sync, duplicate detection, background sync on mount
 */
import { useEffect, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useBinanceIncomeHistory, useBinanceConnectionStatus, BinanceIncome } from "@/features/binance";

export interface AutoSyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

export interface AutoSyncOptions {
  /** Auto-sync on mount */
  autoSyncOnMount?: boolean;
  /** Sync interval in milliseconds (default: 5 minutes) */
  syncInterval?: number;
  /** Enable periodic sync */
  enablePeriodicSync?: boolean;
  /** Income types to sync (default: ['REALIZED_PNL']) */
  incomeTypes?: string[];
  /** Days of history to sync (default: 7) */
  daysToSync?: number;
}

/**
 * Convert BinanceIncome record to trade_entries format
 */
function incomeToTradeEntry(income: BinanceIncome, userId: string) {
  // Determine result based on income value
  const result = income.income > 0 ? 'win' : income.income < 0 ? 'loss' : 'breakeven';
  
  // For REALIZED_PNL, we can infer direction from the position
  // Positive income = closed in profit, negative = closed in loss
  // We default to LONG but this can be enhanced with position tracking
  const direction = 'LONG'; // Default, can be enhanced

  return {
    user_id: userId,
    pair: income.symbol,
    direction,
    entry_price: 0, // Not available from income endpoint
    exit_price: 0, // Not available from income endpoint
    quantity: 0, // Not available from income endpoint
    pnl: income.income,
    realized_pnl: income.income,
    trade_date: new Date(income.time).toISOString(),
    status: 'closed' as const,
    result,
    source: 'binance',
    binance_trade_id: `income_${income.tranId}`,
    notes: `Auto-synced from Binance ${income.incomeType}`,
  };
}

/**
 * Hook to auto-sync Binance income records to local database
 */
export function useBinanceAutoSync(options: AutoSyncOptions = {}) {
  const {
    autoSyncOnMount = false,
    syncInterval = 5 * 60 * 1000, // 5 minutes
    enablePeriodicSync = false,
    incomeTypes = ['REALIZED_PNL'],
    daysToSync = 7,
  } = options;

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  // Calculate start time based on daysToSync
  const startTime = Date.now() - (daysToSync * 24 * 60 * 60 * 1000);

  // Fetch income history for syncing
  const { data: incomeData, refetch: refetchIncome } = useBinanceIncomeHistory(
    incomeTypes.length === 1 ? incomeTypes[0] : undefined,
    startTime,
    1000
  );

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (): Promise<AutoSyncResult> => {
      if (!user?.id || !incomeData || incomeData.length === 0) {
        return { synced: 0, skipped: 0, errors: 0 };
      }

      setIsSyncing(true);

      try {
        // Filter to only REALIZED_PNL if multiple types requested
        let recordsToSync = incomeData;
        if (incomeTypes.length > 1) {
          recordsToSync = incomeData.filter((r: BinanceIncome) => 
            incomeTypes.includes(r.incomeType)
          );
        }

        // Filter out zero-value income
        recordsToSync = recordsToSync.filter((r: BinanceIncome) => r.income !== 0);

        if (recordsToSync.length === 0) {
          return { synced: 0, skipped: 0, errors: 0 };
        }

        // Get existing binance_trade_ids to filter duplicates
        const incomeIds = recordsToSync.map((r: BinanceIncome) => `income_${r.tranId}`);
        const { data: existingTrades } = await supabase
          .from("trade_entries")
          .select("binance_trade_id")
          .in("binance_trade_id", incomeIds);

        const existingIds = new Set(existingTrades?.map(t => t.binance_trade_id) || []);
        const newRecords = recordsToSync.filter(
          (r: BinanceIncome) => !existingIds.has(`income_${r.tranId}`)
        );

        if (newRecords.length === 0) {
          return { synced: 0, skipped: recordsToSync.length, errors: 0 };
        }

        // Convert to trade entries
        const tradeEntries = newRecords.map((r: BinanceIncome) => 
          incomeToTradeEntry(r, user.id)
        );

        // Batch insert
        const { data: inserted, error } = await supabase
          .from("trade_entries")
          .insert(tradeEntries)
          .select();

        if (error) {
          console.error("Auto-sync insert error:", error);
          throw error;
        }

        return {
          synced: inserted?.length || 0,
          skipped: recordsToSync.length - newRecords.length,
          errors: 0,
        };
      } finally {
        setIsSyncing(false);
      }
    },
    onSuccess: (result) => {
      setLastSyncTime(new Date());
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      
      if (result.synced > 0) {
        toast.success(`Auto-synced ${result.synced} trades from Binance`);
      }
    },
    onError: (error) => {
      console.error("Auto-sync failed:", error);
      toast.error("Failed to auto-sync Binance trades");
    },
  });

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (!isConnected || isSyncing) return;
    
    // Refetch fresh income data first
    await refetchIncome();
    
    // Then sync
    return syncMutation.mutateAsync();
  }, [isConnected, isSyncing, refetchIncome, syncMutation]);

  // Auto-sync on mount
  useEffect(() => {
    if (autoSyncOnMount && isConnected && incomeData && !isSyncing) {
      syncMutation.mutate();
    }
  }, [autoSyncOnMount, isConnected, incomeData?.length]); // eslint-disable-line

  // Periodic sync
  useEffect(() => {
    if (!enablePeriodicSync || !isConnected) return;

    const intervalId = setInterval(() => {
      if (!isSyncing) {
        syncNow();
      }
    }, syncInterval);

    return () => clearInterval(intervalId);
  }, [enablePeriodicSync, isConnected, syncInterval, isSyncing, syncNow]);

  return {
    syncNow,
    isSyncing: isSyncing || syncMutation.isPending,
    lastSyncTime,
    lastResult: syncMutation.data,
    isConnected,
    pendingRecords: incomeData?.filter((r: BinanceIncome) => r.income !== 0).length || 0,
  };
}

/**
 * Hook for one-time sync with status
 */
export function useSyncBinanceIncome() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incomeRecords: BinanceIncome[]): Promise<AutoSyncResult> => {
      if (!user?.id) throw new Error("User not authenticated");

      // Filter out zero-value and non-PNL records
      const validRecords = incomeRecords.filter(
        r => r.income !== 0 && r.incomeType === 'REALIZED_PNL'
      );

      if (validRecords.length === 0) {
        return { synced: 0, skipped: incomeRecords.length, errors: 0 };
      }

      // Check for existing
      const incomeIds = validRecords.map(r => `income_${r.tranId}`);
      const { data: existing } = await supabase
        .from("trade_entries")
        .select("binance_trade_id")
        .in("binance_trade_id", incomeIds);

      const existingIds = new Set(existing?.map(t => t.binance_trade_id) || []);
      const newRecords = validRecords.filter(r => !existingIds.has(`income_${r.tranId}`));

      if (newRecords.length === 0) {
        return { synced: 0, skipped: validRecords.length, errors: 0 };
      }

      // Insert
      const entries = newRecords.map(r => incomeToTradeEntry(r, user.id));
      const { data: inserted, error } = await supabase
        .from("trade_entries")
        .insert(entries)
        .select();

      if (error) throw error;

      return {
        synced: inserted?.length || 0,
        skipped: validRecords.length - newRecords.length,
        errors: 0,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} trades to journal`);
      } else if (result.skipped > 0) {
        toast.info(`All ${result.skipped} trades already synced`);
      }
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}
