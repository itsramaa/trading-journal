/**
 * Binance Market Data Hooks - Phase 1
 * TanStack Query hooks for public market data endpoints
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  Kline,
  KlineInterval,
  MarkPriceData,
  FundingRateData,
  OpenInterestStat,
  OpenInterestPeriod,
  TopTraderPositionRatio,
  GlobalLongShortRatio,
  TakerVolumeData,
  ParsedOrderBook,
  AggregateTrade,
  MarketDataApiResponse,
} from './market-data-types';
import {
  TOP_TRADER_RATIO,
  RETAIL_RATIO,
  TAKER_VOLUME,
  FUNDING_RATE,
  classifySentiment,
  analyzeTopTraderRatio,
  analyzeRetailRatio,
  analyzeTakerVolume,
} from '@/lib/constants/sentiment-thresholds';

/**
 * Call market data edge function via supabase.functions.invoke
 * Automatically includes auth headers for security
 */
async function callMarketDataApi<T>(
  action: string,
  params: Record<string, any> = {}
): Promise<MarketDataApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke('binance-market-data', {
    body: { action, ...params },
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return data as MarketDataApiResponse<T>;
}

// ============================================
// 1.1 Klines/Candlestick Hook
// ============================================
export function useBinanceKlines(
  symbol: string,
  interval: KlineInterval = '1h',
  options?: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  return useQuery<Kline[]>({
    queryKey: ['binance-market', 'klines', symbol, interval, options?.startTime, options?.endTime],
    queryFn: async () => {
      const result = await callMarketDataApi<Kline[]>('klines', {
        symbol,
        interval,
        startTime: options?.startTime,
        endTime: options?.endTime,
        limit: options?.limit || 500,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch klines');
      }
      
      return result.data || [];
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}

// ============================================
// 1.2 Mark Price Hook
// ============================================
export function useBinanceMarkPrice(symbol?: string) {
  return useQuery<MarkPriceData | MarkPriceData[]>({
    queryKey: ['binance-market', 'mark-price', symbol],
    queryFn: async () => {
      const result = await callMarketDataApi<MarkPriceData | MarkPriceData[]>('mark-price', { symbol });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch mark price');
      }
      
      return result.data!;
    },
    staleTime: 10 * 1000, // 10 seconds - mark price changes frequently
    refetchInterval: 15 * 1000, // Poll every 15 seconds
    retry: 2,
  });
}

// ============================================
// 1.3 Funding Rate Hook
// ============================================
export function useBinanceFundingRateHistory(
  symbol?: string,
  options?: {
    startTime?: number;
    endTime?: number;
    limit?: number;
  }
) {
  return useQuery<FundingRateData[]>({
    queryKey: ['binance-market', 'funding-rate', symbol, options?.startTime, options?.endTime],
    queryFn: async () => {
      const result = await callMarketDataApi<FundingRateData[]>('funding-rate', {
        symbol,
        startTime: options?.startTime,
        endTime: options?.endTime,
        limit: options?.limit || 100,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch funding rate');
      }
      
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// ============================================
// 1.4 Open Interest Hook
// ============================================
export function useBinanceOpenInterest(
  symbol: string,
  period: OpenInterestPeriod = '1h',
  options?: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  return useQuery<OpenInterestStat[]>({
    queryKey: ['binance-market', 'open-interest', symbol, period, options?.startTime],
    queryFn: async () => {
      const result = await callMarketDataApi<OpenInterestStat[]>('open-interest', {
        symbol,
        period,
        startTime: options?.startTime,
        endTime: options?.endTime,
        limit: options?.limit || 30,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch open interest');
      }
      
      return result.data || [];
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// ============================================
// 1.5 Top Trader Ratio Hook
// ============================================
export function useBinanceTopTraderRatio(
  symbol: string,
  period: OpenInterestPeriod = '1h',
  options?: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  return useQuery<TopTraderPositionRatio[]>({
    queryKey: ['binance-market', 'top-trader-ratio', symbol, period, options?.startTime],
    queryFn: async () => {
      const result = await callMarketDataApi<TopTraderPositionRatio[]>('top-trader-ratio', {
        symbol,
        period,
        startTime: options?.startTime,
        endTime: options?.endTime,
        limit: options?.limit || 30,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch top trader ratio');
      }
      
      return result.data || [];
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// ============================================
// 1.6 Global Long/Short Ratio Hook
// ============================================
export function useBinanceGlobalRatio(
  symbol: string,
  period: OpenInterestPeriod = '1h',
  options?: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  return useQuery<GlobalLongShortRatio[]>({
    queryKey: ['binance-market', 'global-ratio', symbol, period, options?.startTime],
    queryFn: async () => {
      const result = await callMarketDataApi<GlobalLongShortRatio[]>('global-ratio', {
        symbol,
        period,
        startTime: options?.startTime,
        endTime: options?.endTime,
        limit: options?.limit || 30,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch global ratio');
      }
      
      return result.data || [];
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// ============================================
// 1.7 Taker Volume Hook
// ============================================
export function useBinanceTakerVolume(
  symbol: string,
  period: OpenInterestPeriod = '1h',
  options?: {
    startTime?: number;
    endTime?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  return useQuery<TakerVolumeData[]>({
    queryKey: ['binance-market', 'taker-volume', symbol, period, options?.startTime],
    queryFn: async () => {
      const result = await callMarketDataApi<TakerVolumeData[]>('taker-volume', {
        symbol,
        period,
        startTime: options?.startTime,
        endTime: options?.endTime,
        limit: options?.limit || 30,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch taker volume');
      }
      
      return result.data || [];
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// ============================================
// 1.8 Order Book Hook
// ============================================
export function useBinanceOrderBook(
  symbol: string,
  limit: number = 100,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<ParsedOrderBook>({
    queryKey: ['binance-market', 'order-book', symbol, limit],
    queryFn: async () => {
      const result = await callMarketDataApi<ParsedOrderBook>('order-book', { symbol, limit });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch order book');
      }
      
      return result.data!;
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 5 * 1000, // 5 seconds - order book changes rapidly
    refetchInterval: options?.refetchInterval || 10 * 1000, // Poll every 10 seconds
    retry: 1,
  });
}

// ============================================
// 1.9 Aggregate Trades Hook
// ============================================
export function useBinanceAggTrades(
  symbol: string,
  options?: {
    fromId?: number;
    startTime?: number;
    endTime?: number;
    limit?: number;
    enabled?: boolean;
  }
) {
  return useQuery<AggregateTrade[]>({
    queryKey: ['binance-market', 'agg-trades', symbol, options?.startTime, options?.fromId],
    queryFn: async () => {
      const result = await callMarketDataApi<AggregateTrade[]>('agg-trades', {
        symbol,
        fromId: options?.fromId,
        startTime: options?.startTime,
        endTime: options?.endTime,
        limit: options?.limit || 500,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch aggregate trades');
      }
      
      return result.data || [];
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

// ============================================
// Combined Sentiment Hook
// ============================================
export function useBinanceMarketSentiment(
  symbol: string,
  period: OpenInterestPeriod = '1h',
  options?: { enabled?: boolean }
) {
  const topTraderQuery = useBinanceTopTraderRatio(symbol, period, { limit: 1, enabled: options?.enabled });
  const globalRatioQuery = useBinanceGlobalRatio(symbol, period, { limit: 1, enabled: options?.enabled });
  const takerVolumeQuery = useBinanceTakerVolume(symbol, period, { limit: 1, enabled: options?.enabled });
  const openInterestQuery = useBinanceOpenInterest(symbol, period, { limit: 2, enabled: options?.enabled });
  const markPriceQuery = useBinanceMarkPrice(symbol);
  
  const isLoading = topTraderQuery.isLoading || globalRatioQuery.isLoading || 
                    takerVolumeQuery.isLoading || openInterestQuery.isLoading || markPriceQuery.isLoading;
  
  const isError = topTraderQuery.isError || globalRatioQuery.isError || 
                  takerVolumeQuery.isError || openInterestQuery.isError || markPriceQuery.isError;
  
  // Calculate sentiment score using centralized thresholds (memoized)
  const data = useMemo(() => {
    if (isLoading || isError) return null;
    
    const topTrader = topTraderQuery.data?.[0];
    const globalRatio = globalRatioQuery.data?.[0];
    const takerVolume = takerVolumeQuery.data?.[0];
    const openInterest = openInterestQuery.data;
    const markPrice = Array.isArray(markPriceQuery.data) 
      ? markPriceQuery.data.find(p => p.symbol === symbol) 
      : markPriceQuery.data;
    
    let bullishFactors = 0;
    let bearishFactors = 0;
    
    // Top traders sentiment (contrarian - if pros are long, bullish)
    if (topTrader) {
      const traderSentiment = analyzeTopTraderRatio(topTrader.longShortRatio);
      if (traderSentiment === 'bullish') bullishFactors++;
      else if (traderSentiment === 'bearish') bearishFactors++;
    }
    
    // Retail sentiment (contrarian - if retail is long, might be bearish)
    if (globalRatio) {
      const retailSentiment = analyzeRetailRatio(globalRatio.longShortRatio);
      if (retailSentiment === 'bullish') bullishFactors++;
      else if (retailSentiment === 'bearish') bearishFactors++;
    }
    
    // Taker volume (buy pressure = bullish)
    if (takerVolume) {
      const takerSentiment = analyzeTakerVolume(takerVolume.buySellRatio);
      if (takerSentiment === 'bullish') bullishFactors++;
      else if (takerSentiment === 'bearish') bearishFactors++;
    }
    
    // Open interest trend
    if (openInterest && openInterest.length >= 2) {
      const oiChange = openInterest[0].sumOpenInterest - openInterest[1].sumOpenInterest;
      if (oiChange > 0) bullishFactors++; // Increasing OI with price up = bullish
      else if (oiChange < 0) bearishFactors++;
    }
    
    // Funding rate
    if (markPrice && markPrice.lastFundingRate) {
      if (markPrice.lastFundingRate > FUNDING_RATE.POSITIVE_EXTREME) bearishFactors++; // High positive = potential short squeeze
      else if (markPrice.lastFundingRate < FUNDING_RATE.NEGATIVE_EXTREME) bullishFactors++; // Negative = potential long squeeze
    }
    
    const totalFactors = bullishFactors + bearishFactors;
    const bullishScore = totalFactors > 0 ? Math.round((bullishFactors / totalFactors) * 100) : 50;
    const bearishScore = 100 - bullishScore;
    
    return {
      symbol,
      bullishScore,
      bearishScore,
      sentiment: classifySentiment(bullishScore),
      factors: {
        topTraders: topTrader ? analyzeTopTraderRatio(topTrader.longShortRatio) : 'neutral',
        retail: globalRatio ? analyzeRetailRatio(globalRatio.longShortRatio) : 'neutral',
        takerVolume: takerVolume ? analyzeTakerVolume(takerVolume.buySellRatio) : 'neutral',
        openInterest: openInterest && openInterest.length >= 2 
          ? (openInterest[0].sumOpenInterest > openInterest[1].sumOpenInterest ? 'increasing' : 'decreasing') 
          : 'stable',
        fundingRate: markPrice?.lastFundingRate 
          ? (markPrice.lastFundingRate > 0 ? 'positive' : markPrice.lastFundingRate < 0 ? 'negative' : 'neutral') 
          : 'neutral',
      },
      rawData: {
        topTrader,
        globalRatio,
        takerVolume,
        openInterest: openInterest?.[0],
        markPrice,
      },
    };
  }, [
    isLoading, isError, symbol,
    topTraderQuery.data, globalRatioQuery.data,
    takerVolumeQuery.data, openInterestQuery.data,
    markPriceQuery.data
  ]);
  
  return {
    data,
    isLoading,
    isError,
    refetch: () => {
      topTraderQuery.refetch();
      globalRatioQuery.refetch();
      takerVolumeQuery.refetch();
      openInterestQuery.refetch();
      markPriceQuery.refetch();
    },
  };
}
