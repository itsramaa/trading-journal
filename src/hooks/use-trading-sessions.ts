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

export interface TradingSessionWithStats extends TradingSession {
  calculated_trades_count: number;
  calculated_pnl: number;
}

export interface CreateSessionInput {
  session_date: string;
  start_time: string;
  end_time?: string;
  mood: string;
  rating: number;
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

      // Fetch sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("trading_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("session_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch linked trades for all sessions
      const sessionIds = sessions.map(s => s.id);
      if (sessionIds.length === 0) return [] as TradingSessionWithStats[];

      const { data: trades, error: tradesError } = await supabase
        .from("trade_entries")
        .select("session_id, pnl, realized_pnl, status")
        .in("session_id", sessionIds);

      if (tradesError) throw tradesError;

      // Calculate stats per session
      const sessionStats = new Map<string, { count: number; pnl: number }>();
      trades?.forEach(trade => {
        if (!trade.session_id) return;
        const current = sessionStats.get(trade.session_id) || { count: 0, pnl: 0 };
        current.count += 1;
        // Use realized_pnl for closed trades, pnl for open
        const tradePnl = trade.status === 'closed' ? (trade.realized_pnl || 0) : (trade.pnl || 0);
        current.pnl += tradePnl;
        sessionStats.set(trade.session_id, current);
      });

      // Merge stats with sessions
      return sessions.map(session => ({
        ...session,
        calculated_trades_count: sessionStats.get(session.id)?.count || 0,
        calculated_pnl: sessionStats.get(session.id)?.pnl || 0,
      })) as TradingSessionWithStats[];
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
          trades_count: 0, // Will be calculated from linked trades
          pnl: 0, // Will be calculated from linked trades
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
