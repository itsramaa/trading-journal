/**
 * useStrategySharing - Hook for sharing strategies with other traders
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareResult {
  shareToken: string;
  shareUrl: string;
}

export function useStrategySharing(strategyId?: string) {
  const queryClient = useQueryClient();

  // Get share status for a strategy
  const { data: shareStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['strategy-share-status', strategyId],
    queryFn: async () => {
      if (!strategyId) return null;
      
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('share_token, is_shared')
        .eq('id', strategyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!strategyId,
  });

  // Enable sharing for a strategy
  const enableSharing = useMutation({
    mutationFn: async (id: string): Promise<ShareResult> => {
      // Generate share token using database function
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');
      
      if (tokenError) throw tokenError;
      
      const shareToken = tokenData as string;
      
      // Update strategy with share token
      const { error } = await supabase
        .from('trading_strategies')
        .update({ 
          share_token: shareToken,
          is_shared: true 
        })
        .eq('id', id);
      
      if (error) throw error;
      
      const shareUrl = `${window.location.origin}/shared/strategy/${shareToken}`;
      return { shareToken, shareUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-share-status', strategyId] });
      queryClient.invalidateQueries({ queryKey: ['trading-strategies'] });
      toast.success('Strategy sharing enabled');
    },
    onError: (error) => {
      toast.error('Failed to enable sharing', {
        description: error.message,
      });
    },
  });

  // Disable sharing for a strategy
  const disableSharing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trading_strategies')
        .update({ 
          share_token: null,
          is_shared: false 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-share-status', strategyId] });
      queryClient.invalidateQueries({ queryKey: ['trading-strategies'] });
      toast.success('Strategy sharing disabled');
    },
    onError: (error) => {
      toast.error('Failed to disable sharing', {
        description: error.message,
      });
    },
  });

  // Clone a shared strategy to user's account
  const cloneStrategy = useMutation({
    mutationFn: async (shareToken: string) => {
      // First, get the shared strategy with owner info
      const { data: sharedStrategy, error: fetchError } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_shared', true)
        .single();
      
      if (fetchError) throw new Error('Strategy not found or not shared');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to clone a strategy');

      // Get cloner's display name for notification
      const { data: clonerProfile } = await supabase
        .from('users_profile')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      
      // Create a copy for the current user
      const { data, error } = await supabase
        .from('trading_strategies')
        .insert({
          user_id: user.id,
          name: `${sharedStrategy.name} (Copy)`,
          description: sharedStrategy.description,
          tags: sharedStrategy.tags,
          color: sharedStrategy.color,
          timeframe: sharedStrategy.timeframe,
          market_type: sharedStrategy.market_type,
          min_confluences: sharedStrategy.min_confluences,
          min_rr: sharedStrategy.min_rr,
          valid_pairs: sharedStrategy.valid_pairs,
          entry_rules: sharedStrategy.entry_rules,
          exit_rules: sharedStrategy.exit_rules,
          source: 'shared',
          source_url: `${window.location.origin}/shared/strategy/${shareToken}`,
          // Don't copy share settings
          share_token: null,
          is_shared: false,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Send notification to strategy owner (don't await, fire and forget)
      if (sharedStrategy.user_id !== user.id) {
        supabase.functions.invoke('strategy-clone-notify', {
          body: {
            strategyId: sharedStrategy.id,
            strategyName: sharedStrategy.name,
            ownerUserId: sharedStrategy.user_id,
            clonerDisplayName: clonerProfile?.display_name || user.email?.split('@')[0] || 'A trader',
          },
        }).catch(err => console.warn('Clone notification failed:', err));
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-strategies'] });
      toast.success('Strategy cloned to your account');
    },
    onError: (error) => {
      toast.error('Failed to clone strategy', {
        description: error.message,
      });
    },
  });

  // Get share URL from token
  const getShareUrl = (token: string) => {
    return `${window.location.origin}/shared/strategy/${token}`;
  };

  return {
    shareStatus,
    isLoadingStatus,
    enableSharing,
    disableSharing,
    cloneStrategy,
    getShareUrl,
    isShared: shareStatus?.is_shared ?? false,
    shareToken: shareStatus?.share_token ?? null,
    shareUrl: shareStatus?.share_token 
      ? getShareUrl(shareStatus.share_token) 
      : null,
  };
}

// Fetch shared strategy by token (for public view)
export function useSharedStrategy(shareToken: string) {
  return useQuery({
    queryKey: ['shared-strategy', shareToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_shared', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!shareToken,
  });
}
