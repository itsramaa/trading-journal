import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { 
  EntryRule, 
  ExitRule, 
  TimeframeType, 
  MarketType, 
  StrategyStatus,
  TradingMethodology,
  TradingStyle,
  TradingSession,
  DifficultyLevel,
} from "@/types/strategy";
import { STRATEGY_DEFAULTS } from "@/lib/constants/strategy-config";

export interface TradingStrategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  color: string | null;
  is_active: boolean;
  // Primary timeframe for trade management
  timeframe: TimeframeType | null;
  // Multi-Timeframe Analysis (MTFA)
  higher_timeframe: TimeframeType | null;
  lower_timeframe: TimeframeType | null;
  market_type: MarketType | null;
  min_confluences: number | null;
  min_rr: number | null;
  entry_rules: EntryRule[] | null;
  exit_rules: ExitRule[] | null;
  valid_pairs: string[] | null;
  version: number | null;
  status: StrategyStatus | null;
  // NEW: Professional trading fields
  methodology: TradingMethodology | null;
  trading_style: TradingStyle | null;
  session_preference: TradingSession[] | null;
  difficulty_level: DifficultyLevel | null;
  // YouTube import fields
  validation_score: number | null;
  automation_score: number | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStrategyInput {
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
  timeframe?: TimeframeType;
  higher_timeframe?: TimeframeType;
  lower_timeframe?: TimeframeType;
  market_type?: MarketType;
  min_confluences?: number;
  min_rr?: number;
  entry_rules?: EntryRule[];
  exit_rules?: ExitRule[];
  valid_pairs?: string[];
  // NEW: Professional trading fields
  methodology?: TradingMethodology;
  trading_style?: TradingStyle;
  session_preference?: TradingSession[];
  difficulty_level?: DifficultyLevel;
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
        higher_timeframe: s.higher_timeframe as TimeframeType | null,
        lower_timeframe: s.lower_timeframe as TimeframeType | null,
        market_type: (s.market_type || STRATEGY_DEFAULTS.MARKET_TYPE) as MarketType,
        status: (s.status || STRATEGY_DEFAULTS.STATUS) as StrategyStatus,
        methodology: (s.methodology || STRATEGY_DEFAULTS.METHODOLOGY) as TradingMethodology,
        trading_style: (s.trading_style || STRATEGY_DEFAULTS.TRADING_STYLE) as TradingStyle,
        session_preference: (s.session_preference || STRATEGY_DEFAULTS.SESSION_PREFERENCE) as TradingSession[],
        difficulty_level: s.difficulty_level as DifficultyLevel | null,
        validation_score: s.validation_score,
        automation_score: s.automation_score,
        source: s.source || null,
        source_url: s.source_url || null,
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
          color: input.color || STRATEGY_DEFAULTS.COLOR,
          timeframe: input.timeframe || null,
          higher_timeframe: input.higher_timeframe || null,
          lower_timeframe: input.lower_timeframe || null,
          market_type: input.market_type || STRATEGY_DEFAULTS.MARKET_TYPE,
          min_confluences: input.min_confluences || STRATEGY_DEFAULTS.MIN_CONFLUENCES,
          min_rr: input.min_rr || STRATEGY_DEFAULTS.MIN_RR,
          entry_rules: JSON.parse(JSON.stringify(input.entry_rules || [])),
          exit_rules: JSON.parse(JSON.stringify(input.exit_rules || [])),
          valid_pairs: input.valid_pairs || [...STRATEGY_DEFAULTS.VALID_PAIRS],
          // NEW: Professional trading fields
          methodology: input.methodology || STRATEGY_DEFAULTS.METHODOLOGY,
          trading_style: input.trading_style || STRATEGY_DEFAULTS.TRADING_STYLE,
          session_preference: input.session_preference || [...STRATEGY_DEFAULTS.SESSION_PREFERENCE],
          difficulty_level: input.difficulty_level || null,
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
      if (updates.higher_timeframe !== undefined) updateData.higher_timeframe = updates.higher_timeframe;
      if (updates.lower_timeframe !== undefined) updateData.lower_timeframe = updates.lower_timeframe;
      if (updates.market_type !== undefined) updateData.market_type = updates.market_type;
      if (updates.min_confluences !== undefined) updateData.min_confluences = updates.min_confluences;
      if (updates.min_rr !== undefined) updateData.min_rr = updates.min_rr;
      if (updates.entry_rules !== undefined) updateData.entry_rules = updates.entry_rules;
      if (updates.exit_rules !== undefined) updateData.exit_rules = updates.exit_rules;
      if (updates.valid_pairs !== undefined) updateData.valid_pairs = updates.valid_pairs;
      // NEW: Professional trading fields
      if (updates.methodology !== undefined) updateData.methodology = updates.methodology;
      if (updates.trading_style !== undefined) updateData.trading_style = updates.trading_style;
      if (updates.session_preference !== undefined) updateData.session_preference = updates.session_preference;
      if (updates.difficulty_level !== undefined) updateData.difficulty_level = updates.difficulty_level;

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
