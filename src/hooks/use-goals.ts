import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  monthly_contribution: number;
  priority: string;
  color: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  monthly_contribution: number;
  priority: string;
  color?: string;
  notes?: string;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  id: string;
}

export function useGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-goals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .order("deadline", { ascending: true });

      if (error) throw error;
      return data as FinancialGoal[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("financial_goals")
        .insert({
          user_id: user.id,
          name: input.name,
          icon: input.icon,
          target_amount: input.target_amount,
          current_amount: input.current_amount,
          deadline: input.deadline,
          monthly_contribution: input.monthly_contribution,
          priority: input.priority,
          color: input.color || "blue",
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-goals"] });
      toast.success("Goal created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create goal: ${error.message}`);
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGoalInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("financial_goals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-goals"] });
      toast.success("Goal updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update goal: ${error.message}`);
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-goals"] });
      toast.success("Goal deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete goal: ${error.message}`);
    },
  });
}

export function useAddFundsToGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // First get current amount
      const { data: goal, error: fetchError } = await supabase
        .from("financial_goals")
        .select("current_amount")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const newAmount = (goal?.current_amount || 0) + amount;

      const { data, error } = await supabase
        .from("financial_goals")
        .update({ current_amount: newAmount })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-goals"] });
      toast.success("Funds added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add funds: ${error.message}`);
    },
  });
}
