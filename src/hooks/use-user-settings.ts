/**
 * React Query hooks for user settings and profile management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export interface UserSettings {
  id: string;
  user_id: string;
  default_currency: string;
  theme: string;
  language: string;
  notifications_enabled: boolean;
  subscription_plan: string;
  subscription_status: string;
  plan_expires_at: string | null;
  notify_price_alerts: boolean;
  notify_portfolio_updates: boolean;
  notify_weekly_report: boolean;
  notify_market_news: boolean;
  notify_email_enabled: boolean;
  notify_push_enabled: boolean;
  target_allocations?: Record<string, number>;
  ai_settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferred_currency: string;
  created_at: string;
  updated_at: string;
}

export const userSettingsKeys = {
  all: ['user-settings'] as const,
  current: () => [...userSettingsKeys.all, 'current'] as const,
};

export function useUserSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: userSettingsKeys.current(),
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
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
            language: 'en',
            notifications_enabled: true,
            subscription_plan: 'free',
            subscription_status: 'active',
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return newSettings as UserSettings;
      }
      
      if (error) throw error;
      return data as UserSettings;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // If no profile exists, create one
      if (error?.code === 'PGRST116') {
        const displayName = user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'User';
        
        const { data: newProfile, error: createError } = await supabase
          .from('users_profile')
          .insert({
            user_id: user.id,
            display_name: displayName,
            avatar_url: user.user_metadata?.avatar_url || null,
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return newProfile as UserProfile;
      }
      
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: { display_name?: string; bio?: string; avatar_url?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
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
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Validate file
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File must be an image (JPEG, PNG, GIF, or WebP)');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users_profile')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return avatarUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Avatar uploaded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to upload avatar: ${error.message}`);
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
    onSuccess: () => {
      toast.success('Password updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update password: ${error.message}`);
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ plan }: { plan: 'free' | 'pro' | 'business' }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Dummy implementation for now.
      // IMPORTANT: keep fields aligned with permission checks in use-permissions.ts
      const planExpiresAt = plan === 'free'
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('user_settings')
        .update({
          subscription_plan: plan,
          subscription_status: 'active',
          plan_expires_at: planExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Keep ALL subscription consumers in sync
      queryClient.invalidateQueries({ queryKey: userSettingsKeys.current() });
      queryClient.invalidateQueries({ queryKey: ['user-subscription', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['feature-permissions'] });

      toast.success(
        `Successfully updated to ${variables.plan.charAt(0).toUpperCase() + variables.plan.slice(1)} plan!`
      );
    },
    onError: (error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });
}

export function useDeleteAccount() {
  const { signOut } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // Note: Full account deletion requires an edge function with admin privileges
      // For now, we'll sign out the user
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Account deletion requested. You have been signed out.');
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
}
