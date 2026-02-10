/**
 * Hook for managing global trading mode (Paper/Live) and style (Scalping/Short/Swing).
 * Persists to user_settings via Supabase.
 * 
 * This is the single source of truth for mode-based visibility across the app.
 */
import { useCallback, useMemo } from 'react';
import { useUserSettings, useUpdateUserSettings } from '@/hooks/use-user-settings';

export type TradeMode = 'paper' | 'live';
export type TradingStyle = 'scalping' | 'short_trade' | 'swing';

export interface TradeModeState {
  /** Current trade mode (paper or live) */
  tradeMode: TradeMode;
  /** Current trading style */
  tradingStyle: TradingStyle;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Whether the mode is paper */
  isPaper: boolean;
  /** Whether the mode is live */
  isLive: boolean;
  /** Set the trade mode */
  setTradeMode: (mode: TradeMode) => void;
  /** Set the trading style */
  setTradingStyle: (style: TradingStyle) => void;
}

export const TRADE_MODE_LABELS: Record<TradeMode, string> = {
  paper: 'Paper',
  live: 'Live',
};

export const TRADING_STYLE_LABELS: Record<TradingStyle, string> = {
  scalping: 'Scalping',
  short_trade: 'Short Trade',
  swing: 'Swing',
};

export const TRADING_STYLE_TIMEFRAMES: Record<TradingStyle, string> = {
  scalping: '1m–15m',
  short_trade: '1h–4h',
  swing: '4h–1D',
};

export function useTradeMode(): TradeModeState {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const tradeMode: TradeMode = (settings as any)?.active_trade_mode ?? 'live';
  const tradingStyle: TradingStyle = (settings as any)?.active_trading_style ?? 'short_trade';

  const setTradeMode = useCallback((mode: TradeMode) => {
    updateSettings.mutate({ active_trade_mode: mode } as any);
  }, [updateSettings]);

  const setTradingStyle = useCallback((style: TradingStyle) => {
    updateSettings.mutate({ active_trading_style: style } as any);
  }, [updateSettings]);

  return useMemo(() => ({
    tradeMode,
    tradingStyle,
    isLoading,
    isPaper: tradeMode === 'paper',
    isLive: tradeMode === 'live',
    setTradeMode,
    setTradingStyle,
  }), [tradeMode, tradingStyle, isLoading, setTradeMode, setTradingStyle]);
}
