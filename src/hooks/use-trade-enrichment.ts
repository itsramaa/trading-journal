/**
 * useTradeEnrichment - Hook for managing trade enrichment data
 * Extracted from TradeEnrichmentDrawer for better separation of concerns
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { toast } from "sonner";
import type { UnifiedPosition } from "@/components/journal/AllPositionsTable";

interface Screenshot {
  url: string;
  path: string;
}

interface EnrichmentData {
  notes: string;
  emotionalState: string;
  chartTimeframe: string;
  customTags: string;
  screenshots: Screenshot[];
  selectedStrategies: string[];
  biasTimeframe: string;
  executionTimeframe: string;
  precisionTimeframe: string;
  tradeRating: string;
}

export function useTradeEnrichment() {
  const [isSaving, setIsSaving] = useState(false);
  const updateTrade = useUpdateTradeEntry();

  const loadLinkedStrategies = useCallback(async (tradeId: string): Promise<string[]> => {
    const { data } = await supabase
      .from("trade_entry_strategies")
      .select("strategy_id")
      .eq("trade_entry_id", tradeId);
    
    return data?.map((d) => d.strategy_id) || [];
  }, []);

  const saveEnrichment = useCallback(async (
    position: UnifiedPosition,
    enrichmentData: EnrichmentData,
    onSuccess?: () => void
  ) => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { notes, emotionalState, chartTimeframe, customTags, screenshots, selectedStrategies, biasTimeframe, executionTimeframe, precisionTimeframe, tradeRating } = enrichmentData;
      const tags = customTags ? customTags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      if (position.source === "paper") {
        // Update existing paper trade
        const trade = position.originalData as TradeEntry;
        
        await updateTrade.mutateAsync({
          id: trade.id,
          notes,
          emotional_state: emotionalState || null,
          tags,
          screenshots: screenshots as any,
          chart_timeframe: chartTimeframe || null,
          bias_timeframe: biasTimeframe || null,
          execution_timeframe: executionTimeframe || null,
          precision_timeframe: precisionTimeframe || null,
          trade_rating: tradeRating || null,
        } as any);

        // Update linked strategies
        await supabase
          .from("trade_entry_strategies")
          .delete()
          .eq("trade_entry_id", trade.id);

        if (selectedStrategies.length > 0) {
          await supabase.from("trade_entry_strategies").insert(
            selectedStrategies.map((strategyId) => ({
              trade_entry_id: trade.id,
              strategy_id: strategyId,
              user_id: user.id,
            }))
          );
        }
      } else {
        // For Binance trades - find or create local trade entry
        const { data: existingTrade } = await supabase
          .from("trade_entries")
          .select("id")
          .eq("binance_trade_id", position.id)
          .single();

        if (existingTrade) {
          // Update existing
          await supabase
            .from("trade_entries")
            .update({
              notes,
              emotional_state: emotionalState || null,
              tags,
              screenshots: screenshots as unknown as any,
              chart_timeframe: chartTimeframe || null,
              bias_timeframe: biasTimeframe || null,
              execution_timeframe: executionTimeframe || null,
              precision_timeframe: precisionTimeframe || null,
              trade_rating: tradeRating || null,
            })
            .eq("id", existingTrade.id);
        } else {
          // Create new enrichment entry for Binance trade
          const { data: newTrade, error } = await supabase
            .from("trade_entries")
            .insert({
              user_id: user.id,
              pair: position.symbol,
              direction: position.direction,
              entry_price: position.entryPrice,
              quantity: position.quantity,
              status: "open",
              source: "binance",
              binance_trade_id: position.id,
              notes,
              emotional_state: emotionalState || null,
              tags,
              screenshots: screenshots as unknown as any,
              chart_timeframe: chartTimeframe || null,
              bias_timeframe: biasTimeframe || null,
              execution_timeframe: executionTimeframe || null,
              precision_timeframe: precisionTimeframe || null,
              trade_rating: tradeRating || null,
            })
            .select()
            .single();

          if (error) throw error;

          // Link strategies
          if (newTrade && selectedStrategies.length > 0) {
            await supabase.from("trade_entry_strategies").insert(
              selectedStrategies.map((strategyId) => ({
                trade_entry_id: newTrade.id,
                strategy_id: strategyId,
                user_id: user.id,
              }))
            );
          }
        }
      }

      toast.success("Trade enrichment saved");
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to save enrichment:", error);
      toast.error(error.message || "Failed to save");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [updateTrade]);

  const addQuickNote = useCallback(async (
    tradeId: string,
    note: string
  ) => {
    try {
      const { data: existingTrade } = await supabase
        .from("trade_entries")
        .select("notes")
        .eq("id", tradeId)
        .single();

      const existingNotes = existingTrade?.notes || "";
      const timestamp = new Date().toLocaleTimeString();
      const newNote = existingNotes 
        ? `${existingNotes}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;

      await supabase
        .from("trade_entries")
        .update({ notes: newNote })
        .eq("id", tradeId);

      toast.success("Quick note added");
    } catch (error: any) {
      console.error("Failed to add quick note:", error);
      toast.error("Failed to add note");
      throw error;
    }
  }, []);

  return {
    isSaving,
    loadLinkedStrategies,
    saveEnrichment,
    addQuickNote,
  };
}
