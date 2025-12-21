import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// Trading accounts are now stored in the unified accounts table with type 'trading'
// The metadata field stores: broker, account_number, is_backtest, initial_balance

export interface TradingAccount {
  id: string;
  user_id: string;
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

// Transform account to TradingAccount interface
function transformAccountToTradingAccount(account: any): TradingAccount {
  const metadata = typeof account.metadata === 'string' 
    ? JSON.parse(account.metadata) 
    : (account.metadata || {});
  
  return {
    id: account.id,
    user_id: account.user_id,
    name: account.name,
    broker: metadata.broker || null,
    account_number: metadata.account_number || null,
    currency: account.currency,
    initial_balance: Number(metadata.initial_balance || 0),
    current_balance: Number(account.balance),
    is_active: account.is_active,
    is_backtest: Boolean(metadata.is_backtest),
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

// Fetch trading accounts (optionally filter by backtest)
export function useTradingAccounts(options?: { backtestOnly?: boolean; excludeBacktest?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trading-accounts", user?.id, options],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("account_type", "trading")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      let accounts = (data || []).map(transformAccountToTradingAccount);
      
      // Filter by backtest status if requested
      if (options?.backtestOnly) {
        accounts = accounts.filter(a => a.is_backtest);
      } else if (options?.excludeBacktest) {
        accounts = accounts.filter(a => !a.is_backtest);
      }
      
      return accounts;
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

      const metadata = {
        broker: input.broker || null,
        account_number: input.account_number || null,
        is_backtest: input.is_backtest || false,
        initial_balance: input.initial_balance || 0,
      };

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: input.name,
          account_type: "trading",
          balance: input.initial_balance || 0,
          currency: input.currency || "USD",
          is_active: true,
          is_system: false,
          metadata: metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return transformAccountToTradingAccount(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
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

      // First get current account to merge metadata
      const { data: current } = await supabase
        .from("accounts")
        .select("metadata")
        .eq("id", id)
        .single();

      const currentMetadata = typeof current?.metadata === 'string' 
        ? JSON.parse(current.metadata) 
        : (current?.metadata || {});

      const newMetadata = {
        ...currentMetadata,
        ...(updates.broker !== undefined && { broker: updates.broker }),
        ...(updates.account_number !== undefined && { account_number: updates.account_number }),
        ...(updates.is_backtest !== undefined && { is_backtest: updates.is_backtest }),
        ...(updates.initial_balance !== undefined && { initial_balance: updates.initial_balance }),
      };

      const updateData: any = {
        metadata: newMetadata,
        updated_at: new Date().toISOString(),
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.currency) updateData.currency = updates.currency;

      const { data, error } = await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformAccountToTradingAccount(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
        .from("accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Trading account deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
}
