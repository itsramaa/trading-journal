import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type RealtimeTable = 
  | "accounts"
  | "account_transactions"
  | "trading_sessions"
  | "trade_entries"
  | "trading_strategies";

interface UseRealtimeOptions {
  tables: RealtimeTable[];
  enabled?: boolean;
}

/**
 * Hook to subscribe to realtime updates for specified tables
 * Automatically invalidates relevant React Query caches on changes
 */
export function useRealtime({ tables, enabled = true }: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user?.id || tables.length === 0) return;

    const channel = supabase.channel(`realtime-${user.id}`);

    // Subscribe to each table
    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(`[Realtime] ${table} changed:`, payload.eventType);
          
          // Invalidate related queries based on table
          switch (table) {
            case "accounts":
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
              queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
              queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
              break;
            case "account_transactions":
              queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
              break;
            case "trading_sessions":
              queryClient.invalidateQueries({ queryKey: ["trading-sessions"] });
              break;
            case "trade_entries":
              queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
              queryClient.invalidateQueries({ queryKey: ["trading-sessions"] });
              break;
            case "trading_strategies":
              queryClient.invalidateQueries({ queryKey: ["trading-strategies"] });
              break;
            default:
              break;
          }
        }
      );
    });

    channel.subscribe((status) => {
      console.log(`[Realtime] Channel status: ${status}`);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, tables, queryClient]);
}

/**
 * Hook to subscribe to all account-related realtime updates
 */
export function useAccountsRealtime(enabled = true) {
  useRealtime({
    tables: ["accounts", "account_transactions"],
    enabled,
  });
}

/**
 * Hook to subscribe to all trading-related realtime updates
 */
export function useTradingRealtime(enabled = true) {
  useRealtime({
    tables: [
      "trading_sessions",
      "trade_entries",
      "trading_strategies",
      "accounts",
    ],
    enabled,
  });
}
