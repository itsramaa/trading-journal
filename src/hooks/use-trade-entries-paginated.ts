/**
 * Paginated Trade Entries Hook
 * Implements cursor-based pagination for large trade histories
 */
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { invalidateTradeQueries, invalidateAccountQueries } from "@/lib/query-invalidation";
import { TRADE_HISTORY_CONFIG } from "@/lib/constants/trade-history";
import type { TradeEntry, TradingStrategy, TradeScreenshot } from "./use-trade-entries";

export interface TradeFilters {
  status?: 'open' | 'closed' | 'all';
  pair?: string;
  pairs?: string[];               // Multi-select pairs
  direction?: 'LONG' | 'SHORT';
  result?: 'win' | 'loss' | 'breakeven' | 'profit';  // profit = alias for win
  source?: 'manual' | 'binance';
  excludeSource?: 'manual' | 'binance'; // NEW: Exclude specific source
  startDate?: string;
  endDate?: string;
  strategyId?: string;
  strategyIds?: string[];         // Multi-select strategies
  session?: 'sydney' | 'tokyo' | 'london' | 'new_york' | 'all';  // DB-level session filter
  tradeMode?: 'paper' | 'live';  // Mode isolation filter
}

export interface PaginatedTradeEntriesOptions {
  limit?: number;
  filters?: TradeFilters;
}

// Use centralized config
const DEFAULT_PAGE_SIZE = TRADE_HISTORY_CONFIG.pagination.defaultPageSize;

export function useTradeEntriesPaginated(options: PaginatedTradeEntriesOptions = {}) {
  const { user } = useAuth();
  const { limit = DEFAULT_PAGE_SIZE, filters } = options;

  return useInfiniteQuery({
    queryKey: ["trade-entries-paginated", user?.id, filters],
    queryFn: async ({ pageParam }) => {
      if (!user?.id) return { trades: [], nextCursor: null, hasMore: false };

      // Build query with ALL filters at database level
      let query = supabase
        .from("trade_entries")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1); // +1 to detect hasMore

      // Apply filters at DB level
      if (filters?.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      // Single pair filter
      if (filters?.pair) {
        query = query.eq("pair", filters.pair);
      }
      // Multi-pair filter (takes precedence if both are set)
      if (filters?.pairs && filters.pairs.length > 0) {
        query = query.in("pair", filters.pairs);
      }
      if (filters?.direction) {
        query = query.eq("direction", filters.direction);
      }
      
      // Result filter - now using DB-level filtering
      if (filters?.result === 'win' || filters?.result === 'profit') {
        query = query.gt("realized_pnl", 0);
      } else if (filters?.result === 'loss') {
        query = query.lt("realized_pnl", 0);
      } else if (filters?.result === 'breakeven') {
        query = query.eq("realized_pnl", 0);
      }
      
      // Source filters
      if (filters?.source) {
        query = query.eq("source", filters.source);
      }
      // Exclude source (for use_binance_history = false)
      if (filters?.excludeSource) {
        query = query.neq("source", filters.excludeSource);
      }
      if (filters?.startDate) {
        query = query.gte("trade_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("trade_date", filters.endDate);
      }
      
      // Session filter at DB level (new session column)
      if (filters?.session && filters.session !== 'all') {
        query = query.eq("session", filters.session);
      }
      
      // Trade mode filter for Paper/Live isolation
      if (filters?.tradeMode) {
        query = query.eq("trade_mode", filters.tradeMode);
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

      // Post-query filters - only for strategy join (requires separate query)
      // All other filters are now at DB level for accurate pagination
      let finalTrades = transformedTrades;
      
      // Single strategy filter (requires join data)
      if (filters?.strategyId) {
        finalTrades = finalTrades.filter(t => 
          t.strategies?.some(s => s.id === filters.strategyId)
        );
      }
      
      // Multi-strategy filter (requires join data)
      if (filters?.strategyIds && filters.strategyIds.length > 0) {
        finalTrades = finalTrades.filter(t => 
          t.strategies?.some(s => filters.strategyIds!.includes(s.id))
        );
      }
      
      // NOTE: Profit/Loss and Session filters are now at DB level

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
      invalidateTradeQueries(queryClient);
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
      invalidateTradeQueries(queryClient);
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
      invalidateAccountQueries(queryClient);
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
