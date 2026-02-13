/**
 * Mode-Filtered Trades Hook
 * 
 * Wraps useTradeEntries() and filters by active trade_mode.
 * This ensures Paper/Live data isolation at the consumer level.
 * 
 * Usage: Replace `useTradeEntries()` with `useModeFilteredTrades()` in any
 * component that needs mode-isolated trade data.
 */
import { useMemo } from 'react';
import { useTradeEntries, type TradeEntry } from '@/hooks/use-trade-entries';
import { useTradeMode } from '@/hooks/use-trade-mode';

export function useModeFilteredTrades() {
  const { data: allTrades, isLoading: tradesLoading, ...rest } = useTradeEntries();
  const { tradeMode, isLoading: modeLoading } = useTradeMode();

  const data = useMemo(() => {
    if (!allTrades) return [];
    return allTrades.filter(t => {
      // If trade has trade_mode set, match it
      if (t.trade_mode) return t.trade_mode === tradeMode;
      // Legacy trades without trade_mode:
      // - source='binance' → treat as 'live'
      // - source='manual' or null → treat as 'paper'
      if (tradeMode === 'live') return t.source === 'binance';
      return t.source !== 'binance';
    });
  }, [allTrades, tradeMode]);

  return {
    data,
    isLoading: tradesLoading || modeLoading,
    ...rest,
  };
}
