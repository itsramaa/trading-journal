import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface FireSettings {
  id: string;
  user_id: string;
  current_age: number;
  target_retirement_age: number;
  monthly_income: number;
  monthly_expenses: number;
  expected_annual_return: number;
  inflation_rate: number;
  safe_withdrawal_rate: number;
  custom_fire_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFireSettingsInput {
  current_age: number;
  target_retirement_age: number;
  monthly_income: number;
  monthly_expenses: number;
  expected_annual_return: number;
  inflation_rate: number;
  safe_withdrawal_rate: number;
  custom_fire_number?: number | null;
}

export interface UpdateFireSettingsInput extends Partial<CreateFireSettingsInput> {
  id: string;
}

const FIRE_SETTINGS_KEY = ["fire-settings"];

export function useFireSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: FIRE_SETTINGS_KEY,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("fire_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as FireSettings | null;
    },
    enabled: !!user?.id,
  });
}

export function useCreateFireSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateFireSettingsInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("fire_settings")
        .insert({
          user_id: user.id,
          current_age: input.current_age,
          target_retirement_age: input.target_retirement_age,
          monthly_income: input.monthly_income,
          monthly_expenses: input.monthly_expenses,
          expected_annual_return: input.expected_annual_return,
          inflation_rate: input.inflation_rate,
          safe_withdrawal_rate: input.safe_withdrawal_rate,
          custom_fire_number: input.custom_fire_number || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FireSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRE_SETTINGS_KEY });
      toast.success("FIRE settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save FIRE settings: " + error.message);
    },
  });
}

export function useUpdateFireSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateFireSettingsInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("fire_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FireSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRE_SETTINGS_KEY });
      toast.success("FIRE settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update FIRE settings: " + error.message);
    },
  });
}

export function useUpsertFireSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateFireSettingsInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("fire_settings")
        .upsert({
          user_id: user.id,
          current_age: input.current_age,
          target_retirement_age: input.target_retirement_age,
          monthly_income: input.monthly_income,
          monthly_expenses: input.monthly_expenses,
          expected_annual_return: input.expected_annual_return,
          inflation_rate: input.inflation_rate,
          safe_withdrawal_rate: input.safe_withdrawal_rate,
          custom_fire_number: input.custom_fire_number || null,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data as FireSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRE_SETTINGS_KEY });
      toast.success("FIRE settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save FIRE settings: " + error.message);
    },
  });
}
