/**
 * Per-Account Analytics Hook
 * 
 * Fetches trade stats for a specific trading account using the
 * extended get_trade_stats RPC (with p_account_id).
 * Provides full metrics: PnL, win rate, profit factor, etc.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { TradeStats } from "../trading/use-trade-stats";

export interface UseAccountAnalyticsOptions {
  /** Account ID to filter by. Pass null/undefined to fetch all accounts (e.g. Binance virtual). */
  accountId?: string | null;
  status?: string;
  tradeMode?: 'paper' | 'live' | null;
  enabled?: boolean;
}

function getEmptyStats(): TradeStats {
  return {
    totalTrades: 0,
    totalPnlGross: 0,
    totalPnlNet: 0,
    totalFees: 0,
    totalCommission: 0,
    totalFundingFees: 0,
    winCount: 0,
    lossCount: 0,
    breakevenCount: 0,
    winRate: 0,
    avgPnlPerTrade: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
  };
}

export function useAccountAnalytics(options: UseAccountAnalyticsOptions) {
  const { user } = useAuth();
  const { accountId = null, status = 'closed', tradeMode, enabled = true } = options;

  return useQuery({
    queryKey: ["account-analytics", user?.id, accountId, status, tradeMode],
    queryFn: async (): Promise<TradeStats> => {
      if (!user?.id) return getEmptyStats();

      const { data, error } = await supabase.rpc('get_trade_stats', {
        p_user_id: user.id,
        p_status: status === 'all' ? null : status,
        p_account_id: accountId || undefined,
        p_trade_mode: tradeMode || null,
      });

      if (error) {
        console.error('[useAccountAnalytics] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) return getEmptyStats();

      const row = data[0];
      return {
        totalTrades: Number(row.total_trades) || 0,
        totalPnlGross: Number(row.total_pnl_gross) || 0,
        totalPnlNet: Number(row.total_pnl_net) || 0,
        totalFees: Number(row.total_fees) || 0,
        totalCommission: Number(row.total_commission) || 0,
        totalFundingFees: Number(row.total_funding_fees) || 0,
        winCount: Number(row.win_count) || 0,
        lossCount: Number(row.loss_count) || 0,
        breakevenCount: Number(row.breakeven_count) || 0,
        winRate: Number(row.win_rate) || 0,
        avgPnlPerTrade: Number(row.avg_pnl_per_trade) || 0,
        avgWin: Number(row.avg_win) || 0,
        avgLoss: Number(row.avg_loss) || 0,
        profitFactor: Number(row.profit_factor) || 0,
      };
    },
    enabled: !!user?.id && enabled,
    staleTime: 30_000,
  });
}
