/**
 * Per-Exchange Analytics Hook
 * 
 * Groups account-level stats by exchange field.
 * Uses get_account_level_stats RPC to fetch all accounts at once,
 * then aggregates by exchange.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface ExchangeStats {
  exchange: string;
  accountCount: number;
  totalTrades: number;
  totalPnlGross: number;
  totalPnlNet: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgPnlPerTrade: number;
  profitFactor: number;
}

export interface AccountLevelStats {
  accountId: string;
  accountName: string;
  exchange: string;
  totalTrades: number;
  totalPnlGross: number;
  totalPnlNet: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgPnlPerTrade: number;
  profitFactor: number;
}

export interface UseExchangeAnalyticsOptions {
  status?: string;
  tradeMode?: 'paper' | 'live' | null;
  enabled?: boolean;
}

export function useAccountLevelStats(options: UseExchangeAnalyticsOptions = {}) {
  const { user } = useAuth();
  const { status = 'closed', tradeMode, enabled = true } = options;

  return useQuery({
    queryKey: ["account-level-stats", user?.id, status, tradeMode],
    queryFn: async (): Promise<AccountLevelStats[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_account_level_stats', {
        p_user_id: user.id,
        p_status: status === 'all' ? null : status,
        p_trade_mode: tradeMode || null,
      });

      if (error) {
        console.error('[useAccountLevelStats] Error:', error);
        throw error;
      }

      if (!data) return [];

      return data.map((row: Record<string, unknown>) => ({
        accountId: String(row.account_id),
        accountName: String(row.account_name),
        exchange: String(row.account_exchange || 'manual'),
        totalTrades: Number(row.total_trades) || 0,
        totalPnlGross: Number(row.total_pnl_gross) || 0,
        totalPnlNet: Number(row.total_pnl_net) || 0,
        winCount: Number(row.win_count) || 0,
        lossCount: Number(row.loss_count) || 0,
        winRate: Number(row.win_rate) || 0,
        avgPnlPerTrade: Number(row.avg_pnl_per_trade) || 0,
        profitFactor: Number(row.profit_factor) || 0,
      }));
    },
    enabled: !!user?.id && enabled,
    staleTime: 30_000,
  });
}

/**
 * Aggregates account-level stats by exchange
 */
export function useExchangeAnalytics(options: UseExchangeAnalyticsOptions = {}) {
  const { data: accountStats, isLoading, error } = useAccountLevelStats(options);

  const exchangeStats: ExchangeStats[] = [];

  if (accountStats && accountStats.length > 0) {
    const grouped = new Map<string, AccountLevelStats[]>();

    for (const stat of accountStats) {
      const key = stat.exchange;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(stat);
    }

    for (const [exchange, accounts] of grouped) {
      const totalTrades = accounts.reduce((s, a) => s + a.totalTrades, 0);
      const totalPnlGross = accounts.reduce((s, a) => s + a.totalPnlGross, 0);
      const totalPnlNet = accounts.reduce((s, a) => s + a.totalPnlNet, 0);
      const winCount = accounts.reduce((s, a) => s + a.winCount, 0);
      const lossCount = accounts.reduce((s, a) => s + a.lossCount, 0);
      const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
      const avgPnlPerTrade = totalTrades > 0 ? totalPnlNet / totalTrades : 0;

      // Recalculate profit factor from aggregated wins/losses
      const sumWins = accounts.reduce((s, a) => {
        return s + (a.totalPnlGross > 0 ? a.totalPnlGross : 0);
      }, 0);
      // For proper profit factor we'd need raw win/loss sums, approximate from account data
      const sumLosses = Math.abs(accounts.reduce((s, a) => {
        return s + (a.totalPnlGross < 0 ? a.totalPnlGross : 0);
      }, 0));
      const profitFactor = sumLosses > 0 ? sumWins / sumLosses : (sumWins > 0 ? 999.99 : 0);

      exchangeStats.push({
        exchange,
        accountCount: accounts.length,
        totalTrades,
        totalPnlGross,
        totalPnlNet,
        winCount,
        lossCount,
        winRate,
        avgPnlPerTrade,
        profitFactor,
      });
    }

    exchangeStats.sort((a, b) => b.totalPnlNet - a.totalPnlNet);
  }

  return { data: exchangeStats, accountStats, isLoading, error };
}
