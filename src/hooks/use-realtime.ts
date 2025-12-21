import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type RealtimeTable = 
  | "accounts"
  | "account_transactions"
  | "portfolios"
  | "holdings"
  | "portfolio_transactions"
  | "assets"
  | "budget_categories"
  | "financial_goals"
  | "debts"
  | "trading_sessions"
  | "trade_entries"
  | "trading_strategies"
  | "account_links";

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
              queryClient.invalidateQueries({ queryKey: ["emergency-fund"] });
              break;
            case "account_transactions":
              queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
              queryClient.invalidateQueries({ queryKey: ["budget-categories"] });
              break;
            case "portfolios":
              queryClient.invalidateQueries({ queryKey: ["portfolios"] });
              break;
            case "holdings":
              queryClient.invalidateQueries({ queryKey: ["holdings"] });
              queryClient.invalidateQueries({ queryKey: ["portfolios"] });
              break;
            case "portfolio_transactions":
              queryClient.invalidateQueries({ queryKey: ["transactions"] });
              queryClient.invalidateQueries({ queryKey: ["holdings"] });
              break;
            case "assets":
              queryClient.invalidateQueries({ queryKey: ["assets"] });
              queryClient.invalidateQueries({ queryKey: ["holdings"] });
              break;
            case "budget_categories":
              queryClient.invalidateQueries({ queryKey: ["budget-categories"] });
              break;
            case "financial_goals":
              queryClient.invalidateQueries({ queryKey: ["financial-goals"] });
              break;
            case "debts":
              queryClient.invalidateQueries({ queryKey: ["debts"] });
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
            case "account_links":
              queryClient.invalidateQueries({ queryKey: ["account-links"] });
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
    tables: ["accounts", "account_transactions", "account_links"],
    enabled,
  });
}

/**
 * Hook to subscribe to all portfolio-related realtime updates
 */
export function usePortfolioRealtime(enabled = true) {
  useRealtime({
    tables: ["portfolios", "holdings", "portfolio_transactions", "assets"],
    enabled,
  });
}

/**
 * Hook to subscribe to all financial freedom realtime updates
 */
export function useFinancialFreedomRealtime(enabled = true) {
  useRealtime({
    tables: [
      "budget_categories",
      "financial_goals",
      "debts",
      "accounts",
      "account_transactions",
    ],
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
