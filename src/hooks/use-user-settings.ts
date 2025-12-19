/**
 * React Query hooks for user settings management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type UserSettings = Tables<'user_settings'>;

export const userSettingsKeys = {
  all: ['user-settings'] as const,
  current: () => [...userSettingsKeys.all, 'current'] as const,
};

export function useUserSettings() {
  return useQuery({
    queryKey: userSettingsKeys.current(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // If no settings exist, create default ones
      if (error?.code === 'PGRST116') {
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            default_currency: 'USD',
            theme: 'dark',
            timezone: 'UTC+7',
            notifications_enabled: true,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return newSettings as UserSettings;
      }
      
      if (error) throw error;
      return data as UserSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userSettingsKeys.current() });
    },
  });
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { fullname?: string; bio?: string; avatar_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('users_profile')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      // Note: Full account deletion requires an edge function or admin action
      // For now, we'll sign out the user
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
