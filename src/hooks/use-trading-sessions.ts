import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface TradingSession {
  id: string;
  user_id: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  mood: string;
  rating: number;
  trades_count: number;
  pnl: number;
  tags: string[] | null;
  notes: string | null;
  market_condition: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  session_date: string;
  start_time: string;
  end_time?: string;
  mood: string;
  rating: number;
  trades_count: number;
  pnl: number;
  tags?: string[];
  notes?: string;
  market_condition?: string;
}

export interface UpdateSessionInput extends Partial<CreateSessionInput> {
  id: string;
}

export function useTradingSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trading-sessions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("session_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data as TradingSession[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTradingSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("trading_sessions")
        .insert({
          user_id: user.id,
          session_date: input.session_date,
          start_time: input.start_time,
          end_time: input.end_time || null,
          mood: input.mood,
          rating: input.rating,
          trades_count: input.trades_count,
          pnl: input.pnl,
          tags: input.tags || [],
          notes: input.notes || null,
          market_condition: input.market_condition || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-sessions"] });
      toast.success("Session logged successfully");
    },
    onError: (error) => {
      toast.error(`Failed to log session: ${error.message}`);
    },
  });
}

export function useUpdateTradingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSessionInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("trading_sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-sessions"] });
      toast.success("Session updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update session: ${error.message}`);
    },
  });
}

export function useDeleteTradingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trading_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-sessions"] });
      toast.success("Session deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete session: ${error.message}`);
    },
  });
}
