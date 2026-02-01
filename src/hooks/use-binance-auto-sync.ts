/**
 * useBinanceAutoSync - Hook for auto-syncing Binance income records to local database
 * Handles: Periodic sync, duplicate detection, background sync on mount
 * 
 * IMPORTANT: Only syncs REALIZED_PNL as trades. Other income types (COMMISSION, 
 * FUNDING_FEE, TRANSFER, etc.) are NOT trades and should be displayed separately
 * in the Financial Summary component.
 */
import { useEffect, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useBinanceAllIncome, useBinanceConnectionStatus, BinanceIncome } from "@/features/binance";

/**
 * CRITICAL: Only REALIZED_PNL represents actual trade P&L.
 * Other types are costs/income that should NOT be synced as trades.
 * 
 * - COMMISSION → Trading fee (cost)
 * - FUNDING_FEE → Funding rate payment (cost/income)
 * - TRANSFER → Deposit/Withdrawal (capital flow)
 * - COMMISSION_REBATE → Fee rebate (income)
 */
const TRADE_INCOME_TYPES = ['REALIZED_PNL'] as const;

export interface AutoSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  byType: Record<string, number>;
}

export interface AutoSyncOptions {
  /** Auto-sync on mount */
  autoSyncOnMount?: boolean;
  /** Sync interval in milliseconds (default: 5 minutes) */
  syncInterval?: number;
  /** Enable periodic sync */
  enablePeriodicSync?: boolean;
  /** Days of history to sync (default: 7) */
  daysToSync?: number;
}

/**
 * Enrich PNL records with matching fee data from COMMISSION records
 * Matches by symbol and timestamp (within 1 minute window)
 */
function enrichWithFees(
  pnlRecords: BinanceIncome[],
  allIncome: BinanceIncome[]
): Map<number, number> {
  const feeMap = new Map<number, number>();
  
  const commissions = allIncome.filter(r => r.incomeType === 'COMMISSION');
  
  for (const pnl of pnlRecords) {
    // Find commissions within 1 minute of the PNL record for same symbol
    const matchingFees = commissions.filter(c => 
      c.symbol === pnl.symbol && 
      Math.abs(c.time - pnl.time) < 60000 // 1 minute window
    );
    
    // Sum up all matching fees (absolute value since fees are negative in income)
    const totalFee = matchingFees.reduce((sum, c) => sum + Math.abs(c.income), 0);
    if (totalFee > 0) {
      feeMap.set(pnl.tranId, totalFee);
    }
  }
  
  return feeMap;
}

/**
 * Convert BinanceIncome record to trade_entries format
 * Only REALIZED_PNL records become trades, other types are tracked but not as separate entries
 */
function incomeToTradeEntry(income: BinanceIncome, userId: string, fee?: number) {
  // Determine result based on income value
  const result = income.income > 0 ? 'win' : income.income < 0 ? 'loss' : 'breakeven';
  
  // Default direction (can be enhanced with position tracking)
  const direction = 'LONG';

  return {
    user_id: userId,
    pair: income.symbol,
    direction,
    entry_price: 0,
    exit_price: 0,
    quantity: 0,
    pnl: income.income,
    realized_pnl: income.income,
    commission: fee || 0, // Include matched fee if available
    commission_asset: fee && fee > 0 ? 'USDT' : null,
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
    daysToSync = 30, // Increased from 7 to 30 days for better coverage
  } = options;

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  // Fetch ALL income types for comprehensive sync
  const { data: incomeData, refetch: refetchIncome } = useBinanceAllIncome(daysToSync, 1000);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (): Promise<AutoSyncResult> => {
      if (!user?.id || !incomeData || incomeData.length === 0) {
        return { synced: 0, skipped: 0, errors: 0, byType: {} };
      }

      setIsSyncing(true);

      try {
        // CRITICAL: Only sync REALIZED_PNL as trades
        // Other income types (COMMISSION, FUNDING_FEE, etc.) are NOT trades
        const filteredByType = incomeData.filter((r: BinanceIncome) => 
          TRADE_INCOME_TYPES.includes(r.incomeType as typeof TRADE_INCOME_TYPES[number])
        );

        // Filter out zero-value income
        const recordsToSync = filteredByType.filter((r: BinanceIncome) => r.income !== 0);

        if (recordsToSync.length === 0) {
          return { synced: 0, skipped: 0, errors: 0, byType: {} };
        }

        // Track by type for reporting
        const byType: Record<string, number> = {};
        recordsToSync.forEach((r: BinanceIncome) => {
          byType[r.incomeType] = (byType[r.incomeType] || 0) + 1;
        });

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
          return { synced: 0, skipped: recordsToSync.length, errors: 0, byType };
        }

        // Only sync REALIZED_PNL as trade entries (other types are for display only)
        const pnlRecords = newRecords.filter((r: BinanceIncome) => r.incomeType === 'REALIZED_PNL');
        
        if (pnlRecords.length === 0) {
          return { synced: 0, skipped: recordsToSync.length, errors: 0, byType };
        }

        // Enrich PNL records with fee data from COMMISSION records
        const feeMap = enrichWithFees(pnlRecords, incomeData);

        // Convert to trade entries with fee enrichment
        const tradeEntries = pnlRecords.map((r: BinanceIncome) => 
          incomeToTradeEntry(r, user.id, feeMap.get(r.tranId))
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
          byType,
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
        return { synced: 0, skipped: incomeRecords.length, errors: 0, byType: {} };
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
        return { synced: 0, skipped: validRecords.length, errors: 0, byType: { REALIZED_PNL: validRecords.length } };
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
        byType: { REALIZED_PNL: inserted?.length || 0 },
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
