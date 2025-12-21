import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { useAccounts, useDeposit, useWithdraw } from "./use-accounts";

// Emergency fund is now stored as an account with type 'emergency'
// The metadata field stores: monthly_expenses, target_months, monthly_contribution, notes

export interface EmergencyFund {
  id: string;
  user_id: string;
  name: string;
  current_balance: number;
  monthly_expenses: number;
  monthly_contribution: number;
  target_months: number;
  currency: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyFundTransaction {
  id: string;
  user_id: string;
  account_id: string;
  transaction_type: "deposit" | "withdrawal" | "interest";
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export interface CreateEmergencyFundInput {
  name?: string;
  current_balance?: number;
  monthly_expenses: number;
  monthly_contribution: number;
  target_months?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateEmergencyFundInput extends Partial<CreateEmergencyFundInput> {
  id: string;
}

export interface CreateTransactionInput {
  emergency_fund_id: string;
  account_id?: string | null;
  transaction_type: "deposit" | "withdrawal" | "interest";
  amount: number;
  description?: string;
}

const EMERGENCY_FUND_KEY = ["emergency-fund"];
const EMERGENCY_FUND_TRANSACTIONS_KEY = ["emergency-fund-transactions"];

// Transform account to EmergencyFund interface
function transformAccountToEmergencyFund(account: any): EmergencyFund {
  const metadata = typeof account.metadata === 'string' 
    ? JSON.parse(account.metadata) 
    : (account.metadata || {});
  
  return {
    id: account.id,
    user_id: account.user_id,
    name: account.name,
    current_balance: Number(account.balance),
    monthly_expenses: Number(metadata.monthly_expenses || 0),
    monthly_contribution: Number(metadata.monthly_contribution || 0),
    target_months: Number(metadata.target_months || 6),
    currency: account.currency,
    notes: metadata.notes || null,
    is_active: account.is_active,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

export function useEmergencyFund() {
  const { user } = useAuth();

  return useQuery({
    queryKey: EMERGENCY_FUND_KEY,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("account_type", "emergency")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return transformAccountToEmergencyFund(data);
    },
    enabled: !!user?.id,
  });
}

export function useCreateEmergencyFund() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateEmergencyFundInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const metadata = {
        monthly_expenses: input.monthly_expenses,
        monthly_contribution: input.monthly_contribution,
        target_months: input.target_months || 6,
        notes: input.notes?.trim() || null,
      };

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: input.name?.trim() || "Emergency Fund",
          account_type: "emergency",
          balance: input.current_balance || 0,
          currency: input.currency || "IDR",
          is_active: true,
          is_system: false,
          metadata: metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return transformAccountToEmergencyFund(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Emergency fund created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create emergency fund: " + error.message);
    },
  });
}

export function useUpdateEmergencyFund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEmergencyFundInput) => {
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
        ...(updates.monthly_expenses !== undefined && { monthly_expenses: updates.monthly_expenses }),
        ...(updates.monthly_contribution !== undefined && { monthly_contribution: updates.monthly_contribution }),
        ...(updates.target_months !== undefined && { target_months: updates.target_months }),
        ...(updates.notes !== undefined && { notes: updates.notes?.trim() || null }),
      };

      const updateData: any = {
        metadata: newMetadata,
        updated_at: new Date().toISOString(),
      };

      if (updates.name) updateData.name = updates.name.trim();
      if (updates.currency) updateData.currency = updates.currency;
      if (updates.current_balance !== undefined) updateData.balance = updates.current_balance;

      const { data, error } = await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformAccountToEmergencyFund(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Emergency fund updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update emergency fund: " + error.message);
    },
  });
}

export function useEmergencyFundTransactions(fundId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...EMERGENCY_FUND_TRANSACTIONS_KEY, fundId],
    queryFn: async () => {
      if (!user?.id || !fundId) return [];

      // Get transactions from account_transactions for this emergency fund account
      const { data, error } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", fundId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      return (data || []).map(tx => ({
        id: tx.id,
        user_id: tx.user_id,
        account_id: tx.account_id,
        transaction_type: tx.transaction_type as "deposit" | "withdrawal" | "interest",
        amount: Number(tx.amount),
        description: tx.description,
        transaction_date: tx.transaction_date || tx.created_at,
        created_at: tx.created_at,
      })) as EmergencyFundTransaction[];
    },
    enabled: !!user?.id && !!fundId,
  });
}

export function useAddContribution() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const deposit = useDeposit();
  const withdraw = useWithdraw();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Use the account_transactions system via deposit/withdraw hooks
      if (input.transaction_type === "deposit" || input.transaction_type === "interest") {
        await deposit.mutateAsync({
          accountId: input.emergency_fund_id,
          amount: input.amount,
          description: input.description || (input.transaction_type === "interest" ? "Interest earned" : "Contribution"),
          currency: "IDR",
        });
      } else if (input.transaction_type === "withdrawal") {
        await withdraw.mutateAsync({
          accountId: input.emergency_fund_id,
          amount: input.amount,
          description: input.description || "Withdrawal",
          currency: "IDR",
        });
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_KEY });
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      
      const message = variables.transaction_type === "deposit" 
        ? "Contribution added successfully" 
        : variables.transaction_type === "withdrawal"
        ? "Withdrawal recorded successfully"
        : "Interest recorded successfully";
      toast.success(message);
    },
    onError: (error) => {
      toast.error("Failed to add transaction: " + error.message);
    },
  });
}
