/**
 * useBinanceSync - Hook for syncing Binance trades to local journal
 * Handles: Single trade import, bulk sync, duplicate detection
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { BinanceTrade } from "@/features/binance/types";

export interface SyncTradeInput {
  binanceTrade: BinanceTrade;
  strategyId?: string;
  notes?: string;
  emotionalState?: string;
  tradingAccountId?: string;
}

export interface BulkSyncInput {
  trades: BinanceTrade[];
  strategyId?: string;
  tradingAccountId?: string;
}

/**
 * Sync a single Binance trade to local journal
 */
export function useSyncTradeToJournal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SyncTradeInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { binanceTrade, strategyId, notes, emotionalState, tradingAccountId } = input;

      // Check for duplicate
      const { data: existing } = await supabase
        .from("trade_entries")
        .select("id")
        .eq("binance_trade_id", String(binanceTrade.id))
        .single();

      if (existing) {
        throw new Error("Trade already synced to journal");
      }

      // Map Binance trade to local format
      const direction = binanceTrade.side === "BUY" ? "LONG" : "SHORT";
      const result = binanceTrade.realizedPnl > 0 ? "win" : binanceTrade.realizedPnl < 0 ? "loss" : "breakeven";

      const { data: trade, error } = await supabase
        .from("trade_entries")
        .insert({
          user_id: user.id,
          trading_account_id: tradingAccountId || null,
          pair: binanceTrade.symbol,
          direction,
          entry_price: binanceTrade.price,
          exit_price: binanceTrade.price, // Same for realized trade
          quantity: binanceTrade.qty,
          pnl: binanceTrade.realizedPnl,
          realized_pnl: binanceTrade.realizedPnl,
          fees: binanceTrade.commission,
          trade_date: new Date(binanceTrade.time).toISOString(),
          status: "closed",
          result,
          notes,
          emotional_state: emotionalState,
          source: "binance",
          binance_trade_id: String(binanceTrade.id),
          binance_order_id: binanceTrade.orderId,
          commission: binanceTrade.commission,
          commission_asset: binanceTrade.commissionAsset,
        })
        .select()
        .single();

      if (error) throw error;

      // Link strategy if provided
      if (strategyId && trade) {
        await supabase
          .from("trade_entry_strategies")
          .insert({
            trade_entry_id: trade.id,
            strategy_id: strategyId,
            user_id: user.id,
          });
      }

      return trade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      toast.success("Trade synced to journal");
    },
    onError: (error) => {
      if (error.message === "Trade already synced to journal") {
        toast.info("Trade already exists in journal");
      } else {
        toast.error(`Failed to sync trade: ${error.message}`);
      }
    },
  });
}

/**
 * Bulk sync multiple Binance trades to local journal
 */
export function useBulkSyncTrades() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkSyncInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { trades, strategyId, tradingAccountId } = input;
      
      if (trades.length === 0) {
        throw new Error("No trades to sync");
      }

      // Get existing binance_trade_ids to filter duplicates
      const binanceIds = trades.map(t => String(t.id));
      const { data: existingTrades } = await supabase
        .from("trade_entries")
        .select("binance_trade_id")
        .in("binance_trade_id", binanceIds);

      const existingIds = new Set(existingTrades?.map(t => t.binance_trade_id) || []);
      const newTrades = trades.filter(t => !existingIds.has(String(t.id)));

      if (newTrades.length === 0) {
        return { synced: 0, skipped: trades.length };
      }

      // Prepare trade entries
      const tradeEntries = newTrades.map(trade => {
        const direction = trade.side === "BUY" ? "LONG" : "SHORT";
        const result = trade.realizedPnl > 0 ? "win" : trade.realizedPnl < 0 ? "loss" : "breakeven";

        return {
          user_id: user.id,
          trading_account_id: tradingAccountId || null,
          pair: trade.symbol,
          direction,
          entry_price: trade.price,
          exit_price: trade.price,
          quantity: trade.qty,
          pnl: trade.realizedPnl,
          realized_pnl: trade.realizedPnl,
          fees: trade.commission,
          trade_date: new Date(trade.time).toISOString(),
          status: "closed" as const,
          result,
          source: "binance",
          binance_trade_id: String(trade.id),
          binance_order_id: trade.orderId,
          commission: trade.commission,
          commission_asset: trade.commissionAsset,
        };
      });

      // Insert all trades
      const { data: insertedTrades, error } = await supabase
        .from("trade_entries")
        .insert(tradeEntries)
        .select();

      if (error) throw error;

      // Link strategies if provided
      if (strategyId && insertedTrades && insertedTrades.length > 0) {
        const strategyLinks = insertedTrades.map(trade => ({
          trade_entry_id: trade.id,
          strategy_id: strategyId,
          user_id: user.id,
        }));

        await supabase
          .from("trade_entry_strategies")
          .insert(strategyLinks);
      }

      return { 
        synced: insertedTrades?.length || 0, 
        skipped: trades.length - newTrades.length 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      toast.success(`Synced ${result.synced} trades${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}`);
    },
    onError: (error) => {
      toast.error(`Failed to sync trades: ${error.message}`);
    },
  });
}

/**
 * Check if a Binance trade already exists in journal
 */
export function useCheckTradeExists() {
  return useMutation({
    mutationFn: async (binanceTradeId: number | string) => {
      const { data } = await supabase
        .from("trade_entries")
        .select("id")
        .eq("binance_trade_id", String(binanceTradeId))
        .single();

      return !!data;
    },
  });
}
