/**
 * useCaptureMarketContext Hook
 * Aggregates data from multiple market sources into a unified context
 * Used to capture market state at trade entry time
 */

import { useCallback, useMemo } from 'react';
import { useMarketSentiment, useMacroAnalysis } from '@/features/market-insight';
import { useEconomicCalendar } from '@/features/calendar';
import { useBinanceMarketSentiment } from '@/features/binance/useBinanceMarketData';
import { getSessionForTime, getActiveOverlaps } from '@/lib/session-utils';
import type { 
  UnifiedMarketContext, 
  MarketSentimentContext,
  FearGreedContext,
  VolatilityContext,
  EventContext,
  MomentumContext,
  CaptureMarketContextResult,
} from '@/types/market-context';
import {
  calculateCompositeScore,
  calculateTradingBias,
  calculateDataQuality,
  determineVolatilityLevel,
  calculateStopMultiplier,
  determinePositionAdjustment,
  determineEventRiskLevel,
  getFearGreedLabel,
} from '@/lib/market-scoring';

interface UseCaptureMarketContextOptions {
  symbol?: string;
  enabled?: boolean;
}

export function useCaptureMarketContext(
  options: UseCaptureMarketContextOptions = {}
): CaptureMarketContextResult {
  const { symbol = 'BTCUSDT', enabled = true } = options;
  
  // Fetch market sentiment data
  const { 
    data: sentimentData, 
    isLoading: sentimentLoading,
    error: sentimentError,
    refetch: refetchSentiment,
  } = useMarketSentiment();
  
  // Fetch macro analysis
  const { 
    data: macroData, 
    isLoading: macroLoading,
    error: macroError,
    refetch: refetchMacro,
  } = useMacroAnalysis();
  
  // Fetch economic calendar
  const { 
    data: calendarData, 
    isLoading: calendarLoading,
    error: calendarError,
    refetch: refetchCalendar,
  } = useEconomicCalendar();
  
  // Fetch Binance market sentiment for the symbol
  const {
    data: binanceSentiment,
    isLoading: binanceLoading,
    isError: binanceError,
    refetch: refetchBinance,
  } = useBinanceMarketSentiment(symbol, '1h', { enabled });

  const isLoading = sentimentLoading || macroLoading || calendarLoading || binanceLoading;
  const error = sentimentError || macroError || calendarError || (binanceError ? new Error('Failed to fetch Binance data') : null);

  /**
   * Build sentiment context from market-insight data
   */
  const buildSentimentContext = useCallback((): MarketSentimentContext => {
    const sentiment = sentimentData?.sentiment;
    const macro = macroData?.macro;
    
    return {
      overall: sentiment?.overall || 'neutral',
      technicalScore: sentiment?.technicalScore ?? 50,
      onChainScore: sentiment?.onChainScore ?? 50,
      macroScore: sentiment?.macroScore ?? (macro?.overallSentiment === 'bullish' ? 65 : macro?.overallSentiment === 'bearish' ? 35 : 50),
      confidence: sentiment?.confidence ?? 50,
    };
  }, [sentimentData, macroData]);

  /**
   * Build Fear/Greed context
   */
  const buildFearGreedContext = useCallback((): FearGreedContext => {
    const fg = sentimentData?.sentiment?.fearGreed;
    
    return {
      value: fg?.value ?? 50,
      label: fg?.label ?? getFearGreedLabel(fg?.value ?? 50),
    };
  }, [sentimentData]);

  /**
   * Build volatility context
   * Uses Binance data for symbol-specific volatility
   */
  const buildVolatilityContext = useCallback((): VolatilityContext => {
    const volatilityData = sentimentData?.volatility?.find(
      v => v.asset === symbol.replace('USDT', '') || v.asset === symbol
    );
    
    const value = volatilityData?.value ?? 3; // Default medium volatility
    const level = volatilityData?.level ?? determineVolatilityLevel(value);
    
    return {
      level,
      value,
      suggestedStopMultiplier: calculateStopMultiplier(level),
    };
  }, [sentimentData, symbol]);

  /**
   * Build economic events context
   */
  const buildEventsContext = useCallback((): EventContext => {
    const impactSummary = calendarData?.impactSummary;
    const todayHighlight = calendarData?.todayHighlight;
    const highImpactCount = impactSummary?.eventCount ?? 0;
    
    return {
      hasHighImpactToday: impactSummary?.hasHighImpact ?? false,
      riskLevel: impactSummary?.riskLevel ?? 'LOW',
      positionSizeAdjustment: impactSummary?.positionAdjustment ?? 'normal',
      highImpactCount,
      upcomingEvent: todayHighlight?.hasEvent && todayHighlight?.event ? {
        name: todayHighlight.event.event,
        timeUntil: todayHighlight.timeUntil ?? 'unknown',
        cryptoImpact: todayHighlight.event.cryptoImpact,
      } : undefined,
    };
  }, [calendarData]);

  /**
   * Build momentum context
   * Checks if the symbol is in top movers
   */
  const buildMomentumContext = useCallback((): MomentumContext => {
    // Get opportunities data for momentum info
    const opportunities = sentimentData?.opportunities || [];
    const symbolOpp = opportunities.find(
      o => o.pair === symbol || o.pair === symbol.replace('USDT', '/USDT')
    );
    
    // Calculate price change from Binance data if available
    const priceChange24h = binanceSentiment?.rawData?.markPrice?.indexPrice 
      ? 0 // Would need historical data to calculate
      : 0;
    
    // Check if in top movers (using opportunities as proxy)
    const isTopGainer = symbolOpp?.direction === 'LONG' && (symbolOpp?.confidence ?? 0) > 70;
    const isTopLoser = symbolOpp?.direction === 'SHORT' && (symbolOpp?.confidence ?? 0) > 70;
    
    return {
      isTopGainer,
      isTopLoser,
      rank24h: symbolOpp ? (isTopGainer ? 1 : isTopLoser ? -1 : null) : null,
      priceChange24h,
    };
  }, [sentimentData, binanceSentiment, symbol]);

  /**
   * Build complete unified market context
   */
  const buildContext = useCallback((): UnifiedMarketContext | null => {
    if (isLoading) return null;
    
    const sentiment = buildSentimentContext();
    const fearGreed = buildFearGreedContext();
    const volatility = buildVolatilityContext();
    const events = buildEventsContext();
    const momentum = buildMomentumContext();
    
    // Capture current session (NEW)
    const now = new Date();
    const currentSession = getSessionForTime(now);
    const sessionOverlap = getActiveOverlaps(now);
    
    const partialContext = { sentiment, fearGreed, volatility, events, momentum };
    const compositeScore = calculateCompositeScore(partialContext);
    const tradingBias = calculateTradingBias(compositeScore, partialContext);
    
    const context: UnifiedMarketContext = {
      sentiment,
      fearGreed,
      volatility,
      events,
      momentum,
      session: {
        current: currentSession,
        overlap: sessionOverlap,
      },
      compositeScore,
      tradingBias,
      capturedAt: new Date().toISOString(),
      dataQuality: calculateDataQuality(partialContext),
      symbol,
    };
    
    return context;
  }, [
    isLoading,
    buildSentimentContext,
    buildFearGreedContext,
    buildVolatilityContext,
    buildEventsContext,
    buildMomentumContext,
    symbol,
  ]);

  /**
   * Capture context on demand (for trade entry)
   */
  const capture = useCallback(async (captureSymbol: string): Promise<UnifiedMarketContext | null> => {
    // Trigger refetch to get latest data
    await Promise.all([
      refetchSentiment(),
      refetchMacro(),
      refetchCalendar(),
      refetchBinance(),
    ]);
    
    // Build context with potentially updated symbol
    const sentiment = buildSentimentContext();
    const fearGreed = buildFearGreedContext();
    const volatility = buildVolatilityContext();
    const events = buildEventsContext();
    const momentum = buildMomentumContext();
    
    // Capture current session (NEW)
    const now = new Date();
    const currentSession = getSessionForTime(now);
    const sessionOverlap = getActiveOverlaps(now);
    
    const partialContext = { sentiment, fearGreed, volatility, events, momentum };
    const compositeScore = calculateCompositeScore(partialContext);
    const tradingBias = calculateTradingBias(compositeScore, partialContext);
    
    return {
      sentiment,
      fearGreed,
      volatility,
      events,
      momentum,
      session: {
        current: currentSession,
        overlap: sessionOverlap,
      },
      compositeScore,
      tradingBias,
      capturedAt: new Date().toISOString(),
      dataQuality: calculateDataQuality(partialContext),
      symbol: captureSymbol,
    };
  }, [
    refetchSentiment,
    refetchMacro,
    refetchCalendar,
    refetchBinance,
    buildSentimentContext,
    buildFearGreedContext,
    buildVolatilityContext,
    buildEventsContext,
    buildMomentumContext,
  ]);

  const refetch = useCallback(() => {
    refetchSentiment();
    refetchMacro();
    refetchCalendar();
    refetchBinance();
  }, [refetchSentiment, refetchMacro, refetchCalendar, refetchBinance]);

  const context = useMemo(() => buildContext(), [buildContext]);

  return {
    context,
    isLoading,
    error,
    capture,
    refetch,
  };
}
