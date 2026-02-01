/**
 * Paginated Trade Entries Hook
 * Implements cursor-based pagination for large trade histories
 */
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { TradeEntry, TradingStrategy, TradeScreenshot } from "./use-trade-entries";

export interface TradeFilters {
  status?: 'open' | 'closed' | 'all';
  pair?: string;
  direction?: 'LONG' | 'SHORT';
  result?: 'win' | 'loss' | 'breakeven';
  source?: 'manual' | 'binance';
  startDate?: string;
  endDate?: string;
  strategyId?: string;
}

export interface PaginatedTradeEntriesOptions {
  limit?: number;
  filters?: TradeFilters;
}

const DEFAULT_PAGE_SIZE = 50;

export function useTradeEntriesPaginated(options: PaginatedTradeEntriesOptions = {}) {
  const { user } = useAuth();
  const { limit = DEFAULT_PAGE_SIZE, filters } = options;

  return useInfiniteQuery({
    queryKey: ["trade-entries-paginated", user?.id, filters],
    queryFn: async ({ pageParam }) => {
      if (!user?.id) return { trades: [], nextCursor: null, hasMore: false };

      // Build query
      let query = supabase
        .from("trade_entries")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1); // +1 to detect hasMore

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters?.pair) {
        query = query.eq("pair", filters.pair);
      }
      if (filters?.direction) {
        query = query.eq("direction", filters.direction);
      }
      if (filters?.result) {
        query = query.eq("result", filters.result);
      }
      if (filters?.source) {
        query = query.eq("source", filters.source);
      }
      if (filters?.startDate) {
        query = query.gte("trade_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("trade_date", filters.endDate);
      }

      // Apply cursor for pagination
      if (pageParam) {
        const { cursorDate, cursorId } = pageParam as { cursorDate: string; cursorId: string };
        // Use combined cursor for stable pagination
        query = query.or(`trade_date.lt.${cursorDate},and(trade_date.eq.${cursorDate},id.lt.${cursorId})`);
      }

      const { data: trades, error: tradesError, count } = await query;

      if (tradesError) throw tradesError;

      if (!trades || trades.length === 0) {
        return { trades: [], nextCursor: null, hasMore: false, totalCount: count || 0 };
      }

      // Determine if there are more results
      const hasMore = trades.length > limit;
      const tradeSlice = hasMore ? trades.slice(0, limit) : trades;

      // Fetch strategy relationships for these trades
      const tradeIds = tradeSlice.map(t => t.id);
      const { data: tradeStrategies, error: tsError } = await supabase
        .from("trade_entry_strategies")
        .select(`
          trade_entry_id,
          strategy_id,
          trading_strategies (*)
        `)
        .in("trade_entry_id", tradeIds);

      if (tsError) console.error("Failed to fetch strategies:", tsError);

      // Map strategies to trades
      const strategyMap = new Map<string, TradingStrategy[]>();
      tradeStrategies?.forEach((ts: any) => {
        const existing = strategyMap.get(ts.trade_entry_id) || [];
        if (ts.trading_strategies) {
          existing.push(ts.trading_strategies);
        }
        strategyMap.set(ts.trade_entry_id, existing);
      });

      // Transform trades
      const transformedTrades = tradeSlice.map(trade => ({
        ...trade,
        screenshots: (trade.screenshots as unknown) as TradeScreenshot[] | null,
        market_context: (trade.market_context as unknown) as Record<string, unknown> | null,
        strategies: strategyMap.get(trade.id) || [],
      })) as TradeEntry[];

      // Build next cursor
      const lastTrade = tradeSlice[tradeSlice.length - 1];
      const nextCursor = hasMore
        ? { cursorDate: lastTrade.trade_date, cursorId: lastTrade.id }
        : null;

      // Filter by strategy if needed (post-filter since we need join data)
      let finalTrades = transformedTrades;
      if (filters?.strategyId) {
        finalTrades = transformedTrades.filter(t => 
          t.strategies?.some(s => s.id === filters.strategyId)
        );
      }

      return {
        trades: finalTrades,
        nextCursor,
        hasMore,
        totalCount: count || 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as { cursorDate: string; cursorId: string } | null,
    enabled: !!user?.id,
  });
}

// Soft delete trade entry
export function useSoftDeleteTradeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trade_entries")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
      toast.success("Trade entry deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete trade: ${error.message}`);
    },
  });
}

// Restore soft-deleted trade entry
export function useRestoreTradeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Need to bypass RLS to update deleted_at, use service role or RPC
      // For now, we'll use a direct update (RLS allows UPDATE on user's trades)
      const { error } = await supabase
        .from("trade_entries")
        .update({ deleted_at: null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
      toast.success("Trade entry restored");
    },
    onError: (error) => {
      toast.error(`Failed to restore trade: ${error.message}`);
    },
  });
}

// Soft delete trading strategy
export function useSoftDeleteStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trading_strategies")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-strategies"] });
      toast.success("Strategy deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete strategy: ${error.message}`);
    },
  });
}

// Soft delete account
export function useSoftDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
}

// Helper hook to get all trades flattened (for components that need flat array)
export function useFlattenedPaginatedTrades(options: PaginatedTradeEntriesOptions = {}) {
  const query = useTradeEntriesPaginated(options);

  const allTrades = query.data?.pages.flatMap(page => page.trades) ?? [];
  const totalCount = query.data?.pages[0]?.totalCount ?? 0;

  return {
    ...query,
    trades: allTrades,
    totalCount,
  };
}
