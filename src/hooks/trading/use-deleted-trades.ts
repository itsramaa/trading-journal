/**
 * Hook for managing soft-deleted trades
 * Fetches trades deleted within the last 30 days for potential restoration
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { invalidateTradeQueries } from "@/lib/query-invalidation";
import type { TradeEntry } from "./use-trade-entries";

export interface DeletedTrade extends TradeEntry {
  deleted_at: string;
}

/**
 * Fetch soft-deleted trades within the last 30 days
 * These trades can still be restored
 */
export function useDeletedTrades() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deleted-trades", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Calculate 30 days ago
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Use raw SQL via RPC since the function isn't in generated types yet
      const { data: trades, error } = await supabase
        .rpc('get_deleted_trades' as any, { 
          p_user_id: user.id,
          p_since: thirtyDaysAgo 
        });

      if (error) {
        console.error("Failed to fetch deleted trades:", error);
        throw error;
      }

      return (trades || []) as DeletedTrade[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Get count of restorable trades
 */
export function useDeletedTradesCount() {
  const { data: trades, isLoading } = useDeletedTrades();
  return {
    count: trades?.length ?? 0,
    isLoading,
  };
}

/**
 * Restore a soft-deleted trade using RPC function
 */
export function useRestoreDeletedTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tradeId: string) => {
      const { data, error } = await supabase
        .rpc('restore_trade_entry' as any, { p_trade_id: tradeId });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTradeQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["deleted-trades"] });
      toast.success("Trade restored successfully");
    },
    onError: (error) => {
      toast.error(`Failed to restore trade: ${error.message}`);
    },
  });
}
