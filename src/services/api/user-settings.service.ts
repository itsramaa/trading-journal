/**
 * User Settings & Profile Service
 * 
 * Interface + Supabase implementation for user preferences.
 * To swap backend: implement IUserSettingsService with your API client.
 */

import type { ApiResponse } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserSettings {
  id: string;
  userId: string;
  defaultCurrency: string;
  theme: string;
  language: string;
  notificationsEnabled: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  activeTradeMode: string;
  activeTradingStyle: string;
  useBinanceHistory: boolean;
  binanceDailySyncQuota: number;
  tradeRetentionDays: number | null;
  defaultTradingAccountId: string | null;
  aiSettings: Record<string, boolean | number | string> | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferredCurrency: string;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IUserSettingsService {
  getSettings(userId: string): Promise<ApiResponse<UserSettings>>;
  updateSettings(userId: string, updates: Partial<UserSettings>): Promise<ApiResponse<UserSettings>>;
  getProfile(userId: string): Promise<ApiResponse<UserProfile>>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>>;
  uploadAvatar(userId: string, file: File): Promise<ApiResponse<string>>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';

export class SupabaseUserSettingsService implements IUserSettingsService {
  async getSettings(userId: string): Promise<ApiResponse<UserSettings>> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error?.code === 'PGRST116') {
      // Create defaults
      const { data: created, error: createErr } = await supabase
        .from('user_settings')
        .insert({ user_id: userId, default_currency: 'USD', theme: 'dark', language: 'en' })
        .select()
        .single();
      if (createErr) return { data: null, error: createErr.message };
      return { data: this.mapSettings(created), error: null };
    }

    if (error) return { data: null, error: error.message };
    return { data: this.mapSettings(data), error: null };
  }

  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.defaultCurrency !== undefined) dbUpdates.default_currency = updates.defaultCurrency;
    if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.notificationsEnabled !== undefined) dbUpdates.notifications_enabled = updates.notificationsEnabled;
    if (updates.activeTradeMode !== undefined) dbUpdates.active_trade_mode = updates.activeTradeMode;
    if (updates.activeTradingStyle !== undefined) dbUpdates.active_trading_style = updates.activeTradingStyle;
    if (updates.useBinanceHistory !== undefined) dbUpdates.use_binance_history = updates.useBinanceHistory;
    if (updates.binanceDailySyncQuota !== undefined) dbUpdates.binance_daily_sync_quota = updates.binanceDailySyncQuota;
    if (updates.tradeRetentionDays !== undefined) dbUpdates.trade_retention_days = updates.tradeRetentionDays;
    if (updates.defaultTradingAccountId !== undefined) dbUpdates.default_trading_account_id = updates.defaultTradingAccountId;
    if (updates.aiSettings !== undefined) dbUpdates.ai_settings = updates.aiSettings;

    const { data, error } = await supabase
      .from('user_settings')
      .update(dbUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: this.mapSettings(data), error: null };
  }

  async getProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error?.code === 'PGRST116') {
      return { data: null, error: null }; // No profile yet
    }
    if (error) return { data: null, error: error.message };
    return { data: this.mapProfile(data), error: null };
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

    const { data, error } = await supabase
      .from('users_profile')
      .update(dbUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: this.mapProfile(data), error: null };
  }

  async uploadAvatar(userId: string, file: File): Promise<ApiResponse<string>> {
    if (file.size > 2 * 1024 * 1024) return { data: null, error: 'File size must be less than 2MB' };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return { data: null, error: 'Invalid file type' };

    const ext = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadErr) return { data: null, error: uploadErr.message };

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

    await supabase.from('users_profile')
      .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    return { data: urlData.publicUrl, error: null };
  }

  private mapSettings(row: any): UserSettings {
    return {
      id: row.id,
      userId: row.user_id,
      defaultCurrency: row.default_currency,
      theme: row.theme,
      language: row.language,
      notificationsEnabled: row.notifications_enabled,
      subscriptionPlan: row.subscription_plan,
      subscriptionStatus: row.subscription_status,
      activeTradeMode: row.active_trade_mode,
      activeTradingStyle: row.active_trading_style,
      useBinanceHistory: row.use_binance_history ?? true,
      binanceDailySyncQuota: row.binance_daily_sync_quota ?? 10,
      tradeRetentionDays: row.trade_retention_days,
      defaultTradingAccountId: row.default_trading_account_id,
      aiSettings: row.ai_settings as Record<string, boolean | number | string> | null,
    };
  }

  private mapProfile(row: any): UserProfile {
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      preferredCurrency: row.preferred_currency,
    };
  }
}
