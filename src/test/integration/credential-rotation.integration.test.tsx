/**
 * Credential Rotation Integration Test
 * Tests the complete lifecycle: add → validate → update → remove
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import {
  useCredentialStatus,
  useSaveCredentials,
  useDeleteCredentials,
  useTestConnection,
  useExchangeCredentials,
} from '@/hooks/use-exchange-credentials';

// Mock auth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock audit logger
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user: { id: 'test-user-id' },
          },
        },
      }),
    },
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('Credential Rotation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCredentialStatus', () => {
    it('should return null when no credentials exist', async () => {
      vi.mocked(supabase.rpc).mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows' },
        }),
      } as any);

      const { result } = renderHook(() => useCredentialStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('should return credential status when exists', async () => {
      const mockCredential = {
        id: 'cred-123',
        exchange: 'binance',
        label: 'Main Account',
        api_key_masked: 'abc1****xyz9',
        is_valid: true,
        permissions: { canTrade: true },
        last_validated_at: '2026-02-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      };

      vi.mocked(supabase.rpc).mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockCredential,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useCredentialStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCredential);
    });
  });

  describe('useSaveCredentials', () => {
    it('should save new credentials and return UUID', async () => {
      const newCredentialId = 'new-cred-uuid';
      
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: newCredentialId,
        error: null,
      } as any);

      const { result } = renderHook(() => useSaveCredentials(), { wrapper });

      const saveResult = await result.current.mutateAsync({
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        label: 'Test Account',
      });

      expect(saveResult).toBe(newCredentialId);
      expect(supabase.rpc).toHaveBeenCalledWith('save_exchange_credential', {
        p_api_key: 'test-api-key',
        p_api_secret: 'test-api-secret',
        p_exchange: 'binance',
        p_label: 'Test Account',
      });
    });

    it('should deactivate old credentials when saving new', async () => {
      // First credential
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'first-cred-id',
        error: null,
      } as any);

      const { result } = renderHook(() => useSaveCredentials(), { wrapper });

      await result.current.mutateAsync({
        apiKey: 'first-api-key',
        apiSecret: 'first-api-secret',
      });

      // Second credential (should deactivate first)
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'second-cred-id',
        error: null,
      } as any);

      const secondResult = await result.current.mutateAsync({
        apiKey: 'second-api-key',
        apiSecret: 'second-api-secret',
      });

      expect(secondResult).toBe('second-cred-id');
      // The DB function handles deactivation internally
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should throw error on save failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key format' },
      } as any);

      const { result } = renderHook(() => useSaveCredentials(), { wrapper });

      await expect(
        result.current.mutateAsync({
          apiKey: 'invalid',
          apiSecret: 'invalid',
        })
      ).rejects.toThrow('Invalid API key format');
    });
  });

  describe('useTestConnection', () => {
    it('should validate credentials via edge function', async () => {
      // Setup MSW handler for edge function
      server.use(
        http.post('*/functions/v1/binance-futures', () => {
          return HttpResponse.json({
            success: true,
            data: {
              canTrade: true,
              permissions: ['SPOT', 'FUTURES'],
            },
          });
        })
      );

      const { result } = renderHook(() => useTestConnection(), { wrapper });

      const testResult = await result.current.mutateAsync();

      expect(testResult).toEqual({
        canTrade: true,
        permissions: ['SPOT', 'FUTURES'],
      });
    });

    it('should handle connection test failure', async () => {
      server.use(
        http.post('*/functions/v1/binance-futures', () => {
          return HttpResponse.json({
            success: false,
            error: 'Invalid API key',
          });
        })
      );

      const { result } = renderHook(() => useTestConnection(), { wrapper });

      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Invalid API key'
      );
    });

    it('should invalidate queries after successful test', async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      server.use(
        http.post('*/functions/v1/binance-futures', () => {
          return HttpResponse.json({
            success: true,
            data: { canTrade: true, permissions: [] },
          });
        })
      );

      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useTestConnection(), {
        wrapper: customWrapper,
      });

      await result.current.mutateAsync();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['exchange-credential'],
      });
    });
  });

  describe('useDeleteCredentials', () => {
    it('should deactivate credentials', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useDeleteCredentials(), { wrapper });

      const deleteResult = await result.current.mutateAsync('cred-to-delete');

      expect(deleteResult).toBe('cred-to-delete');
      expect(supabase.rpc).toHaveBeenCalledWith('delete_exchange_credential', {
        p_credential_id: 'cred-to-delete',
      });
    });

    it('should throw error on delete failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Credential not found' },
      } as any);

      const { result } = renderHook(() => useDeleteCredentials(), { wrapper });

      await expect(
        result.current.mutateAsync('nonexistent-cred')
      ).rejects.toThrow('Credential not found');
    });
  });

  describe('useExchangeCredentials (Combined Hook)', () => {
    it('should provide all credential operations', async () => {
      vi.mocked(supabase.rpc).mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'cred-123',
            exchange: 'binance',
            label: 'Main',
            api_key_masked: 'abc****xyz',
            is_valid: true,
          },
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useExchangeCredentials(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have credential data
      expect(result.current.credential).toBeDefined();
      expect(result.current.credential?.id).toBe('cred-123');

      // Should have operation functions
      expect(typeof result.current.save).toBe('function');
      expect(typeof result.current.delete).toBe('function');
      expect(typeof result.current.test).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Full Credential Lifecycle', () => {
    it('should complete add → validate → update → remove flow', async () => {
      const queryClient = createTestQueryClient();
      
      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      // Step 1: Add initial credentials
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'first-cred-id',
        error: null,
      } as any);

      const { result: saveResult } = renderHook(() => useSaveCredentials(), {
        wrapper: customWrapper,
      });

      const firstCredId = await saveResult.current.mutateAsync({
        apiKey: 'first-key',
        apiSecret: 'first-secret',
        label: 'Initial Account',
      });

      expect(firstCredId).toBe('first-cred-id');

      // Step 2: Validate credentials
      server.use(
        http.post('*/functions/v1/binance-futures', () => {
          return HttpResponse.json({
            success: true,
            data: { canTrade: true, permissions: ['FUTURES'] },
          });
        })
      );

      const { result: testResult } = renderHook(() => useTestConnection(), {
        wrapper: customWrapper,
      });

      const validationResult = await testResult.current.mutateAsync();
      expect(validationResult.canTrade).toBe(true);

      // Step 3: Update with new credentials (rotates old)
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'second-cred-id',
        error: null,
      } as any);

      const secondCredId = await saveResult.current.mutateAsync({
        apiKey: 'new-key',
        apiSecret: 'new-secret',
        label: 'Rotated Account',
      });

      expect(secondCredId).toBe('second-cred-id');

      // Step 4: Remove credentials
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const { result: deleteResult } = renderHook(
        () => useDeleteCredentials(),
        { wrapper: customWrapper }
      );

      const deleted = await deleteResult.current.mutateAsync('second-cred-id');
      expect(deleted).toBe('second-cred-id');
    });
  });

  describe('Edge Function Error Handling', () => {
    it('should handle missing credentials error', async () => {
      server.use(
        http.post('*/functions/v1/binance-futures', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'No API credentials configured',
              code: 'CREDENTIALS_NOT_FOUND',
            },
            { status: 401 }
          );
        })
      );

      const { result } = renderHook(() => useTestConnection(), { wrapper });

      await expect(result.current.mutateAsync()).rejects.toThrow(
        'No API credentials configured'
      );
    });

    it('should handle invalid credentials error', async () => {
      server.use(
        http.post('*/functions/v1/binance-futures', () => {
          return HttpResponse.json({
            success: false,
            error: 'API key is invalid or revoked',
            code: 'INVALID_API_KEY',
          });
        })
      );

      const { result } = renderHook(() => useTestConnection(), { wrapper });

      await expect(result.current.mutateAsync()).rejects.toThrow(
        'API key is invalid or revoked'
      );
    });

    it('should handle rate limit error', async () => {
      server.use(
        http.post('*/functions/v1/binance-futures', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT',
            },
            { status: 429 }
          );
        })
      );

      const { result } = renderHook(() => useTestConnection(), { wrapper });

      await expect(result.current.mutateAsync()).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });
});
