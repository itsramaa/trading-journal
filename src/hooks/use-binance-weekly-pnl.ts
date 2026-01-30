/**
 * Binance Weekly P&L Hook
 * Calculates 7-day P&L data aggregated by day for trend charts
 * Also identifies best/worst trades
 */
import { useMemo } from 'react';
import { useBinanceConnectionStatus, useBinanceAllIncome } from '@/features/binance';
import { format, startOfDay, subDays } from 'date-fns';

interface DailyPnlData {
  date: string;
  grossPnl: number;
  netPnl: number;
  trades: number;
  wins: number;
  losses: number;
  fees: number;
  funding: number;
}

interface TradeRecord {
  symbol: string;
  pnl: number;
  time: number;
}

interface BinanceWeeklyPnlResult {
  dailyData: DailyPnlData[];
  bestTrade: TradeRecord | null;
  worstTrade: TradeRecord | null;
  totalGross: number;
  totalNet: number;
  totalTrades: number;
  isConnected: boolean;
  isLoading: boolean;
}

export function useBinanceWeeklyPnl(): BinanceWeeklyPnlResult {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Fetch 7 days of income data
  const { data: allIncomeData, isLoading } = useBinanceAllIncome(7, 1000);
  
  const result = useMemo((): Omit<BinanceWeeklyPnlResult, 'isLoading'> => {
    const defaultResult = {
      dailyData: [],
      bestTrade: null,
      worstTrade: null,
      totalGross: 0,
      totalNet: 0,
      totalTrades: 0,
      isConnected,
    };

    if (!isConnected || !allIncomeData || allIncomeData.length === 0) {
      return defaultResult;
    }

    // Initialize daily buckets for last 7 days
    const dailyBuckets = new Map<string, DailyPnlData>();
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      dailyBuckets.set(date, {
        date,
        grossPnl: 0,
        netPnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        fees: 0,
        funding: 0,
      });
    }

    // Track best/worst trades
    let bestTrade: TradeRecord | null = null;
    let worstTrade: TradeRecord | null = null;
    let totalGross = 0;
    let totalNet = 0;
    let totalTrades = 0;

    // Process each income record
    allIncomeData.forEach((item: any) => {
      const date = format(new Date(item.time), 'yyyy-MM-dd');
      const bucket = dailyBuckets.get(date);
      
      if (!bucket) return; // Outside 7-day window
      
      const income = parseFloat(item.income);
      const type = item.incomeType;
      const symbol = item.symbol || 'N/A';

      switch (type) {
        case 'REALIZED_PNL':
          bucket.grossPnl += income;
          bucket.trades += 1;
          totalGross += income;
          totalTrades += 1;
          
          if (income > 0) bucket.wins += 1;
          if (income < 0) bucket.losses += 1;
          
          // Track best/worst trades
          if (!bestTrade || income > bestTrade.pnl) {
            bestTrade = { symbol, pnl: income, time: item.time };
          }
          if (!worstTrade || income < worstTrade.pnl) {
            worstTrade = { symbol, pnl: income, time: item.time };
          }
          break;
          
        case 'COMMISSION':
          bucket.fees += Math.abs(income);
          break;
          
        case 'FUNDING_FEE':
          bucket.funding += income;
          break;
      }
    });

    // Calculate net P&L for each day
    dailyBuckets.forEach((bucket) => {
      bucket.netPnl = bucket.grossPnl - bucket.fees + bucket.funding;
      totalNet += bucket.netPnl;
    });

    // Convert to array sorted by date
    const dailyData = Array.from(dailyBuckets.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    return {
      dailyData,
      bestTrade,
      worstTrade,
      totalGross,
      totalNet,
      totalTrades,
      isConnected: true,
    };
  }, [allIncomeData, isConnected]);

  return {
    ...result,
    isLoading,
  };
}
