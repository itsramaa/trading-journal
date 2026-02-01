/**
 * Unified Portfolio Data Hook
 * System-first approach: Internal data is always available, Binance enriches when connected
 * 
 * This hook provides portfolio overview data from:
 * 1. Paper Trading Accounts (always available)
 * 2. Trade Entries P&L calculations (always available)  
 * 3. Binance API (optional enrichment when configured)
 */
import { useMemo } from 'react';
import { useBinanceConnectionStatus } from '@/features/binance';
import { useBinanceDailyPnl, useBinanceTotalBalance } from '@/hooks/use-binance-daily-pnl';
import { useBinanceWeeklyPnl } from '@/hooks/use-binance-weekly-pnl';
import { useAccounts } from '@/hooks/use-accounts';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { subDays, format, startOfDay, isWithinInterval } from 'date-fns';

export type PortfolioDataSource = 'binance' | 'paper' | 'none';

export interface UnifiedPortfolioData {
  // Capital
  totalCapital: number;
  availableBalance: number;
  
  // Today's P&L
  todayNetPnl: number;
  todayGrossPnl: number;
  todayTrades: number;
  todayWins: number;
  todayLosses: number;
  todayWinRate: number;
  
  // Weekly P&L
  weeklyNetPnl: number;
  weeklyTrades: number;
  
  // Fees (Binance only, 0 for paper)
  todayFees: number;
  todayFunding: number;
  
  // Source info
  source: PortfolioDataSource;
  sourceName: string;
  isEnriched: boolean; // true if using Binance data
  isLoading: boolean;
  hasData: boolean; // true if any data source is available
}

/**
 * Get unified portfolio data with internal-first approach
 * Always shows data if available from any source
 */
export function useUnifiedPortfolioData(): UnifiedPortfolioData {
  // Connection status
  const { data: connectionStatus, isLoading: connectionLoading } = useBinanceConnectionStatus();
  const isConfigured = connectionStatus?.isConfigured ?? true;
  const isConnected = connectionStatus?.isConnected ?? false;
  
  // Binance data (optional enrichment)
  const binanceDailyPnl = useBinanceDailyPnl();
  const { totalBalance: binanceBalance, isLoading: binanceLoading } = useBinanceTotalBalance();
  const { totalNet: binanceWeeklyNet, totalTrades: binanceWeeklyTrades, isLoading: weeklyLoading } = useBinanceWeeklyPnl();
  
  // Internal data (always available)
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();
  
  // Calculate paper trading balance
  const paperData = useMemo(() => {
    if (!accounts) {
      return { balance: 0, accountCount: 0, hasAccounts: false };
    }
    
    const tradingAccounts = accounts.filter(a => 
      a.account_type === 'trading' && a.is_active
    );
    
    const totalBalance = tradingAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    
    return {
      balance: totalBalance,
      accountCount: tradingAccounts.length,
      hasAccounts: tradingAccounts.length > 0,
    };
  }, [accounts]);
  
  // Calculate internal P&L from trade_entries
  const internalPnl = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        todayPnl: 0,
        todayTrades: 0,
        todayWins: 0,
        todayLosses: 0,
        todayFees: 0,
        weeklyPnl: 0,
        weeklyTrades: 0,
        hasTrades: false,
      };
    }
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekAgo = subDays(today, 7);
    
    let todayPnl = 0;
    let todayTrades = 0;
    let todayWins = 0;
    let todayLosses = 0;
    let todayFees = 0;
    let weeklyPnl = 0;
    let weeklyTrades = 0;
    
    trades.forEach(trade => {
      if (trade.status !== 'closed') return;
      
      const tradeDate = trade.trade_date ? new Date(trade.trade_date) : null;
      if (!tradeDate) return;
      
      const tradeDateStr = format(tradeDate, 'yyyy-MM-dd');
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const fees = trade.fees ?? 0;
      
      // Today's trades
      if (tradeDateStr === todayStr) {
        todayPnl += pnl;
        todayFees += fees;
        todayTrades += 1;
        if (pnl > 0) todayWins += 1;
        if (pnl < 0) todayLosses += 1;
      }
      
      // Weekly trades (last 7 days including today)
      if (isWithinInterval(tradeDate, { start: startOfDay(weekAgo), end: today })) {
        weeklyPnl += pnl;
        weeklyTrades += 1;
      }
    });
    
    return {
      todayPnl,
      todayTrades,
      todayWins,
      todayLosses,
      todayFees,
      weeklyPnl,
      weeklyTrades,
      hasTrades: trades.length > 0,
    };
  }, [trades]);
  
  // Determine best available data source
  return useMemo((): UnifiedPortfolioData => {
    const isLoading = connectionLoading || accountsLoading || tradesLoading || binanceLoading;
    
    // Priority 1: Binance connected - use as enrichment
    if (isConnected && binanceBalance > 0) {
      return {
        totalCapital: binanceBalance,
        availableBalance: binanceBalance,
        todayNetPnl: binanceDailyPnl.netPnl,
        todayGrossPnl: binanceDailyPnl.grossPnl,
        todayTrades: binanceDailyPnl.totalTrades,
        todayWins: binanceDailyPnl.wins,
        todayLosses: binanceDailyPnl.losses,
        todayWinRate: binanceDailyPnl.winRate,
        weeklyNetPnl: binanceWeeklyNet,
        weeklyTrades: binanceWeeklyTrades,
        todayFees: binanceDailyPnl.totalCommission,
        todayFunding: binanceDailyPnl.totalFunding,
        source: 'binance',
        sourceName: 'Binance Futures',
        isEnriched: true,
        isLoading: binanceLoading || weeklyLoading,
        hasData: true,
      };
    }
    
    // Priority 2: Paper accounts available - use internal data
    if (paperData.hasAccounts) {
      const winRate = internalPnl.todayTrades > 0 
        ? (internalPnl.todayWins / internalPnl.todayTrades) * 100 
        : 0;
      
      return {
        totalCapital: paperData.balance,
        availableBalance: paperData.balance,
        todayNetPnl: internalPnl.todayPnl,
        todayGrossPnl: internalPnl.todayPnl + internalPnl.todayFees,
        todayTrades: internalPnl.todayTrades,
        todayWins: internalPnl.todayWins,
        todayLosses: internalPnl.todayLosses,
        todayWinRate: winRate,
        weeklyNetPnl: internalPnl.weeklyPnl,
        weeklyTrades: internalPnl.weeklyTrades,
        todayFees: internalPnl.todayFees,
        todayFunding: 0,
        source: 'paper',
        sourceName: paperData.accountCount > 1 
          ? `${paperData.accountCount} Paper Accounts` 
          : 'Paper Trading',
        isEnriched: false,
        isLoading: accountsLoading || tradesLoading,
        hasData: true,
      };
    }
    
    // Priority 3: No accounts but has trade entries - show P&L stats
    if (internalPnl.hasTrades) {
      const winRate = internalPnl.todayTrades > 0 
        ? (internalPnl.todayWins / internalPnl.todayTrades) * 100 
        : 0;
      
      return {
        totalCapital: 0,
        availableBalance: 0,
        todayNetPnl: internalPnl.todayPnl,
        todayGrossPnl: internalPnl.todayPnl + internalPnl.todayFees,
        todayTrades: internalPnl.todayTrades,
        todayWins: internalPnl.todayWins,
        todayLosses: internalPnl.todayLosses,
        todayWinRate: winRate,
        weeklyNetPnl: internalPnl.weeklyPnl,
        weeklyTrades: internalPnl.weeklyTrades,
        todayFees: internalPnl.todayFees,
        todayFunding: 0,
        source: 'paper',
        sourceName: 'Trade Journal',
        isEnriched: false,
        isLoading: tradesLoading,
        hasData: true,
      };
    }
    
    // Priority 4: No data available - show empty state
    return {
      totalCapital: 0,
      availableBalance: 0,
      todayNetPnl: 0,
      todayGrossPnl: 0,
      todayTrades: 0,
      todayWins: 0,
      todayLosses: 0,
      todayWinRate: 0,
      weeklyNetPnl: 0,
      weeklyTrades: 0,
      todayFees: 0,
      todayFunding: 0,
      source: 'none',
      sourceName: 'No Data',
      isEnriched: false,
      isLoading,
      hasData: false,
    };
  }, [
    isConnected,
    binanceBalance,
    binanceDailyPnl,
    binanceWeeklyNet,
    binanceWeeklyTrades,
    paperData,
    internalPnl,
    connectionLoading,
    accountsLoading,
    tradesLoading,
    binanceLoading,
    weeklyLoading,
  ]);
}
