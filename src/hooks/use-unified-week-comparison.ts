/**
 * Unified Week Comparison Hook
 * System-first: Compares current vs previous week from Paper data or Binance
 */
import { useMemo } from 'react';
import { useBinanceConnectionStatus } from '@/features/binance';
import { useBinanceWeekComparison } from '@/hooks/use-binance-week-comparison';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { useTradeMode } from '@/hooks/use-trade-mode';
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, startOfDay } from 'date-fns';

export type WeekComparisonSource = 'binance' | 'paper';

export interface WeekStats {
  grossPnl: number;
  netPnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  fees: number;
  bestTrade: number;
  worstTrade: number;
}

export interface UnifiedWeekComparisonResult {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  change: {
    pnl: number;
    pnlPercent: number;
    trades: number;
    tradesPercent: number;
    winRateChange: number;
  };
  source: WeekComparisonSource;
  isLoading: boolean;
  hasData: boolean;
}

// Empty stats for initialization
const emptyStats: WeekStats = {
  grossPnl: 0, netPnl: 0, trades: 0, wins: 0, losses: 0,
  winRate: 0, fees: 0, bestTrade: 0, worstTrade: 0,
};

export function useUnifiedWeekComparison(): UnifiedWeekComparisonResult {
  const { tradeMode } = useTradeMode();
  // Check connection
  const { data: connectionStatus, isLoading: connectionLoading } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Binance data (enrichment)
  const binanceComparison = useBinanceWeekComparison();
  
  // Trade entries for Paper calculation
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();
  
  // Calculate internal week comparison from trade_entries
  const internalComparison = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    
    const currentWeek: WeekStats = { ...emptyStats };
    const previousWeek: WeekStats = { ...emptyStats };
    
    let hasData = false;
    
    trades.forEach(trade => {
      if (trade.status !== 'closed') return;
      
      // Mode filter
      const matchesMode = trade.trade_mode
        ? trade.trade_mode === tradeMode
        : (tradeMode === 'live' ? trade.source === 'binance' : trade.source !== 'binance');
      if (!matchesMode) return;

      const tradeDate = trade.trade_date ? new Date(trade.trade_date) : null;
      if (!tradeDate) return;
      
      let targetWeek: WeekStats | null = null;
      
      if (isWithinInterval(tradeDate, { start: startOfDay(currentWeekStart), end: currentWeekEnd })) {
        targetWeek = currentWeek;
      } else if (isWithinInterval(tradeDate, { start: startOfDay(previousWeekStart), end: previousWeekEnd })) {
        targetWeek = previousWeek;
      }
      
      if (!targetWeek) return;
      hasData = true;
      
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const fees = trade.fees ?? 0;
      
      targetWeek.grossPnl += pnl + fees;
      targetWeek.netPnl += pnl;
      targetWeek.fees += fees;
      targetWeek.trades += 1;
      
      if (pnl > 0) {
        targetWeek.wins += 1;
        targetWeek.bestTrade = Math.max(targetWeek.bestTrade, pnl);
      }
      if (pnl < 0) {
        targetWeek.losses += 1;
        targetWeek.worstTrade = Math.min(targetWeek.worstTrade, pnl);
      }
    });
    
    // Calculate win rates
    currentWeek.winRate = currentWeek.trades > 0 ? (currentWeek.wins / currentWeek.trades) * 100 : 0;
    previousWeek.winRate = previousWeek.trades > 0 ? (previousWeek.wins / previousWeek.trades) * 100 : 0;
    
    // Calculate changes
    const pnlChange = currentWeek.netPnl - previousWeek.netPnl;
    const pnlPercentChange = previousWeek.netPnl !== 0
      ? ((currentWeek.netPnl - previousWeek.netPnl) / Math.abs(previousWeek.netPnl)) * 100
      : currentWeek.netPnl !== 0 ? 100 : 0;
    
    const tradesChange = currentWeek.trades - previousWeek.trades;
    const tradesPercentChange = previousWeek.trades !== 0
      ? ((currentWeek.trades - previousWeek.trades) / previousWeek.trades) * 100
      : currentWeek.trades !== 0 ? 100 : 0;
    
    const winRateChange = currentWeek.winRate - previousWeek.winRate;
    
    return {
      currentWeek,
      previousWeek,
      change: {
        pnl: pnlChange,
        pnlPercent: pnlPercentChange,
        trades: tradesChange,
        tradesPercent: tradesPercentChange,
        winRateChange,
      },
      hasData,
    };
  }, [trades, tradeMode]);
  
  // Return best available data
  return useMemo((): UnifiedWeekComparisonResult => {
    // Priority 1: Live mode + Binance connected with data
    if (tradeMode === 'live' && isConnected && binanceComparison.currentWeek.trades > 0) {
      return {
        currentWeek: binanceComparison.currentWeek,
        previousWeek: binanceComparison.previousWeek,
        change: {
          pnl: binanceComparison.change.pnl,
          pnlPercent: binanceComparison.change.pnlPercent,
          trades: binanceComparison.change.trades,
          tradesPercent: binanceComparison.change.tradesPercent,
          winRateChange: binanceComparison.change.winRateChange,
        },
        source: 'binance',
        isLoading: binanceComparison.isLoading,
        hasData: true,
      };
    }
    
    // Priority 2: Internal Paper data
    if (internalComparison.hasData) {
      return {
        ...internalComparison,
        source: 'paper',
        isLoading: tradesLoading,
      };
    }
    
    // Priority 3: No data
    return {
      currentWeek: { ...emptyStats },
      previousWeek: { ...emptyStats },
      change: { pnl: 0, pnlPercent: 0, trades: 0, tradesPercent: 0, winRateChange: 0 },
      source: 'paper',
      isLoading: connectionLoading || tradesLoading,
      hasData: false,
    };
  }, [tradeMode, isConnected, binanceComparison, internalComparison, tradesLoading, connectionLoading]);
}
