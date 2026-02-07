/**
 * AI Pre-flight Hook - Advanced Layered Edge Validation System
 * 
 * THIS IS NOT AN ENTRY SIGNAL GENERATOR.
 * THIS IS A BAD ENTRY KILLER.
 * 
 * Provides edge validation, context matching, and bias detection
 * to prevent low-quality trades from being executed.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { getSessionForTime } from '@/lib/session-utils';
import type { 
  PreflightInput, 
  PreflightResponse, 
  RawHistoricalTrade,
  MarketSnapshot,
  TradingSession,
  TrendDirection,
  TrendStrength,
  VolatilityBucket
} from '@/types/preflight';

/**
 * Transform trade entries from database to RawHistoricalTrade format
 */
function transformTradeToHistorical(trade: {
  id: string;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  pnl: number | null;
  entry_datetime: string | null;
  trade_date: string;
  result: string | null;
}): RawHistoricalTrade | null {
  // Skip trades without an explicit close result.
  // NOTE: exit_price may be 0 for some synced records (e.g. realized PnL imports),
  // so we must check null/undefined (not falsy).
  if (trade.exit_price == null || trade.result == null) return null;

  const entryPrice = trade.entry_price;
  const exitPrice = trade.exit_price;

  // Stop-loss fallback (only when entryPrice is meaningful)
  const stopLoss =
    trade.stop_loss != null
      ? trade.stop_loss
      : entryPrice > 0
        ? entryPrice * 0.98
        : null;

  // Calculate R-multiple
  // If we cannot infer risk (e.g. no SL / zero entry price), rMultiple becomes 0.
  const riskPerUnit = stopLoss != null ? Math.abs(entryPrice - stopLoss) : 0;
  const profitPerUnit = trade.direction.toUpperCase() === 'LONG'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;

  const rMultiple = riskPerUnit > 0 ? profitPerUnit / riskPerUnit : 0;

  // Determine session from entry time
  const timestamp = trade.entry_datetime || trade.trade_date;
  const tradeDate = new Date(timestamp);
  const session = getSessionForTime(tradeDate);

  // Map session to expected format
  const sessionMap: Record<string, TradingSession> = {
    'asia': 'ASIA',
    'london': 'LONDON',
    'new_york': 'NEW_YORK',
    'off_hours': 'OFF_HOURS',
  };

  return {
    id: trade.id,
    pair: trade.pair,
    direction: trade.direction.toUpperCase() as 'LONG' | 'SHORT',
    entryPrice,
    exitPrice,
    rMultiple,
    timestamp,
    session: sessionMap[session] || 'OFF_HOURS',
    dayOfWeek: tradeDate.getDay(),
    result: trade.result.toUpperCase() === 'WIN' ? 'WIN' : 'LOSS',
    pnl: trade.pnl || 0,
  };
}

/**
 * Hook to fetch user's historical trades for pre-flight analysis
 */
export function useHistoricalTrades() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['historical-trades-preflight', user?.id],
    queryFn: async (): Promise<RawHistoricalTrade[]> => {
      if (!user?.id) return [];
      
      // Fetch last 730 days of closed trades (aligned with Binance full history sync window)
      const since = new Date();
      since.setDate(since.getDate() - 730);

      const { data, error } = await supabase
        .from('trade_entries')
        .select('id, pair, direction, entry_price, exit_price, stop_loss, pnl, entry_datetime, trade_date, result, status')
        .eq('user_id', user.id)
        .in('status', ['closed', 'CLOSED'])
        .gte('trade_date', since.toISOString())
        .order('trade_date', { ascending: false });
      
      if (error) throw error;
      
      // Transform to RawHistoricalTrade format
      return (data || [])
        .map(transformTradeToHistorical)
        .filter((t): t is RawHistoricalTrade => t !== null);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Build market snapshot from current context
 */
export function buildMarketSnapshot(context?: {
  trend?: string;
  trendStrength?: string;
  volatility?: number;
  volatilityLevel?: string;
}): MarketSnapshot {
  const now = new Date();
  const session = getSessionForTime(now);
  
  // Map session
  const sessionMap: Record<string, TradingSession> = {
    'asia': 'ASIA',
    'london': 'LONDON',
    'newyork': 'NEW_YORK',
    'off_hours': 'OFF_HOURS',
  };
  
  // Determine trend direction
  let trendDirection: TrendDirection = 'SIDEWAYS';
  if (context?.trend) {
    const trendLower = context.trend.toLowerCase();
    if (trendLower.includes('bull') || trendLower.includes('up')) {
      trendDirection = 'BULLISH';
    } else if (trendLower.includes('bear') || trendLower.includes('down')) {
      trendDirection = 'BEARISH';
    }
  }
  
  // Determine trend strength
  let trendStrength: TrendStrength = 'MODERATE';
  if (context?.trendStrength) {
    const strengthLower = context.trendStrength.toLowerCase();
    if (strengthLower.includes('strong')) {
      trendStrength = 'STRONG';
    } else if (strengthLower.includes('weak')) {
      trendStrength = 'WEAK';
    }
  }
  
  // Determine volatility bucket
  let volatilityBucket: VolatilityBucket = 'MEDIUM';
  const volatilityPercentile = context?.volatility || 50;
  
  if (context?.volatilityLevel) {
    const volLower = context.volatilityLevel.toLowerCase();
    if (volLower === 'low') volatilityBucket = 'LOW';
    else if (volLower === 'medium') volatilityBucket = 'MEDIUM';
    else if (volLower === 'high') volatilityBucket = 'HIGH';
    else if (volLower === 'extreme') volatilityBucket = 'EXTREME';
  } else {
    if (volatilityPercentile < 25) volatilityBucket = 'LOW';
    else if (volatilityPercentile < 50) volatilityBucket = 'MEDIUM';
    else if (volatilityPercentile < 75) volatilityBucket = 'HIGH';
    else volatilityBucket = 'EXTREME';
  }
  
  return {
    trendDirection,
    trendStrength,
    volatilityPercentile,
    volatilityBucket,
    session: sessionMap[session] || 'OFF_HOURS',
    dayOfWeek: now.getDay(),
  };
}

/**
 * Main Pre-flight Check Hook
 * 
 * Usage:
 * ```tsx
 * const { mutateAsync: runPreflight, isPending } = useAIPreflight();
 * const { data: historicalTrades } = useHistoricalTrades();
 * 
 * const result = await runPreflight({
 *   pair: 'BTCUSDT',
 *   direction: 'LONG',
 *   timeframe: '4H',
 *   historicalTrades,
 *   marketSnapshot: buildMarketSnapshot(currentContext),
 * });
 * 
 * if (result.verdict === 'SKIP') {
 *   // Block the trade
 * }
 * ```
 */
export function useAIPreflight() {
  return useMutation({
    mutationFn: async (input: PreflightInput): Promise<PreflightResponse> => {
      console.log('[useAIPreflight] Running preflight check:', {
        pair: input.pair,
        direction: input.direction,
        tradesCount: input.historicalTrades.length,
      });
      
      const { data, error } = await supabase.functions.invoke('ai-preflight', {
        body: input,
      });

      if (error) {
        console.error('[useAIPreflight] Error:', error);
        throw error;
      }
      
      console.log('[useAIPreflight] Result:', data);
      return data as PreflightResponse;
    },
  });
}

/**
 * Hook for quick preflight summary (for UI badges/indicators)
 */
export function usePreflightSummary(
  pair: string,
  direction: 'LONG' | 'SHORT',
  enabled: boolean = true
) {
  const { data: historicalTrades } = useHistoricalTrades();
  const preflight = useAIPreflight();
  
  return useQuery({
    queryKey: ['preflight-summary', pair, direction, historicalTrades?.length],
    queryFn: async () => {
      if (!historicalTrades || historicalTrades.length === 0) {
        return {
          verdict: 'SKIP' as const,
          confidence: 0,
          reason: 'No historical trades available',
          canTrade: false,
        };
      }
      
      const result = await preflight.mutateAsync({
        pair,
        direction,
        timeframe: '4H',
        historicalTrades,
        marketSnapshot: buildMarketSnapshot(),
      });
      
      return {
        verdict: result.verdict,
        confidence: result.confidence,
        expectancy: result.expectancy,
        edgeStrength: result.edgeStrength,
        reason: result.reasoning.split('\n')[0], // First line only
        canTrade: result.verdict !== 'SKIP',
        riskFlags: result.riskFlags,
        biasFlags: result.biasFlags,
      };
    },
    enabled: enabled && !!historicalTrades && historicalTrades.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export type { PreflightInput, PreflightResponse, RawHistoricalTrade, MarketSnapshot };
