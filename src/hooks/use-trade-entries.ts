import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface TradeScreenshot {
  url: string;
  path: string;
}

export interface TradeEntry {
  id: string;
  user_id: string;
  trading_account_id: string | null;
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
  ai_quality_score: number | null;
  ai_confidence: number | null;
  trade_date: string;
  result: string | null;
  market_condition: string | null;
  entry_signal: string | null;
  emotional_state: string | null;
  notes: string | null;
  tags: string[] | null;
  status: 'open' | 'closed';
  realized_pnl: number | null;
  created_at: string;
  updated_at: string;
  // Binance sync fields
  binance_trade_id: string | null;
  binance_order_id: number | null;
  source: 'manual' | 'binance' | null;
  commission: number | null;
  commission_asset: string | null;
  // Enrichment fields (from DB as Json, cast in runtime)
  screenshots: TradeScreenshot[] | null;
  chart_timeframe: string | null;
  market_context: Record<string, unknown> | null;
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
  // Binance sync fields
  binance_trade_id?: string;
  binance_order_id?: number;
  source?: 'manual' | 'binance';
  commission?: number;
  commission_asset?: string;
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
        screenshots: (trade.screenshots as unknown) as TradeScreenshot[] | null,
        market_context: (trade.market_context as unknown) as Record<string, unknown> | null,
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
          // Binance sync fields
          binance_trade_id: tradeData.binance_trade_id || null,
          binance_order_id: tradeData.binance_order_id || null,
          source: tradeData.source || 'manual',
          commission: tradeData.commission || 0,
          commission_asset: tradeData.commission_asset || null,
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

// Close an open position
export interface ClosePositionInput {
  id: string;
  exit_price: number;
  pnl: number;
  fees?: number;
  notes?: string;
}

export function useClosePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClosePositionInput) => {
      const { id, exit_price, pnl, fees, notes } = input;

      // Calculate result based on P&L
      const result = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';

      const { data, error } = await supabase
        .from("trade_entries")
        .update({
          exit_price,
          pnl,
          realized_pnl: pnl,
          fees: fees || 0,
          status: 'closed',
          result,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // Trigger post-trade analysis asynchronously (non-blocking)
      triggerPostTradeAnalysis(id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      toast.success("Position closed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to close position: ${error.message}`);
    },
  });
}

// Async helper to trigger AI post-trade analysis
async function triggerPostTradeAnalysis(tradeId: string) {
  try {
    // Fetch trade details for analysis
    const { data: trade, error: tradeError } = await supabase
      .from('trade_entries')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (tradeError || !trade) return;

    // Fetch linked strategy
    const { data: strategyLinks } = await supabase
      .from('trade_entry_strategies')
      .select('trading_strategies(*)')
      .eq('trade_entry_id', tradeId)
      .limit(1);

    const strategy = strategyLinks?.[0]?.trading_strategies as any;

    // Fetch similar trades for pattern analysis
    const { data: similarTrades } = await supabase
      .from('trade_entries')
      .select('pair, direction, result, pnl, confluence_score')
      .eq('user_id', trade.user_id)
      .eq('pair', trade.pair)
      .eq('status', 'closed')
      .neq('id', tradeId)
      .order('trade_date', { ascending: false })
      .limit(20);

    // Call post-trade-analysis edge function
    const { data, error } = await supabase.functions.invoke('post-trade-analysis', {
      body: {
        trade: {
          id: trade.id,
          pair: trade.pair,
          direction: trade.direction,
          entryPrice: trade.entry_price,
          exitPrice: trade.exit_price || trade.entry_price,
          stopLoss: trade.stop_loss || 0,
          takeProfit: trade.take_profit || 0,
          pnl: trade.pnl || 0,
          result: trade.result || 'unknown',
          notes: trade.notes || '',
          emotionalState: trade.emotional_state || 'neutral',
          confluenceScore: trade.confluence_score || 0,
        },
        strategy: strategy ? {
          name: strategy.name,
          minConfluences: strategy.min_confluences || 4,
          minRR: strategy.min_rr || 1.5,
        } : undefined,
        similarTrades: (similarTrades || []).map(t => ({
          pair: t.pair,
          direction: t.direction,
          result: t.result || 'unknown',
          pnl: t.pnl || 0,
          confluenceScore: t.confluence_score || 0,
        })),
      },
    });

    if (!error && data?.success && data?.data) {
      // Save analysis result to trade
      await supabase
        .from('trade_entries')
        .update({
          post_trade_analysis: JSON.parse(JSON.stringify(data.data)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tradeId);
      
      console.log('Post-trade analysis saved for trade:', tradeId);
    }
  } catch (e) {
    console.error('Post-trade analysis failed:', e);
    // Non-blocking - don't surface error to user
  }
}
