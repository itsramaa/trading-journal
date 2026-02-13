/**
 * Server-side Trade Stats Hook
 * 
 * Fetches aggregated trade statistics directly from database.
 * This provides accurate totals regardless of pagination state.
 * 
 * Returns:
 * - total_pnl_gross: P&L before fees (realized_pnl sum)
 * - total_pnl_net: P&L after fees (realized_pnl - commission - funding)
 * - win_rate: Percentage of winning trades
 * - total_trades: Total count matching filters
 */
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTradeMode } from "@/hooks/use-trade-mode";
import type { TradeFilters } from "./use-trade-entries-paginated";

export interface TradeStats {
  totalTrades: number;
  totalPnlGross: number;  // Before fees (realized_pnl)
  totalPnlNet: number;    // After fees
  totalFees: number;
  totalCommission: number;
  totalFundingFees: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  avgPnlPerTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export interface UseTradeStatsOptions {
  filters?: TradeFilters;
  enabled?: boolean;
  /** Override trade mode filter (uses active mode from useTradeMode if not set) */
  tradeMode?: 'paper' | 'live' | null;
  /** Filter stats to a specific trading account */
  accountId?: string;
}

export function useTradeStats(options: UseTradeStatsOptions = {}) {
  const { user } = useAuth();
  const { tradeMode: globalTradeMode } = useTradeMode();
  const { filters, enabled = true, tradeMode: overrideMode, accountId } = options;
  
  // Use override if provided, otherwise use filter's tradeMode, otherwise use global mode
  const effectiveMode = overrideMode !== undefined 
    ? overrideMode 
    : (filters?.tradeMode ?? globalTradeMode);

  return useQuery({
    queryKey: ["trade-stats", user?.id, filters, effectiveMode, accountId],
    queryFn: async (): Promise<TradeStats> => {
      if (!user?.id) {
        return getEmptyStats();
      }

      // Build source filter - handle both include and exclude
      let sourceParam: string | null = null;
      if (filters?.source) {
        sourceParam = filters.source;
      }
      // Note: excludeSource would need a DB function update to support
      // For now, we handle it by not passing source (gets all) and filtering client-side
      // or we need to update the RPC function

      // Call the database function
      const { data, error } = await supabase.rpc('get_trade_stats', {
        p_user_id: user.id,
        p_status: filters?.status === 'all' ? null : (filters?.status || 'closed'),
        p_start_date: filters?.startDate || null,
        p_end_date: filters?.endDate || null,
        p_source: sourceParam,
        p_pairs: filters?.pairs?.length ? filters.pairs : null,
        p_directions: filters?.direction ? [filters.direction] : null,
        p_strategy_ids: filters?.strategyIds?.length ? filters.strategyIds : null,
        p_sessions: filters?.session && filters.session !== 'all' ? [filters.session] : null,
        p_trade_mode: effectiveMode || null,
        p_account_id: accountId || null,
      });

      if (error) {
        console.error('[useTradeStats] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return getEmptyStats();
      }

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
    staleTime: 30_000, // 30 seconds
    placeholderData: keepPreviousData,
  });
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

/**
 * Hook for quick summary stats display
 */
export function useTradeStatsSummary(filters?: TradeFilters) {
  const { data: stats, isLoading, error } = useTradeStats({ filters });

  return {
    isLoading,
    error,
    totalTrades: stats?.totalTrades ?? 0,
    totalPnlGross: stats?.totalPnlGross ?? 0,
    totalPnlNet: stats?.totalPnlNet ?? 0,
    winRate: stats?.winRate ?? 0,
    profitFactor: stats?.profitFactor ?? 0,
    stats,
  };
}
