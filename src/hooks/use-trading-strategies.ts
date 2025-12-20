import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

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

export interface CreateStrategyInput {
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
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
      return data as TradingStrategy[];
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
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          tags: input.tags || [],
          color: input.color || 'blue',
        })
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

      const { data, error } = await supabase
        .from("trading_strategies")
        .update({ ...updates, updated_at: new Date().toISOString() })
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
