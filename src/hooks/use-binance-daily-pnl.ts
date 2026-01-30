/**
 * Binance Daily P&L Hook
 * Calculates daily P&L from Binance income endpoint (all symbols)
 */
import { useQuery } from '@tanstack/react-query';
import { useBinanceBalance, useBinanceConnectionStatus, useBinanceIncomeHistory } from '@/features/binance';
import { useMemo } from 'react';

interface BinanceDailyPnlStats {
  totalPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalCommission: number;
  source: 'binance' | 'local';
  isConnected: boolean;
  bySymbol: Record<string, { pnl: number; count: number }>;
}

export function useBinanceDailyPnl() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  const oneDayAgo = useMemo(() => Date.now() - (24 * 60 * 60 * 1000), []);
  
  // Fetch REALIZED_PNL income from Binance (all symbols in one call!)
  const { data: pnlData, isLoading: pnlLoading } = useBinanceIncomeHistory(
    'REALIZED_PNL',
    oneDayAgo,
    1000
  );
  
  // Fetch COMMISSION income separately for fee tracking
  const { data: commissionData, isLoading: commLoading } = useBinanceIncomeHistory(
    'COMMISSION',
    oneDayAgo,
    500
  );
  
  const stats = useMemo((): BinanceDailyPnlStats => {
    if (!isConnected || !pnlData || pnlData.length === 0) {
      return {
        totalPnl: 0,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalCommission: 0,
        source: isConnected ? 'binance' : 'local',
        isConnected,
        bySymbol: {},
      };
    }
    
    // Filter to ensure we only get last 24H data
    const recentPnl = pnlData.filter((item: any) => item.time >= oneDayAgo);
    
    // Calculate totals
    const totalPnl = recentPnl.reduce((sum: number, item: any) => sum + item.income, 0);
    
    // Group by symbol for detailed stats
    const bySymbol: Record<string, { pnl: number; count: number }> = {};
    recentPnl.forEach((item: any) => {
      if (!bySymbol[item.symbol]) {
        bySymbol[item.symbol] = { pnl: 0, count: 0 };
      }
      bySymbol[item.symbol].pnl += item.income;
      bySymbol[item.symbol].count += 1;
    });
    
    // Count wins/losses (positive PnL = win, negative = loss)
    const wins = recentPnl.filter((item: any) => item.income > 0).length;
    const losses = recentPnl.filter((item: any) => item.income < 0).length;
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    // Calculate total commission
    const recentComm = commissionData?.filter((item: any) => item.time >= oneDayAgo) || [];
    const totalCommission = Math.abs(recentComm.reduce((sum: number, item: any) => sum + item.income, 0));
    
    return {
      totalPnl,
      totalTrades,
      wins,
      losses,
      winRate,
      totalCommission,
      source: 'binance',
      isConnected: true,
      bySymbol,
    };
  }, [pnlData, commissionData, isConnected, oneDayAgo]);
  
  return {
    ...stats,
    incomeData: pnlData,
    isLoading: pnlLoading || commLoading,
  };
}

/**
 * Hook to get Binance total balance for risk calculations
 */
export function useBinanceTotalBalance() {
  const { data: balance, isLoading } = useBinanceBalance();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  return {
    totalBalance: balance?.totalWalletBalance ?? 0,
    availableBalance: balance?.availableBalance ?? 0,
    unrealizedPnl: balance?.totalUnrealizedProfit ?? 0,
    marginBalance: balance?.totalMarginBalance ?? 0,
    isConnected,
    isLoading,
  };
}
