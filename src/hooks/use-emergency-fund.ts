import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

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
  emergency_fund_id: string;
  account_id: string | null;
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

export function useEmergencyFund() {
  const { user } = useAuth();

  return useQuery({
    queryKey: EMERGENCY_FUND_KEY,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("emergency_funds")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as EmergencyFund | null;
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

      const { data, error } = await supabase
        .from("emergency_funds")
        .insert({
          user_id: user.id,
          name: input.name?.trim() || "Emergency Fund",
          current_balance: input.current_balance || 0,
          monthly_expenses: input.monthly_expenses,
          monthly_contribution: input.monthly_contribution,
          target_months: input.target_months || 6,
          currency: input.currency || "IDR",
          notes: input.notes?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmergencyFund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_KEY });
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

      const { data, error } = await supabase
        .from("emergency_funds")
        .update({
          ...updates,
          name: updates.name?.trim(),
          notes: updates.notes?.trim() || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as EmergencyFund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_KEY });
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

      const { data, error } = await supabase
        .from("emergency_fund_transactions")
        .select("*")
        .eq("emergency_fund_id", fundId)
        .order("transaction_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as EmergencyFundTransaction[];
    },
    enabled: !!user?.id && !!fundId,
  });
}

export function useAddContribution() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("emergency_fund_transactions")
        .insert({
          user_id: user.id,
          emergency_fund_id: input.emergency_fund_id,
          account_id: input.account_id || null,
          transaction_type: input.transaction_type,
          amount: input.amount,
          description: input.description?.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmergencyFundTransaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_KEY });
      queryClient.invalidateQueries({ queryKey: EMERGENCY_FUND_TRANSACTIONS_KEY });
      
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
