/**
 * Mode-Based Visibility Rules Hook
 * 
 * Single source of truth for what's visible/blocked based on active_trade_mode.
 * 
 * PAPER mode:
 *   ✅ Trade Entry Wizard, Paper Stats, Public Market Data, AI Analysis, Strategy Library
 *   ❌ Binance Positions, Binance Orders, Binance Balance, Live Stats, Live Trade History
 * 
 * LIVE mode:
 *   ✅ Binance Positions, Binance Orders, Live Stats, Live Trade History, Account Balance
 *   ❌ Trade Entry Wizard, Paper Stats, Manual Trade Create
 */
import { useMemo } from 'react';
import { useTradeMode } from '@/hooks/use-trade-mode';

export interface ModeVisibility {
  /** Current mode label */
  mode: 'paper' | 'live';
  isLoading: boolean;

  // --- Feature visibility flags ---

  /** Show Binance positions, orders, balance */
  showExchangeData: boolean;
  /** Show Binance open orders table */
  showExchangeOrders: boolean;
  /** Show Binance balance in summary */
  showExchangeBalance: boolean;
  /** Allow opening Trade Entry Wizard / manual trade creation */
  canCreateManualTrade: boolean;
  /** Show paper-sourced positions/trades */
  showPaperData: boolean;
}

export function useModeVisibility(): ModeVisibility {
  const { tradeMode, isLoading } = useTradeMode();

  return useMemo<ModeVisibility>(() => {
    const isPaper = tradeMode === 'paper';

    return {
      mode: tradeMode,
      isLoading,

      // Exchange data only visible in LIVE mode
      showExchangeData: !isPaper,
      showExchangeOrders: !isPaper,
      showExchangeBalance: !isPaper,

      // Manual trade creation only in PAPER mode
      canCreateManualTrade: isPaper,

      // Paper data only in PAPER mode
      showPaperData: isPaper,
    };
  }, [tradeMode, isLoading]);
}
