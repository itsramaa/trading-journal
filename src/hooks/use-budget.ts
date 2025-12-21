import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budgeted_amount: number;
  spent_amount: number;
  period: string;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

// Budget transactions are now stored in account_transactions with category_id
export interface BudgetTransaction {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  budgeted_amount: number;
  period?: string;
  account_id?: string | null;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}

export interface CreateBudgetTransactionInput {
  category_id: string;
  account_id?: string | null;
  amount: number;
  description?: string;
  transaction_date?: string;
}

const BUDGET_CATEGORIES_KEY = ["budget-categories"];
const BUDGET_TRANSACTIONS_KEY = ["budget-transactions"];

export function useBudgetCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: BUDGET_CATEGORIES_KEY,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as BudgetCategory[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateBudgetCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("budget_categories")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          icon: input.icon || null,
          color: input.color || null,
          budgeted_amount: input.budgeted_amount,
          period: input.period || "monthly",
          account_id: input.account_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_CATEGORIES_KEY });
      toast.success("Budget category created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create category: " + error.message);
    },
  });
}

export function useUpdateBudgetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCategoryInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("budget_categories")
        .update({
          ...updates,
          name: updates.name?.trim(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as BudgetCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_CATEGORIES_KEY });
      toast.success("Budget category updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update category: " + error.message);
    },
  });
}

export function useDeleteBudgetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_CATEGORIES_KEY });
      toast.success("Budget category deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete category: " + error.message);
    },
  });
}

export function useBudgetTransactions(categoryId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...BUDGET_TRANSACTIONS_KEY, categoryId],
    queryFn: async () => {
      if (!user?.id) return [];

      // Query account_transactions with category_id (expense type)
      let query = supabase
        .from("account_transactions")
        .select("*")
        .eq("transaction_type", "expense")
        .order("created_at", { ascending: false });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      } else {
        query = query.not("category_id", "is", null);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      
      return (data || []).map(tx => ({
        id: tx.id,
        user_id: tx.user_id,
        category_id: tx.category_id!,
        account_id: tx.account_id,
        amount: Number(tx.amount),
        description: tx.description,
        transaction_date: tx.transaction_date || tx.created_at,
        created_at: tx.created_at,
      })) as BudgetTransaction[];
    },
    enabled: !!user?.id,
  });
}

export function useAddBudgetTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBudgetTransactionInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Insert into account_transactions with transaction_type = 'expense' and category_id
      const { data, error } = await supabase
        .from("account_transactions")
        .insert({
          user_id: user.id,
          account_id: input.account_id || null,
          category_id: input.category_id,
          transaction_type: "expense",
          amount: input.amount,
          currency: "IDR",
          description: input.description?.trim() || null,
          transaction_date: input.transaction_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        user_id: data.user_id,
        category_id: data.category_id!,
        account_id: data.account_id,
        amount: Number(data.amount),
        description: data.description,
        transaction_date: data.transaction_date || data.created_at,
        created_at: data.created_at,
      } as BudgetTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_CATEGORIES_KEY });
      queryClient.invalidateQueries({ queryKey: BUDGET_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      toast.success("Expense recorded successfully");
    },
    onError: (error) => {
      toast.error("Failed to record expense: " + error.message);
    },
  });
}

export function useDeleteBudgetTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_CATEGORIES_KEY });
      queryClient.invalidateQueries({ queryKey: BUDGET_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      toast.success("Transaction deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete transaction: " + error.message);
    },
  });
}

// Helper to reset spent amounts at period start
export function useResetBudgetSpent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryIds: string[]) => {
      const { error } = await supabase
        .from("budget_categories")
        .update({ spent_amount: 0 })
        .in("id", categoryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGET_CATEGORIES_KEY });
      toast.success("Budget spending reset successfully");
    },
    onError: (error) => {
      toast.error("Failed to reset budget: " + error.message);
    },
  });
}
