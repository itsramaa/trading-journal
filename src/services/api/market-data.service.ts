/**
 * Market Data Service
 * 
 * Interface + Supabase Edge Function implementation for market data.
 * To swap backend: implement IMarketDataService with your API client.
 */

import type { ApiResponse } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high: number;
  low: number;
}

export interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
}

export interface OpenInterestData {
  symbol: string;
  openInterest: number;
  timestamp: number;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IMarketDataService {
  getTicker(symbol: string): Promise<ApiResponse<TickerData>>;
  getTickers(symbols: string[]): Promise<ApiResponse<TickerData[]>>;
  getKlines(symbol: string, interval: string, limit?: number): Promise<ApiResponse<KlineData[]>>;
  getFundingRate(symbol: string): Promise<ApiResponse<FundingRateData>>;
  getOpenInterest(symbol: string): Promise<ApiResponse<OpenInterestData>>;
}

// ─── Supabase Edge Function Implementation ───────────────────────────────────

import { supabase } from '@/integrations/supabase/client';

export class SupabaseMarketDataService implements IMarketDataService {
  async getTicker(symbol: string): Promise<ApiResponse<TickerData>> {
    const { data, error } = await supabase.functions.invoke('public-ticker', {
      body: { symbol },
    });

    if (error) return { data: null, error: error.message };
    if (!data?.success) return { data: null, error: data?.error || 'Failed to fetch ticker' };

    return { data: data.data as TickerData, error: null };
  }

  async getTickers(symbols: string[]): Promise<ApiResponse<TickerData[]>> {
    const { data, error } = await supabase.functions.invoke('public-ticker', {
      body: { symbols },
    });

    if (error) return { data: null, error: error.message };
    if (!data?.success) return { data: null, error: data?.error || 'Failed to fetch tickers' };

    return { data: data.data as TickerData[], error: null };
  }

  async getKlines(symbol: string, interval: string, limit = 100): Promise<ApiResponse<KlineData[]>> {
    const { data, error } = await supabase.functions.invoke('binance-market-data', {
      body: { action: 'klines', symbol, interval, limit },
    });

    if (error) return { data: null, error: error.message };
    if (!data?.success) return { data: null, error: data?.error || 'Failed to fetch klines' };

    return { data: data.data as KlineData[], error: null };
  }

  async getFundingRate(symbol: string): Promise<ApiResponse<FundingRateData>> {
    const { data, error } = await supabase.functions.invoke('binance-market-data', {
      body: { action: 'fundingRate', symbol },
    });

    if (error) return { data: null, error: error.message };
    if (!data?.success) return { data: null, error: data?.error || 'Failed to fetch funding rate' };

    return { data: data.data as FundingRateData, error: null };
  }

  async getOpenInterest(symbol: string): Promise<ApiResponse<OpenInterestData>> {
    const { data, error } = await supabase.functions.invoke('binance-market-data', {
      body: { action: 'openInterest', symbol },
    });

    if (error) return { data: null, error: error.message };
    if (!data?.success) return { data: null, error: data?.error || 'Failed to fetch open interest' };

    return { data: data.data as OpenInterestData, error: null };
  }
}
