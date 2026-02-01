/**
 * Exchange Credentials Hook
 * CRUD operations for API key management with Vault encryption
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CredentialStatus {
  id: string;
  exchange: string;
  label: string;
  api_key_masked: string;
  is_valid: boolean | null;
  permissions: Record<string, unknown> | null;
  last_validated_at: string | null;
  created_at: string;
}

export interface SaveCredentialParams {
  apiKey: string;
  apiSecret: string;
  label?: string;
  exchange?: string;
}

/**
 * Hook to get current credential status (masked)
 */
export function useCredentialStatus(exchange = 'binance') {
  return useQuery({
    queryKey: ['exchange-credential', exchange],
    queryFn: async (): Promise<CredentialStatus | null> => {
      const { data, error } = await supabase
        .rpc('get_credential_status', { p_exchange: exchange })
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching credential status:', error);
        return null;
      }
      
      return data as CredentialStatus | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to save new credentials (encrypted)
 */
export function useSaveCredentials() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ apiKey, apiSecret, label = 'Main Account', exchange = 'binance' }: SaveCredentialParams) => {
      const { data, error } = await supabase
        .rpc('save_exchange_credential', {
          p_api_key: apiKey,
          p_api_secret: apiSecret,
          p_exchange: exchange,
          p_label: label,
        });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-credential'] });
      queryClient.invalidateQueries({ queryKey: ['binance', 'connection'] });
    },
  });
}

/**
 * Hook to delete (deactivate) credentials
 */
export function useDeleteCredentials() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (credentialId: string) => {
      const { data, error } = await supabase
        .rpc('delete_exchange_credential', {
          p_credential_id: credentialId,
        });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-credential'] });
      queryClient.invalidateQueries({ queryKey: ['binance', 'connection'] });
      toast.success('API credentials removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove credentials');
    },
  });
}

/**
 * Hook to test connection with current credentials
 */
export function useTestConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'validate' }),
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Connection test failed');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-credential'] });
      queryClient.invalidateQueries({ queryKey: ['binance', 'connection'] });
    },
  });
}

/**
 * Combined hook for all credential operations
 */
export function useExchangeCredentials(exchange = 'binance') {
  const status = useCredentialStatus(exchange);
  const saveCredentials = useSaveCredentials();
  const deleteCredentials = useDeleteCredentials();
  const testConnection = useTestConnection();
  
  return {
    // Current credential status
    credential: status.data,
    isLoading: status.isLoading,
    isError: status.isError,
    
    // Operations
    save: saveCredentials.mutateAsync,
    isSaving: saveCredentials.isPending,
    
    delete: deleteCredentials.mutateAsync,
    isDeleting: deleteCredentials.isPending,
    
    test: testConnection.mutateAsync,
    isTesting: testConnection.isPending,
    
    // Refetch
    refetch: status.refetch,
  };
}
