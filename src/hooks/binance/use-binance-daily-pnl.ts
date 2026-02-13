/**
 * Binance Daily P&L Hook
 * Calculates comprehensive daily P&L from Binance income endpoint (all symbols)
 * Includes: Gross P&L, Fees, Funding, Rebates, Net P&L
 */
import { useQuery } from '@tanstack/react-query';
import { useBinanceBalance, useBinanceConnectionStatus, useBinanceAllIncome } from '@/features/binance';
import { getIncomeTypeCategory } from '@/features/binance/types';
import { useMemo } from 'react';

interface BinanceDailyPnlStats {
  // Core P&L
  grossPnl: number;         // Raw REALIZED_PNL total
  totalPnl: number;         // Alias for grossPnl (backward compat)
  netPnl: number;           // grossPnl - fees - funding + rebates
  
  // Trading stats
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  
  // Fee breakdown
  totalCommission: number;  // Trading fees (COMMISSION)
  totalFunding: number;     // Funding fees (FUNDING_FEE) - can be +/-
  totalRebates: number;     // Rebates (COMMISSION_REBATE + API_REBATE)
  totalTransfers: number;   // Transfers in/out
  
  // Income by type for detailed breakdown
  byIncomeType: Record<string, { total: number; count: number }>;
  
  // Symbol breakdown with comprehensive data
  bySymbol: Record<string, { 
    pnl: number; 
    fees: number; 
    funding: number; 
    rebates: number;
    count: number;
  }>;
  
  // Meta
  source: 'binance' | 'local';
  isConnected: boolean;
}

export function useBinanceDailyPnl() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Fetch ALL income types in one call for comprehensive analysis
  const { data: allIncomeData, isLoading } = useBinanceAllIncome(1, 1000); // 1 day back
  
  const oneDayAgo = useMemo(() => Date.now() - (24 * 60 * 60 * 1000), []);
  
  const stats = useMemo((): BinanceDailyPnlStats => {
    const defaultStats: BinanceDailyPnlStats = {
      grossPnl: 0,
      totalPnl: 0,
      netPnl: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalCommission: 0,
      totalFunding: 0,
      totalRebates: 0,
      totalTransfers: 0,
      byIncomeType: {},
      bySymbol: {},
      source: isConnected ? 'binance' : 'local',
      isConnected,
    };

    if (!isConnected || !allIncomeData || allIncomeData.length === 0) {
      return defaultStats;
    }
    
    // Filter to ensure we only get last 24H data
    const recentData = allIncomeData.filter((item: any) => item.time >= oneDayAgo);
    
    if (recentData.length === 0) {
      return { ...defaultStats, source: 'binance', isConnected: true };
    }
    
    // Initialize aggregation structures
    const byIncomeType: Record<string, { total: number; count: number }> = {};
    const bySymbol: Record<string, { pnl: number; fees: number; funding: number; rebates: number; count: number }> = {};
    
    let grossPnl = 0;
    let totalCommission = 0;
    let totalFunding = 0;
    let totalRebates = 0;
    let totalTransfers = 0;
    let wins = 0;
    let losses = 0;
    
    // Process each income record
    recentData.forEach((item: any) => {
      const type = item.incomeType;
      const income = item.income;
      const symbol = item.symbol || 'N/A';
      
      // Aggregate by income type
      if (!byIncomeType[type]) {
        byIncomeType[type] = { total: 0, count: 0 };
      }
      byIncomeType[type].total += income;
      byIncomeType[type].count += 1;
      
      // Initialize symbol entry
      if (!bySymbol[symbol]) {
        bySymbol[symbol] = { pnl: 0, fees: 0, funding: 0, rebates: 0, count: 0 };
      }
      
      // Categorize and accumulate
      const category = getIncomeTypeCategory(type);
      
      switch (type) {
        case 'REALIZED_PNL':
          grossPnl += income;
          bySymbol[symbol].pnl += income;
          bySymbol[symbol].count += 1;
          if (income > 0) wins++;
          if (income < 0) losses++;
          break;
          
        case 'COMMISSION':
          totalCommission += Math.abs(income); // Store as positive for display
          bySymbol[symbol].fees += Math.abs(income);
          break;
          
        case 'FUNDING_FEE':
          totalFunding += income; // Can be +/- (receive or pay)
          bySymbol[symbol].funding += income;
          break;
          
        case 'COMMISSION_REBATE':
        case 'API_REBATE':
          totalRebates += income; // Rebates are positive
          bySymbol[symbol].rebates += income;
          break;
          
        case 'TRANSFER':
        case 'INTERNAL_TRANSFER':
          totalTransfers += income;
          break;
      }
    });
    
    // Calculate net P&L: Gross - Fees - Funding + Rebates
    // Note: Funding can be positive (received) or negative (paid)
    const netPnl = grossPnl - totalCommission + totalFunding + totalRebates;
    
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    return {
      grossPnl,
      totalPnl: grossPnl, // Backward compatibility
      netPnl,
      totalTrades,
      wins,
      losses,
      winRate,
      totalCommission,
      totalFunding,
      totalRebates,
      totalTransfers,
      byIncomeType,
      bySymbol,
      source: 'binance',
      isConnected: true,
    };
  }, [allIncomeData, isConnected, oneDayAgo]);
  
  return {
    ...stats,
    incomeData: allIncomeData,
    isLoading,
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
