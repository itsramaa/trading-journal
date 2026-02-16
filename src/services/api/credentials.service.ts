/**
 * Exchange Credentials Service
 * 
 * Interface + Supabase implementation for credential CRUD.
 * To swap backend: implement ICredentialService with your API client.
 */

import type { ApiResponse } from './types';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface CredentialStatus {
  id: string;
  exchange: string;
  label: string;
  apiKeyMasked: string;
  isValid: boolean | null;
  permissions: Record<string, unknown> | null;
  lastValidatedAt: string | null;
  createdAt: string;
}

export interface SaveCredentialParams {
  apiKey: string;
  apiSecret: string;
  label?: string;
  exchange?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  permissions?: Record<string, unknown>;
}

export interface ICredentialService {
  getStatus(exchange: string): Promise<ApiResponse<CredentialStatus>>;
  save(params: SaveCredentialParams): Promise<ApiResponse<string>>;
  delete(credentialId: string): Promise<ApiResponse<boolean>>;
  testConnection(accessToken: string): Promise<ApiResponse<ConnectionTestResult>>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';

export class SupabaseCredentialService implements ICredentialService {
  async getStatus(exchange = 'binance'): Promise<ApiResponse<CredentialStatus>> {
    const { data, error } = await supabase
      .rpc('get_credential_status', { p_exchange: exchange })
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error: error.message };
    }

    if (!data) return { data: null, error: null };

    return {
      data: {
        id: data.id,
        exchange: data.exchange,
        label: data.label,
        apiKeyMasked: data.api_key_masked,
        isValid: data.is_valid,
        permissions: data.permissions as Record<string, unknown> | null,
        lastValidatedAt: data.last_validated_at,
        createdAt: data.created_at,
      },
      error: null,
    };
  }

  async save(params: SaveCredentialParams): Promise<ApiResponse<string>> {
    const { data, error } = await supabase.rpc('save_exchange_credential', {
      p_api_key: params.apiKey,
      p_api_secret: params.apiSecret,
      p_exchange: params.exchange || 'binance',
      p_label: params.label || 'Main Account',
    });

    if (error) return { data: null, error: error.message };
    return { data: data as string, error: null };
  }

  async delete(credentialId: string): Promise<ApiResponse<boolean>> {
    const { data, error } = await supabase.rpc('delete_exchange_credential', {
      p_credential_id: credentialId,
    });

    if (error) return { data: null, error: error.message };
    return { data: !!data, error: null };
  }

  async testConnection(accessToken: string): Promise<ApiResponse<ConnectionTestResult>> {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'validate' }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      return { data: null, error: result.error || 'Connection test failed' };
    }

    return { data: result.data, error: null };
  }
}
