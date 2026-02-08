/**
 * Binance Advanced Analytics Hooks - Phase 3
 * TanStack Query hooks for advanced market analytics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isUsdtPair } from '@/lib/symbol-utils';
import type {
  BasisParams,
  BasisData,
  BasisAnalysis,
  Ticker24h,
  ExchangeInfo,
  VolatilityData,
  LiquidationHeatmapData,
  VolatilityRisk,
  MarketStructureAnalysis,
} from './advanced-analytics-types';
import { getVolatilityRisk, analyzeBasisTrend } from './advanced-analytics-types';

// Query timing constants
const TOP_MOVERS_STALE_TIME = 15 * 1000; // 15 seconds
const TOP_MOVERS_REFETCH_INTERVAL = 15 * 1000; // 15 seconds
const STALE_DATA_THRESHOLD = 25 * 60 * 60 * 1000; // 25 hours - filter out stale/delisted pairs

/**
 * Call the binance-market-data edge function
 */
async function callMarketDataFunction<T>(
  action: string,
  params: Record<string, any> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('binance-market-data', {
    body: { action, ...params },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Unknown error');

  return data.data;
}

// ============================================
// 3.1 Basis Data (Contango/Backwardation)
// ============================================

/**
 * Fetch basis data for futures analysis
 */
export function useBinanceBasis(params: BasisParams) {
  return useQuery({
    queryKey: ['binance', 'basis', params.pair, params.contractType, params.period],
    queryFn: async (): Promise<BasisAnalysis> => {
      const data = await callMarketDataFunction<BasisData[]>('basis', params);
      
      const avgBasisRate = data.length > 0
        ? data.reduce((sum, b) => sum + b.basisRate, 0) / data.length
        : 0;
      
      return {
        data,
        trend: analyzeBasisTrend(data),
        averageBasisRate: avgBasisRate,
        currentBasisRate: data[data.length - 1]?.basisRate || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!params.pair && !!params.contractType && !!params.period,
  });
}

// ============================================
// 3.3 24h Ticker Statistics
// ============================================

/**
 * Fetch 24h ticker for a symbol or all symbols
 */
export function useBinanceTicker24h(symbol?: string) {
  return useQuery({
    queryKey: ['binance', 'ticker-24h', symbol],
    queryFn: () => callMarketDataFunction<Ticker24h | Ticker24h[]>('ticker-24h', { symbol }),
    staleTime: 30 * 1000, // 30 seconds (frequently changing data)
  });
}

/**
 * Fetch top gainers/losers from 24h tickers
 */
export function useBinanceTopMovers(limit = 10) {
  return useQuery({
    queryKey: ['binance', 'top-movers', limit],
    queryFn: async () => {
      const tickers = await callMarketDataFunction<Ticker24h[]>('ticker-24h', {});
      
      // Filter USDT pairs only and ensure fresh data
      const now = Date.now();
      const staleThreshold = now - STALE_DATA_THRESHOLD;
      
      const usdtPairs = tickers.filter(t => 
        isUsdtPair(t.symbol) && 
        t.closeTime > staleThreshold // Exclude delisted/stale pairs
      );
      
      const topGainers = [...usdtPairs]
        .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
        .slice(0, limit);
      
      const topLosers = [...usdtPairs]
        .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
        .slice(0, limit);
      
      const topVolume = [...usdtPairs]
        .sort((a, b) => b.quoteVolume - a.quoteVolume)
        .slice(0, limit);
      
      // Also return raw tickers for custom sorting
      return { topGainers, topLosers, topVolume, allTickers: usdtPairs };
    },
    staleTime: TOP_MOVERS_STALE_TIME,
    refetchInterval: TOP_MOVERS_REFETCH_INTERVAL,
    refetchIntervalInBackground: true, // Continue refetching even when tab is inactive
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

// ============================================
// 3.4 Exchange Info (Trading Schedule)
// ============================================

/**
 * Fetch exchange info for symbol configuration
 */
export function useBinanceExchangeInfo(symbol?: string) {
  return useQuery({
    queryKey: ['binance', 'exchange-info', symbol],
    queryFn: () => callMarketDataFunction<ExchangeInfo>('exchange-info', { symbol }),
    staleTime: 60 * 60 * 1000, // 1 hour (rarely changes)
  });
}

/**
 * Get symbol-specific trading rules
 */
export function useSymbolConfig(symbol: string) {
  const { data: exchangeInfo, ...rest } = useBinanceExchangeInfo(symbol);
  
  const symbolInfo = exchangeInfo?.symbols?.[0];
  
  return {
    ...rest,
    data: symbolInfo ? {
      symbol: symbolInfo.symbol,
      status: symbolInfo.status,
      pricePrecision: symbolInfo.pricePrecision,
      quantityPrecision: symbolInfo.quantityPrecision,
      minQty: getFilterValue(symbolInfo.filters, 'LOT_SIZE', 'minQty'),
      maxQty: getFilterValue(symbolInfo.filters, 'LOT_SIZE', 'maxQty'),
      stepSize: getFilterValue(symbolInfo.filters, 'LOT_SIZE', 'stepSize'),
      tickSize: getFilterValue(symbolInfo.filters, 'PRICE_FILTER', 'tickSize'),
      minNotional: getFilterValue(symbolInfo.filters, 'MIN_NOTIONAL', 'notional'),
    } : null,
  };
}

function getFilterValue(filters: any[], filterType: string, field: string): string | null {
  const filter = filters?.find(f => f.filterType === filterType);
  return filter?.[field] || null;
}

// ============================================
// 3.5 Historical Volatility
// ============================================

/**
 * Fetch historical volatility for a symbol
 */
export function useBinanceVolatility(symbol: string, period = 14) {
  return useQuery({
    queryKey: ['binance', 'volatility', symbol, period],
    queryFn: async () => {
      const data = await callMarketDataFunction<VolatilityData>('historical-volatility', {
        symbol,
        period,
      });
      
      return {
        ...data,
        risk: getVolatilityRisk(data.annualizedVolatility),
      };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!symbol,
  });
}

/**
 * Compare volatility across multiple symbols
 */
export function useMultiSymbolVolatility(symbols: string[], period = 14) {
  return useQuery({
    queryKey: ['binance', 'multi-volatility', symbols.join(','), period],
    queryFn: async () => {
      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const data = await callMarketDataFunction<VolatilityData>('historical-volatility', {
              symbol,
              period,
            });
            return { symbol, ...data, risk: getVolatilityRisk(data.annualizedVolatility) };
          } catch {
            return null;
          }
        })
      );
      
      return results.filter(Boolean) as (VolatilityData & { risk: VolatilityRisk })[];
    },
    staleTime: 15 * 60 * 1000,
    enabled: symbols.length > 0,
  });
}

// ============================================
// 3.6 Liquidation Heatmap
// ============================================

/**
 * Fetch liquidation heatmap data
 */
export function useBinanceLiquidationHeatmap(
  symbol: string,
  interval = '1h',
  limit = 100
) {
  return useQuery({
    queryKey: ['binance', 'liquidation-heatmap', symbol, interval, limit],
    queryFn: () => callMarketDataFunction<LiquidationHeatmapData>('liquidation-heatmap', {
      symbol,
      interval,
      limit,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!symbol,
  });
}

// ============================================
// Composite Hooks
// ============================================

/**
 * Complete market structure analysis for a symbol
 */
export function useMarketStructureAnalysis(symbol: string) {
  const volatilityQuery = useBinanceVolatility(symbol);
  const ticker24hQuery = useBinanceTicker24h(symbol);
  const heatmapQuery = useBinanceLiquidationHeatmap(symbol);
  const basisQuery = useBinanceBasis({
    pair: symbol.replace('USDT', ''),
    contractType: 'PERPETUAL',
    period: '1h',
  });
  
  const isLoading = volatilityQuery.isLoading || ticker24hQuery.isLoading ||
    heatmapQuery.isLoading || basisQuery.isLoading;
  
  const isError = volatilityQuery.isError || ticker24hQuery.isError ||
    heatmapQuery.isError || basisQuery.isError;
  
  const data: MarketStructureAnalysis | null = !isLoading ? {
    symbol,
    basis: basisQuery.data || null,
    volatility: volatilityQuery.data || null,
    ticker: ticker24hQuery.data as Ticker24h || null,
    liquidationHeatmap: heatmapQuery.data || null,
    timestamp: Date.now(),
  } : null;
  
  return {
    data,
    isLoading,
    isError,
    refetch: () => {
      volatilityQuery.refetch();
      ticker24hQuery.refetch();
      heatmapQuery.refetch();
      basisQuery.refetch();
    },
  };
}

/**
 * Get volatility-based position sizing recommendation
 */
export function useVolatilityBasedSizing(symbol: string, riskPercent: number) {
  const { data: volatilityData, isLoading } = useBinanceVolatility(symbol);
  
  if (isLoading || !volatilityData) {
    return {
      isLoading,
      suggestedStopLoss: null,
      adjustedRisk: null,
      recommendation: null,
    };
  }
  
  const { risk, atrPercent } = volatilityData;
  
  // Adjust risk based on volatility
  const volatilityMultiplier = risk.level === 'extreme' ? 0.5 :
    risk.level === 'high' ? 0.75 :
    risk.level === 'medium' ? 1 : 1.25;
  
  const adjustedRisk = riskPercent * volatilityMultiplier;
  
  return {
    isLoading: false,
    suggestedStopLoss: risk.suggestedStopLossPercent,
    adjustedRisk,
    atrBasedStopLoss: atrPercent * 1.5, // 1.5x ATR
    recommendation: risk.level === 'extreme'
      ? 'Consider reducing position size due to extreme volatility'
      : risk.level === 'high'
        ? 'Use wider stops due to high volatility'
        : 'Normal volatility conditions',
  };
}
