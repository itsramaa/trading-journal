import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { BacktestConfig, BacktestResult, BacktestMetrics, BacktestTrade, EquityCurvePoint } from "@/types/backtest";

interface BacktestResultRow {
  id: string;
  user_id: string;
  strategy_id: string;
  pair: string;
  period_start: string;
  period_end: string;
  initial_capital: number;
  final_capital: number;
  metrics: unknown;
  trades: unknown;
  equity_curve: unknown;
  created_at: string;
}

// Run backtest via edge function
export function useRunBacktest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: BacktestConfig): Promise<BacktestResult> => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke('backtest-strategy', {
        body: config,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data as BacktestResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backtest-history"] });
      toast.success(`Backtest completed: ${data.metrics.totalReturn.toFixed(2)}% return`);
    },
    onError: (error) => {
      toast.error(`Backtest failed: ${error.message}`);
    },
  });
}

// Get backtest history with strategy names joined
export function useBacktestHistory(strategyId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["backtest-history", user?.id, strategyId],
    queryFn: async (): Promise<BacktestResult[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("backtest_results")
        .select(`
          *,
          trading_strategies (
            name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (strategyId) {
        query = query.eq("strategy_id", strategyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to BacktestResult type with strategy name
      return (data || []).map((row: BacktestResultRow & { trading_strategies?: { name: string } | null }) => ({
        id: row.id,
        strategyId: row.strategy_id,
        strategyName: row.trading_strategies?.name || 'Unknown Strategy',
        pair: row.pair,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        initialCapital: row.initial_capital,
        finalCapital: row.final_capital,
        metrics: row.metrics as BacktestMetrics,
        trades: row.trades as BacktestTrade[],
        equityCurve: row.equity_curve as EquityCurvePoint[],
        createdAt: row.created_at,
      }));
    },
    enabled: !!user?.id,
  });
}

// Delete backtest result
export function useDeleteBacktestResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("backtest_results")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backtest-history"] });
      toast.success("Backtest result deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
