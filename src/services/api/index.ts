/**
 * API Service Registry
 * 
 * Central factory for all service instances.
 * To swap backend: replace Supabase*Service with your custom implementations.
 * 
 * Usage in hooks:
 *   import { services } from '@/services/api';
 *   const result = await services.credentials.getStatus('binance');
 * 
 * To swap implementation:
 *   1. Create a new class implementing the interface (e.g., RestCredentialService)
 *   2. Replace the instance in createServiceRegistry()
 *   3. All hooks automatically use the new implementation
 */

import type { ICredentialService } from './credentials.service';
import type { ITradeService } from './trades.service';
import type { IAuthService } from './auth.service';
import type { IUserSettingsService } from './user-settings.service';
import type { IMarketDataService } from './market-data.service';

import { SupabaseCredentialService } from './credentials.service';
import { SupabaseTradeService } from './trades.service';
import { SupabaseAuthService } from './auth.service';
import { SupabaseUserSettingsService } from './user-settings.service';
import { SupabaseMarketDataService } from './market-data.service';

// ─── Service Registry Interface ──────────────────────────────────────────────

export interface ServiceRegistry {
  credentials: ICredentialService;
  trades: ITradeService;
  auth: IAuthService;
  userSettings: IUserSettingsService;
  marketData: IMarketDataService;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function createServiceRegistry(): ServiceRegistry {
  return {
    credentials: new SupabaseCredentialService(),
    trades: new SupabaseTradeService(),
    auth: new SupabaseAuthService(),
    userSettings: new SupabaseUserSettingsService(),
    marketData: new SupabaseMarketDataService(),
  };
}

/**
 * Singleton service registry instance.
 * Import this in hooks to access backend services.
 */
export const services = createServiceRegistry();

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { ApiResponse, PaginatedResponse, ServiceUser, ServiceSession } from './types';
export type { ICredentialService, CredentialStatus, SaveCredentialParams } from './credentials.service';
export type { ITradeService, TradeEntry, CreateTradeInput, UpdateTradeInput, TradeStats, TradeStatsFilters } from './trades.service';
export type { IAuthService } from './auth.service';
export type { IUserSettingsService, UserSettings, UserProfile } from './user-settings.service';
export type { IMarketDataService, TickerData, KlineData, FundingRateData, OpenInterestData } from './market-data.service';
