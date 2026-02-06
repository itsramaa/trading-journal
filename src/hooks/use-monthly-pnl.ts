/**
 * Monthly P&L Comparison Hook
 * Provides month-over-month performance comparison
 */
import { useMemo } from 'react';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isWithinInterval, 
  format,
  subDays,
  eachDayOfInterval,
} from 'date-fns';

export interface MonthlyStats {
  netPnl: number;
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: { symbol: string; pnl: number } | null;
  worstTrade: { symbol: string; pnl: number } | null;
}

export interface MonthlyPnlResult {
  currentMonth: MonthlyStats;
  lastMonth: MonthlyStats;
  change: {
    pnlPercent: number;
    tradesPercent: number;
    winRateChange: number;
  };
  rolling30Days: {
    date: string;
    pnl: number;
    cumulative: number;
  }[];
  isLoading: boolean;
}

export function useMonthlyPnl(): MonthlyPnlResult {
  const { data: trades = [], isLoading } = useTradeEntries();
  
  return useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
    // Filter closed trades
    const closedTrades = trades.filter(t => t.status === 'closed');
    
    // Current month trades
    const currentMonthTrades = closedTrades.filter(t => {
      const date = t.trade_date ? new Date(t.trade_date) : null;
      return date && isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd });
    });
    
    // Last month trades
    const lastMonthTrades = closedTrades.filter(t => {
      const date = t.trade_date ? new Date(t.trade_date) : null;
      return date && isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
    });
    
    // Calculate stats for a set of trades
    const calcStats = (tradesToCalc: typeof closedTrades): MonthlyStats => {
      if (tradesToCalc.length === 0) {
        return {
          netPnl: 0,
          trades: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          bestTrade: null,
          worstTrade: null,
        };
      }
      
      const wins = tradesToCalc.filter(t => (t.realized_pnl ?? t.pnl ?? 0) > 0);
      const losses = tradesToCalc.filter(t => (t.realized_pnl ?? t.pnl ?? 0) < 0);
      const netPnl = tradesToCalc.reduce((sum, t) => sum + (t.realized_pnl ?? t.pnl ?? 0), 0);
      
      const avgWin = wins.length > 0 
        ? wins.reduce((sum, t) => sum + (t.realized_pnl ?? t.pnl ?? 0), 0) / wins.length 
        : 0;
      const avgLoss = losses.length > 0 
        ? Math.abs(losses.reduce((sum, t) => sum + (t.realized_pnl ?? t.pnl ?? 0), 0) / losses.length)
        : 0;
      
      // Find best/worst
      const sortedByPnl = [...tradesToCalc].sort((a, b) => 
        (b.realized_pnl ?? b.pnl ?? 0) - (a.realized_pnl ?? a.pnl ?? 0)
      );
      
      return {
        netPnl,
        trades: tradesToCalc.length,
        winRate: tradesToCalc.length > 0 ? (wins.length / tradesToCalc.length) * 100 : 0,
        avgWin,
        avgLoss,
        bestTrade: sortedByPnl[0] 
          ? { symbol: sortedByPnl[0].pair, pnl: sortedByPnl[0].realized_pnl ?? sortedByPnl[0].pnl ?? 0 }
          : null,
        worstTrade: sortedByPnl[sortedByPnl.length - 1] && (sortedByPnl[sortedByPnl.length - 1].realized_pnl ?? sortedByPnl[sortedByPnl.length - 1].pnl ?? 0) < 0
          ? { symbol: sortedByPnl[sortedByPnl.length - 1].pair, pnl: sortedByPnl[sortedByPnl.length - 1].realized_pnl ?? sortedByPnl[sortedByPnl.length - 1].pnl ?? 0 }
          : null,
      };
    };
    
    const currentStats = calcStats(currentMonthTrades);
    const lastStats = calcStats(lastMonthTrades);
    
    // Calculate changes
    const pnlPercent = lastStats.netPnl !== 0 
      ? ((currentStats.netPnl - lastStats.netPnl) / Math.abs(lastStats.netPnl)) * 100 
      : currentStats.netPnl !== 0 ? 100 : 0;
    const tradesPercent = lastStats.trades !== 0 
      ? ((currentStats.trades - lastStats.trades) / lastStats.trades) * 100 
      : currentStats.trades !== 0 ? 100 : 0;
    const winRateChange = currentStats.winRate - lastStats.winRate;
    
    // Rolling 30 days
    const thirtyDaysAgo = subDays(now, 29);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
    
    let cumulative = 0;
    const rolling30Days = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayPnl = closedTrades
        .filter(t => t.trade_date?.split('T')[0] === dayStr)
        .reduce((sum, t) => sum + (t.realized_pnl ?? t.pnl ?? 0), 0);
      cumulative += dayPnl;
      return { date: dayStr, pnl: dayPnl, cumulative };
    });
    
    return {
      currentMonth: currentStats,
      lastMonth: lastStats,
      change: { pnlPercent, tradesPercent, winRateChange },
      rolling30Days,
      isLoading,
    };
  }, [trades, isLoading]);
}
