/**
 * Unified Weekly P&L Hook  
 * System-first approach: Calculates weekly P&L from internal data, enriched by Binance when connected
 */
import { useMemo } from 'react';
import { useBinanceConnectionStatus } from '@/features/binance';
import { useBinanceWeeklyPnl } from '@/hooks/use-binance-weekly-pnl';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { useTradeMode } from '@/hooks/use-trade-mode';
import { subDays, format, startOfDay, isWithinInterval } from 'date-fns';

export type WeeklyPnlSource = 'binance' | 'paper';

export interface DailyPnlRecord {
  date: string;
  netPnl: number;
  grossPnl: number;
  trades: number;
  wins: number;
  losses: number;
  fees: number;
}

export interface TradeHighlight {
  symbol: string;
  pnl: number;
  date: string;
}

export interface UnifiedWeeklyPnlResult {
  dailyData: DailyPnlRecord[];
  totalNet: number;
  totalGross: number;
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  bestTrade: TradeHighlight | null;
  worstTrade: TradeHighlight | null;
  source: WeeklyPnlSource;
  isLoading: boolean;
  hasData: boolean;
}

export function useUnifiedWeeklyPnl(): UnifiedWeeklyPnlResult {
  const { tradeMode } = useTradeMode();
  const { data: connectionStatus, isLoading: connectionLoading } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Binance weekly data (enrichment)
  const binanceWeekly = useBinanceWeeklyPnl();
  
  // Trade entries for internal calculation
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();
  
  // Calculate internal weekly P&L from trade_entries
  const internalWeekly = useMemo(() => {
    const today = new Date();
    const weekAgo = subDays(today, 6); // 7 days including today
    
    // Initialize daily buckets
    const dailyBuckets = new Map<string, DailyPnlRecord>();
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      dailyBuckets.set(date, {
        date,
        netPnl: 0,
        grossPnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        fees: 0,
      });
    }
    
    let bestTrade: TradeHighlight | null = null;
    let worstTrade: TradeHighlight | null = null;
    let totalNet = 0;
    let totalGross = 0;
    let totalTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;
    
    trades.forEach(trade => {
      if (trade.status !== 'closed') return;
      
      // Mode filter
      const matchesMode = trade.trade_mode 
        ? trade.trade_mode === tradeMode
        : (tradeMode === 'live' ? trade.source === 'binance' : trade.source !== 'binance');
      if (!matchesMode) return;
      const tradeDate = trade.trade_date ? new Date(trade.trade_date) : null;
      if (!tradeDate) return;
      
      // Check if within last 7 days
      if (!isWithinInterval(tradeDate, { start: startOfDay(weekAgo), end: today })) {
        return;
      }
      
      const tradeDateStr = format(tradeDate, 'yyyy-MM-dd');
      const bucket = dailyBuckets.get(tradeDateStr);
      if (!bucket) return;
      
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const fees = trade.fees ?? 0;
      const symbol = trade.pair || 'UNKNOWN';
      
      // Update bucket
      bucket.grossPnl += pnl + fees;
      bucket.netPnl += pnl;
      bucket.fees += fees;
      bucket.trades += 1;
      
      if (pnl > 0) {
        bucket.wins += 1;
        totalWins += 1;
      }
      if (pnl < 0) {
        bucket.losses += 1;
        totalLosses += 1;
      }
      
      totalNet += pnl;
      totalGross += pnl + fees;
      totalTrades += 1;
      
      // Track best/worst trades
      if (!bestTrade || pnl > bestTrade.pnl) {
        bestTrade = { symbol, pnl, date: tradeDateStr };
      }
      if (!worstTrade || pnl < worstTrade.pnl) {
        worstTrade = { symbol, pnl, date: tradeDateStr };
      }
    });
    
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    
    return {
      dailyData: Array.from(dailyBuckets.values()),
      totalNet,
      totalGross,
      totalTrades,
      totalWins,
      totalLosses,
      winRate,
      bestTrade,
      worstTrade,
      hasData: totalTrades > 0,
    };
  }, [trades, tradeMode]);
  
  // Return best available data
  return useMemo((): UnifiedWeeklyPnlResult => {
    // Paper mode → always use internal data (never Binance)
    // Live mode → prefer Binance if connected
    if (tradeMode === 'live' && isConnected && binanceWeekly.dailyData.length > 0 && binanceWeekly.totalTrades > 0) {
      const totalWins = binanceWeekly.dailyData.reduce((sum, d) => sum + (d.wins || 0), 0);
      const totalLosses = binanceWeekly.dailyData.reduce((sum, d) => sum + (d.losses || 0), 0);
      const winRate = binanceWeekly.totalTrades > 0 
        ? (totalWins / binanceWeekly.totalTrades) * 100 
        : 0;
      
      return {
        dailyData: binanceWeekly.dailyData.map(d => ({
          date: d.date,
          netPnl: d.netPnl,
          grossPnl: d.grossPnl,
          trades: d.trades,
          wins: d.wins,
          losses: d.losses,
          fees: d.fees || 0,
        })),
        totalNet: binanceWeekly.totalNet,
        totalGross: binanceWeekly.totalGross,
        totalTrades: binanceWeekly.totalTrades,
        totalWins,
        totalLosses,
        winRate,
        bestTrade: binanceWeekly.bestTrade ? {
          symbol: binanceWeekly.bestTrade.symbol,
          pnl: binanceWeekly.bestTrade.pnl,
          date: format(new Date(binanceWeekly.bestTrade.time), 'yyyy-MM-dd'),
        } : null,
        worstTrade: binanceWeekly.worstTrade ? {
          symbol: binanceWeekly.worstTrade.symbol,
          pnl: binanceWeekly.worstTrade.pnl,
          date: format(new Date(binanceWeekly.worstTrade.time), 'yyyy-MM-dd'),
        } : null,
        source: 'binance',
        isLoading: binanceWeekly.isLoading,
        hasData: true,
      };
    }
    
    // Priority 2: Internal data from trade_entries
    if (internalWeekly.hasData) {
      return {
        ...internalWeekly,
        source: 'paper',
        isLoading: tradesLoading,
      };
    }
    
    // Priority 3: No data - return empty structure
    return {
      dailyData: internalWeekly.dailyData, // Empty buckets for chart structure
      totalNet: 0,
      totalGross: 0,
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      bestTrade: null,
      worstTrade: null,
      source: 'paper',
      isLoading: connectionLoading || tradesLoading,
      hasData: false,
    };
  }, [tradeMode, isConnected, binanceWeekly, internalWeekly, tradesLoading, connectionLoading]);
}
