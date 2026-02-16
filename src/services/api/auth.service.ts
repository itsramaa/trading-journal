/**
 * Authentication Service
 * 
 * Interface + Supabase implementation for auth operations.
 * To swap backend: implement IAuthService with your auth provider.
 */

import type { ApiResponse, ServiceUser, ServiceSession } from './types';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IAuthService {
  getSession(): Promise<ApiResponse<ServiceSession>>;
  signUp(email: string, password: string, fullName: string): Promise<ApiResponse<ServiceUser>>;
  signIn(email: string, password: string): Promise<ApiResponse<ServiceSession>>;
  signInWithGoogle(): Promise<ApiResponse<void>>;
  signOut(): Promise<ApiResponse<void>>;
  resetPassword(email: string): Promise<ApiResponse<void>>;
  updatePassword(newPassword: string): Promise<ApiResponse<void>>;
  onAuthStateChange(callback: (event: string, session: ServiceSession | null) => void): () => void;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';

export class SupabaseAuthService implements IAuthService {
  async getSession(): Promise<ApiResponse<ServiceSession>> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return { data: null, error: error.message };
    if (!session) return { data: null, error: null };

    return {
      data: {
        accessToken: session.access_token,
        user: this.mapUser(session.user),
      },
      error: null,
    };
  }

  async signUp(email: string, password: string, fullName: string): Promise<ApiResponse<ServiceUser>> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });

    if (error) return { data: null, error: error.message };

    // Check for existing unconfirmed user
    if (data?.user && !data?.session && data.user.identities?.length === 0) {
      return { data: null, error: 'Email already registered' };
    }

    return {
      data: data?.user ? this.mapUser(data.user) : null,
      error: null,
    };
  }

  async signIn(email: string, password: string): Promise<ApiResponse<ServiceSession>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { data: null, error: error.message };

    return {
      data: {
        accessToken: data.session.access_token,
        user: this.mapUser(data.user),
      },
      error: null,
    };
  }

  async signInWithGoogle(): Promise<ApiResponse<void>> {
    const { lovable } = await import('@/integrations/lovable/index');
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if (result.error) return { data: null, error: result.error.message };
    return { data: undefined, error: null };
  }

  async signOut(): Promise<ApiResponse<void>> {
    const { error } = await supabase.auth.signOut();
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  }

  async resetPassword(email: string): Promise<ApiResponse<void>> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?type=recovery`,
    });
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  }

  async updatePassword(newPassword: string): Promise<ApiResponse<void>> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { data: null, error: error.message };
    return { data: undefined, error: null };
  }

  onAuthStateChange(callback: (event: string, session: ServiceSession | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(
        event,
        session
          ? { accessToken: session.access_token, user: this.mapUser(session.user) }
          : null
      );
    });

    return () => subscription.unsubscribe();
  }

  private mapUser(user: any): ServiceUser {
    return {
      id: user.id,
      email: user.email || null,
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
    };
  }
}
