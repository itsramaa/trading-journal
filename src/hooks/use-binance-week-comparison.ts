/**
 * Binance Week Comparison Hook
 * Compares current week performance vs previous week
 */
import { useMemo } from 'react';
import { useBinanceConnectionStatus, useBinanceAllIncome } from '@/features/binance';
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, format } from 'date-fns';

interface WeekStats {
  grossPnl: number;
  netPnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  fees: number;
  funding: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeSize: number;
}

interface WeekComparisonResult {
  currentWeek: WeekStats;
  previousWeek: WeekStats;
  change: {
    pnl: number;
    pnlPercent: number;
    trades: number;
    tradesPercent: number;
    winRate: number;
    winRateChange: number;
  };
  isConnected: boolean;
  isLoading: boolean;
  currentWeekRange: { start: Date; end: Date };
  previousWeekRange: { start: Date; end: Date };
}

const emptyWeekStats: WeekStats = {
  grossPnl: 0,
  netPnl: 0,
  trades: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  fees: 0,
  funding: 0,
  bestTrade: 0,
  worstTrade: 0,
  avgTradeSize: 0,
};

export function useBinanceWeekComparison(): WeekComparisonResult {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Fetch 14 days of income data to cover both weeks
  const { data: allIncomeData, isLoading } = useBinanceAllIncome(14, 1000);
  
  const result = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    
    const defaultResult: Omit<WeekComparisonResult, 'isLoading'> = {
      currentWeek: { ...emptyWeekStats },
      previousWeek: { ...emptyWeekStats },
      change: {
        pnl: 0,
        pnlPercent: 0,
        trades: 0,
        tradesPercent: 0,
        winRate: 0,
        winRateChange: 0,
      },
      isConnected,
      currentWeekRange: { start: currentWeekStart, end: currentWeekEnd },
      previousWeekRange: { start: previousWeekStart, end: previousWeekEnd },
    };
    
    if (!isConnected || !allIncomeData || allIncomeData.length === 0) {
      return defaultResult;
    }
    
    // Process income data into week buckets
    const currentWeek: WeekStats = { ...emptyWeekStats };
    const previousWeek: WeekStats = { ...emptyWeekStats };
    
    allIncomeData.forEach((item: any) => {
      const itemDate = new Date(item.time);
      const income = parseFloat(item.income);
      const type = item.incomeType;
      
      let targetWeek: WeekStats | null = null;
      
      if (isWithinInterval(itemDate, { start: currentWeekStart, end: currentWeekEnd })) {
        targetWeek = currentWeek;
      } else if (isWithinInterval(itemDate, { start: previousWeekStart, end: previousWeekEnd })) {
        targetWeek = previousWeek;
      }
      
      if (!targetWeek) return;
      
      switch (type) {
        case 'REALIZED_PNL':
          targetWeek.grossPnl += income;
          targetWeek.trades += 1;
          if (income > 0) {
            targetWeek.wins += 1;
            targetWeek.bestTrade = Math.max(targetWeek.bestTrade, income);
          }
          if (income < 0) {
            targetWeek.losses += 1;
            targetWeek.worstTrade = Math.min(targetWeek.worstTrade, income);
          }
          break;
        case 'COMMISSION':
          targetWeek.fees += Math.abs(income);
          break;
        case 'FUNDING_FEE':
          targetWeek.funding += income;
          break;
      }
    });
    
    // Calculate derived metrics
    [currentWeek, previousWeek].forEach(week => {
      week.netPnl = week.grossPnl - week.fees + week.funding;
      week.winRate = week.trades > 0 ? (week.wins / week.trades) * 100 : 0;
      week.avgTradeSize = week.trades > 0 ? week.grossPnl / week.trades : 0;
    });
    
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
        winRate: currentWeek.winRate,
        winRateChange,
      },
      isConnected: true,
      currentWeekRange: { start: currentWeekStart, end: currentWeekEnd },
      previousWeekRange: { start: previousWeekStart, end: previousWeekEnd },
    };
  }, [allIncomeData, isConnected]);
  
  return {
    ...result,
    isLoading,
  };
}
