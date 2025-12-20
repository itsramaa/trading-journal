import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface TradingAccount {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  broker: string | null;
  account_number: string | null;
  currency: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  is_backtest: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTradingAccountInput {
  account_id: string;
  name: string;
  broker?: string;
  account_number?: string;
  currency?: string;
  initial_balance?: number;
  is_backtest?: boolean;
}

export interface UpdateTradingAccountInput extends Partial<CreateTradingAccountInput> {
  id: string;
}

// Fetch trading accounts (optionally filter by backtest)
export function useTradingAccounts(options?: { backtestOnly?: boolean; excludeBacktest?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trading-accounts", user?.id, options],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("trading_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (options?.backtestOnly) {
        query = query.eq("is_backtest", true);
      } else if (options?.excludeBacktest) {
        query = query.eq("is_backtest", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TradingAccount[];
    },
    enabled: !!user?.id,
  });
}

// Fetch only backtest accounts for Trading Journey
export function useBacktestAccounts() {
  return useTradingAccounts({ backtestOnly: true });
}

// Fetch only real accounts (exclude backtest) for main Accounts page
export function useRealTradingAccounts() {
  return useTradingAccounts({ excludeBacktest: true });
}

// Create trading account
export function useCreateTradingAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTradingAccountInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("trading_accounts")
        .insert({
          user_id: user.id,
          account_id: input.account_id,
          name: input.name,
          broker: input.broker || null,
          account_number: input.account_number || null,
          currency: input.currency || "USD",
          initial_balance: input.initial_balance || 0,
          current_balance: input.initial_balance || 0,
          is_backtest: input.is_backtest || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
      toast.success(data.is_backtest ? "Backtest account created" : "Trading account created");
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

// Update trading account
export function useUpdateTradingAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTradingAccountInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("trading_accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
      toast.success("Trading account updated");
    },
    onError: (error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
}

// Delete trading account
export function useDeleteTradingAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trading_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
      toast.success("Trading account deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
}
