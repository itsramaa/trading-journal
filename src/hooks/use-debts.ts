import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  debt_type: string;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  monthly_payment: number;
  due_date: number | null;
  start_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDebtInput {
  name: string;
  debt_type: string;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  monthly_payment: number;
  due_date?: number | null;
  start_date?: string | null;
  notes?: string | null;
}

export interface UpdateDebtInput extends Partial<CreateDebtInput> {
  id: string;
  is_active?: boolean;
}

const DEBTS_KEY = ["debts"];

export function useDebts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: DEBTS_KEY,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("is_active", true)
        .order("interest_rate", { ascending: false });

      if (error) throw error;
      return data as Debt[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDebtInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("debts")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          debt_type: input.debt_type,
          original_balance: input.original_balance,
          current_balance: input.current_balance,
          interest_rate: input.interest_rate,
          minimum_payment: input.minimum_payment,
          monthly_payment: input.monthly_payment,
          due_date: input.due_date,
          start_date: input.start_date,
          notes: input.notes?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Debt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      toast.success("Debt added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add debt: " + error.message);
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDebtInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("debts")
        .update({
          ...updates,
          name: updates.name?.trim(),
          notes: updates.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Debt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      toast.success("Debt updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update debt: " + error.message);
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("debts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      toast.success("Debt deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete debt: " + error.message);
    },
  });
}

export function useMakePayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      id, 
      amount, 
      accountId 
    }: { 
      id: string; 
      amount: number; 
      accountId?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // First get current debt
      const { data: debt, error: fetchError } = await supabase
        .from("debts")
        .select("current_balance, name")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // If account is specified, verify balance and deduct
      if (accountId) {
        const { data: account, error: accError } = await supabase
          .from("accounts")
          .select("balance, currency")
          .eq("id", accountId)
          .single();

        if (accError) throw accError;
        if (Number(account.balance) < amount) {
          throw new Error("Insufficient account balance");
        }

        // Deduct from account via account_transactions (trigger updates balance)
        const { error: txError } = await supabase
          .from("account_transactions")
          .insert({
            user_id: user.id,
            account_id: accountId,
            amount: amount,
            transaction_type: 'withdrawal',
            currency: account.currency,
            description: `Debt payment: ${debt.name}`,
          });

        if (txError) throw txError;
      }

      const newBalance = Math.max(0, Number(debt.current_balance) - amount);

      const { data, error } = await supabase
        .from("debts")
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Debt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    },
  });
}
