/**
 * Balance Snapshots Hook
 * Track historical balance for accounts and generate equity curves
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BalanceSnapshot {
  id: string;
  account_id: string | null;
  user_id: string;
  snapshot_date: string;
  balance: number;
  unrealized_pnl: number;
  realized_pnl_today: number;
  source: 'binance' | 'manual' | 'paper';
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface EquityCurvePoint {
  date: string;
  balance: number;
  pnl: number;
}

// Query keys
export const balanceSnapshotKeys = {
  all: ['balance-snapshots'] as const,
  byAccount: (accountId: string) => [...balanceSnapshotKeys.all, 'account', accountId] as const,
  byDateRange: (startDate: string, endDate: string) => 
    [...balanceSnapshotKeys.all, 'range', startDate, endDate] as const,
};

/**
 * Get balance snapshots for a specific account
 */
export function useAccountBalanceSnapshots(accountId: string | null, days: number = 30) {
  return useQuery({
    queryKey: accountId ? balanceSnapshotKeys.byAccount(accountId) : ['balance-snapshots-empty'],
    queryFn: async () => {
      if (!accountId) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('account_balance_snapshots')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return data as BalanceSnapshot[];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get all balance snapshots for a user within a date range
 */
export function useAllBalanceSnapshots(days: number = 30) {
  return useQuery({
    queryKey: balanceSnapshotKeys.all,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('account_balance_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return data as BalanceSnapshot[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Capture a balance snapshot
 */
export function useCaptureBalanceSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      balance,
      unrealizedPnl = 0,
      realizedPnlToday = 0,
      source = 'manual',
      metadata,
    }: {
      accountId: string | null;
      balance: number;
      unrealizedPnl?: number;
      realizedPnlToday?: number;
      source?: 'binance' | 'manual' | 'paper';
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Upsert - update if exists for today, insert if not
      const { data, error } = await supabase
        .from('account_balance_snapshots')
        .upsert({
          account_id: accountId,
          user_id: user.id,
          snapshot_date: today,
          balance,
          unrealized_pnl: unrealizedPnl,
          realized_pnl_today: realizedPnlToday,
          source,
          metadata: metadata || null,
        }, {
          onConflict: 'account_id,snapshot_date',
        })
        .select()
        .single();

      if (error) throw error;
      return data as BalanceSnapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: balanceSnapshotKeys.all });
    },
  });
}

/**
 * Build equity curve from snapshots
 */
export function useEquityCurve(accountId: string | null, days: number = 30): EquityCurvePoint[] {
  const { data: snapshots } = useAccountBalanceSnapshots(accountId, days);

  if (!snapshots || snapshots.length === 0) {
    return [];
  }

  return snapshots.map((snapshot) => ({
    date: snapshot.snapshot_date,
    balance: Number(snapshot.balance),
    pnl: Number(snapshot.realized_pnl_today),
  }));
}

/**
 * Calculate growth metrics from snapshots
 */
export function useBalanceGrowthMetrics(accountId: string | null, days: number = 30) {
  const { data: snapshots } = useAccountBalanceSnapshots(accountId, days);

  if (!snapshots || snapshots.length < 2) {
    return {
      startBalance: 0,
      endBalance: 0,
      absoluteGrowth: 0,
      percentGrowth: 0,
      highestBalance: 0,
      lowestBalance: 0,
      maxDrawdown: 0,
    };
  }

  const startBalance = Number(snapshots[0].balance);
  const endBalance = Number(snapshots[snapshots.length - 1].balance);
  const absoluteGrowth = endBalance - startBalance;
  const percentGrowth = startBalance > 0 ? (absoluteGrowth / startBalance) * 100 : 0;

  // Calculate high/low
  const balances = snapshots.map(s => Number(s.balance));
  const highestBalance = Math.max(...balances);
  const lowestBalance = Math.min(...balances);

  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = balances[0];
  for (const balance of balances) {
    if (balance > peak) {
      peak = balance;
    }
    const drawdown = ((peak - balance) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    startBalance,
    endBalance,
    absoluteGrowth,
    percentGrowth,
    highestBalance,
    lowestBalance,
    maxDrawdown,
  };
}
