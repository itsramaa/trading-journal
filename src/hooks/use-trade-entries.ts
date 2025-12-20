import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface TradeEntry {
  id: string;
  user_id: string;
  trading_account_id: string | null;
  session_id: string | null;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  quantity: number;
  pnl: number | null;
  fees: number | null;
  confluence_score: number | null;
  trade_date: string;
  result: string | null;
  market_condition: string | null;
  entry_signal: string | null;
  notes: string | null;
  tags: string[] | null;
  status: 'open' | 'closed';
  realized_pnl: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  strategies?: TradingStrategy[];
}

export interface TradingStrategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTradeEntryInput {
  trading_account_id?: string;
  session_id?: string;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  quantity?: number;
  pnl?: number;
  fees?: number;
  confluence_score?: number;
  trade_date?: string;
  result?: string;
  market_condition?: string;
  entry_signal?: string;
  notes?: string;
  tags?: string[];
  strategy_ids?: string[];
  status?: 'open' | 'closed';
}

export interface UpdateTradeEntryInput extends Partial<CreateTradeEntryInput> {
  id: string;
}

// Fetch all trade entries with strategies
export function useTradeEntries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-entries", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First fetch trade entries
      const { data: trades, error: tradesError } = await supabase
        .from("trade_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false });

      if (tradesError) throw tradesError;

      // Then fetch strategy relationships
      const tradeIds = trades.map(t => t.id);
      if (tradeIds.length === 0) return [];

      const { data: tradeStrategies, error: tsError } = await supabase
        .from("trade_entry_strategies")
        .select(`
          trade_entry_id,
          strategy_id,
          trading_strategies (*)
        `)
        .in("trade_entry_id", tradeIds);

      if (tsError) throw tsError;

      // Map strategies to trades
      const strategyMap = new Map<string, TradingStrategy[]>();
      tradeStrategies?.forEach((ts: any) => {
        const existing = strategyMap.get(ts.trade_entry_id) || [];
        if (ts.trading_strategies) {
          existing.push(ts.trading_strategies);
        }
        strategyMap.set(ts.trade_entry_id, existing);
      });

      return trades.map(trade => ({
        ...trade,
        strategies: strategyMap.get(trade.id) || [],
      })) as TradeEntry[];
    },
    enabled: !!user?.id,
  });
}

// Create trade entry
export function useCreateTradeEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTradeEntryInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { strategy_ids, ...tradeData } = input;

      // Calculate result based on PnL if not provided
      let result = input.result;
      if (!result && input.pnl !== undefined) {
        result = input.pnl > 0 ? 'win' : input.pnl < 0 ? 'loss' : 'breakeven';
      }

      // Determine status based on exit_price
      const status = input.exit_price ? 'closed' : (input.status || 'open');
      const realizedPnl = status === 'closed' ? (input.pnl || 0) : 0;

      // Insert trade entry
      const { data: trade, error: tradeError } = await supabase
        .from("trade_entries")
        .insert({
          user_id: user.id,
          trading_account_id: tradeData.trading_account_id || null,
          session_id: tradeData.session_id || null,
          pair: tradeData.pair,
          direction: tradeData.direction,
          entry_price: tradeData.entry_price,
          exit_price: tradeData.exit_price || null,
          stop_loss: tradeData.stop_loss || null,
          take_profit: tradeData.take_profit || null,
          quantity: tradeData.quantity || 1,
          pnl: tradeData.pnl || 0,
          fees: tradeData.fees || 0,
          confluence_score: tradeData.confluence_score || null,
          trade_date: tradeData.trade_date || new Date().toISOString(),
          result: result || null,
          market_condition: tradeData.market_condition || null,
          entry_signal: tradeData.entry_signal || null,
          notes: tradeData.notes || null,
          tags: tradeData.tags || [],
          status: status,
          realized_pnl: realizedPnl,
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      // Insert strategy relationships if provided
      if (strategy_ids && strategy_ids.length > 0) {
        const strategyInserts = strategy_ids.map(strategyId => ({
          trade_entry_id: trade.id,
          strategy_id: strategyId,
          user_id: user.id,
        }));

        const { error: strategyError } = await supabase
          .from("trade_entry_strategies")
          .insert(strategyInserts);

        if (strategyError) throw strategyError;
      }

      return trade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      toast.success("Trade entry saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save trade: ${error.message}`);
    },
  });
}

// Update trade entry
export function useUpdateTradeEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTradeEntryInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { id, strategy_ids, ...updates } = input;

      // Update trade entry
      const { data, error } = await supabase
        .from("trade_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update strategies if provided
      if (strategy_ids !== undefined) {
        // Delete existing relationships
        await supabase
          .from("trade_entry_strategies")
          .delete()
          .eq("trade_entry_id", id);

        // Insert new relationships
        if (strategy_ids.length > 0) {
          const strategyInserts = strategy_ids.map(strategyId => ({
            trade_entry_id: id,
            strategy_id: strategyId,
            user_id: user.id,
          }));

          const { error: strategyError } = await supabase
            .from("trade_entry_strategies")
            .insert(strategyInserts);

          if (strategyError) throw strategyError;
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      toast.success("Trade entry updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update trade: ${error.message}`);
    },
  });
}

// Delete trade entry
export function useDeleteTradeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trade_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      toast.success("Trade entry deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete trade: ${error.message}`);
    },
  });
}
