/**
 * Unified Daily P&L Hook
 * Provides consistent daily P&L calculation for both Binance and Paper Trading
 * Single source of truth for Trading Gate risk calculations
 */
import { useMemo } from 'react';
import { useBinanceDailyPnl } from '@/hooks/use-binance-daily-pnl';
import { useBestAvailableBalance, AccountSourceType } from '@/hooks/use-combined-balance';
import { useTradeEntries } from '@/hooks/use-trade-entries';

export interface UnifiedDailyPnlResult {
  // Core P&L data
  totalPnl: number;
  grossPnl: number;
  netPnl: number;
  
  // Trading stats
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  
  // Fee breakdown (Binance only, 0 for Paper)
  totalCommission: number;
  totalFunding: number;
  totalRebates: number;
  
  // Source info
  source: AccountSourceType;
  isLoading: boolean;
}

/**
 * Get unified daily P&L from either Binance or Paper Trading accounts
 * Binance: Uses income endpoint for comprehensive P&L
 * Paper: Calculates from trade_entries table for today
 */
export function useUnifiedDailyPnl(): UnifiedDailyPnlResult {
  const { source, isLoading: balanceLoading } = useBestAvailableBalance();
  const binancePnl = useBinanceDailyPnl();
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();
  
  // Calculate Paper Trading daily P&L from trade_entries
  const paperPnl = useMemo(() => {
    if (source !== 'paper') {
      return null;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Filter trades for today that are closed
    const todayTrades = trades.filter(trade => {
      const tradeDate = trade.trade_date?.split('T')[0];
      return tradeDate === today && trade.status === 'closed';
    });
    
    // Calculate stats
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    let totalFees = 0;
    
    todayTrades.forEach(trade => {
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      totalPnl += pnl;
      totalFees += trade.fees ?? 0;
      
      if (pnl > 0) wins++;
      if (pnl < 0) losses++;
    });
    
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    return {
      totalPnl,
      grossPnl: totalPnl + totalFees, // Add back fees for gross
      netPnl: totalPnl,
      totalTrades,
      wins,
      losses,
      winRate,
      totalCommission: totalFees,
      totalFunding: 0,
      totalRebates: 0,
    };
  }, [trades, source]);
  
  // Return appropriate P&L based on source
  return useMemo((): UnifiedDailyPnlResult => {
    // Binance source - use Binance P&L data
    if (source === 'binance') {
      return {
        totalPnl: binancePnl.totalPnl,
        grossPnl: binancePnl.grossPnl,
        netPnl: binancePnl.netPnl,
        totalTrades: binancePnl.totalTrades,
        wins: binancePnl.wins,
        losses: binancePnl.losses,
        winRate: binancePnl.winRate,
        totalCommission: binancePnl.totalCommission,
        totalFunding: binancePnl.totalFunding,
        totalRebates: binancePnl.totalRebates,
        source: 'binance',
        isLoading: binancePnl.isLoading,
      };
    }
    
    // Paper source - use calculated Paper P&L
    if (paperPnl) {
      return {
        ...paperPnl,
        source: 'paper',
        isLoading: tradesLoading,
      };
    }
    
    // Default fallback
    return {
      totalPnl: 0,
      grossPnl: 0,
      netPnl: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalCommission: 0,
      totalFunding: 0,
      totalRebates: 0,
      source: 'paper',
      isLoading: balanceLoading || tradesLoading,
    };
  }, [source, binancePnl, paperPnl, tradesLoading, balanceLoading]);
}
