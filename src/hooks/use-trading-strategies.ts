import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { EntryRule, ExitRule, TimeframeType, MarketType, StrategyStatus } from "@/types/strategy";

export interface TradingStrategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  color: string | null;
  is_active: boolean;
  timeframe: TimeframeType | null;
  market_type: MarketType | null;
  min_confluences: number | null;
  min_rr: number | null;
  entry_rules: EntryRule[] | null;
  exit_rules: ExitRule[] | null;
  valid_pairs: string[] | null;
  version: number | null;
  status: StrategyStatus | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStrategyInput {
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
  timeframe?: TimeframeType;
  market_type?: MarketType;
  min_confluences?: number;
  min_rr?: number;
  entry_rules?: EntryRule[];
  exit_rules?: ExitRule[];
  valid_pairs?: string[];
}

export interface UpdateStrategyInput extends Partial<CreateStrategyInput> {
  id: string;
}

// Fetch all strategies
export function useTradingStrategies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trading-strategies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("trading_strategies")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      
      // Transform JSONB fields to typed arrays with proper casting
      return (data || []).map(s => ({
        ...s,
        entry_rules: (Array.isArray(s.entry_rules) ? s.entry_rules : []) as unknown as EntryRule[] | null,
        exit_rules: (Array.isArray(s.exit_rules) ? s.exit_rules : []) as unknown as ExitRule[] | null,
        timeframe: s.timeframe as TimeframeType | null,
        market_type: (s.market_type || 'spot') as MarketType,
        status: (s.status || 'active') as StrategyStatus,
      })) as TradingStrategy[];
    },
    enabled: !!user?.id,
  });
}

// Create strategy
export function useCreateTradingStrategy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStrategyInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("trading_strategies")
        .insert([{
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          tags: input.tags || [],
          color: input.color || 'blue',
          timeframe: input.timeframe || null,
          market_type: input.market_type || 'spot',
          min_confluences: input.min_confluences || 4,
          min_rr: input.min_rr || 1.5,
          entry_rules: JSON.parse(JSON.stringify(input.entry_rules || [])),
          exit_rules: JSON.parse(JSON.stringify(input.exit_rules || [])),
          valid_pairs: input.valid_pairs || ['BTC', 'ETH', 'BNB'],
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-strategies"] });
      toast.success("Strategy created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create strategy: ${error.message}`);
    },
  });
}

// Update strategy
export function useUpdateTradingStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStrategyInput) => {
      const { id, ...updates } = input;

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = { 
        updated_at: new Date().toISOString() 
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.timeframe !== undefined) updateData.timeframe = updates.timeframe;
      if (updates.market_type !== undefined) updateData.market_type = updates.market_type;
      if (updates.min_confluences !== undefined) updateData.min_confluences = updates.min_confluences;
      if (updates.min_rr !== undefined) updateData.min_rr = updates.min_rr;
      if (updates.entry_rules !== undefined) updateData.entry_rules = updates.entry_rules;
      if (updates.exit_rules !== undefined) updateData.exit_rules = updates.exit_rules;
      if (updates.valid_pairs !== undefined) updateData.valid_pairs = updates.valid_pairs;

      const { data, error } = await supabase
        .from("trading_strategies")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-strategies"] });
      toast.success("Strategy updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update strategy: ${error.message}`);
    },
  });
}

// Delete (soft delete) strategy
export function useDeleteTradingStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trading_strategies")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-strategies"] });
      toast.success("Strategy deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete strategy: ${error.message}`);
    },
  });
}
