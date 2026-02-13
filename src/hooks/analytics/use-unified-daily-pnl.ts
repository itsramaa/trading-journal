/**
 * Unified Daily P&L Hook
 * Provides consistent daily P&L calculation for both Binance and Paper Trading
 * Single source of truth for Trading Gate risk calculations
 * 
 * NOTE: Does NOT call useBestAvailableBalance internally to avoid nested hook issues.
 * Source is determined from useBinanceConnectionStatus directly.
 */
import { useMemo } from 'react';
import { useBinanceDailyPnl } from '@/hooks/use-binance-daily-pnl';
import { useBinanceConnectionStatus } from '@/features/binance';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { useTradeMode } from '@/hooks/use-trade-mode';
import type { AccountSourceType } from '@/hooks/use-combined-balance';

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
  const { tradeMode } = useTradeMode();
  
  // Determine source based on trade_mode (not just connection status)
  const { data: connectionStatus, isLoading: connectionLoading } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  // Paper mode → always 'paper'. Live mode → 'binance' if connected.
  const source: AccountSourceType = (tradeMode === 'live' && isConnected) ? 'binance' : 'paper';
  
  // Binance P&L data
  const binancePnl = useBinanceDailyPnl();
  
  // Trade entries for Paper P&L calculation
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();
  
  // Calculate Paper Trading daily P&L from trade_entries
  const paperPnl = useMemo(() => {
    if (source !== 'paper') {
      return null;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Filter trades for today that are closed AND match current mode
    const todayTrades = trades.filter(trade => {
      const tradeDate = trade.trade_date?.split('T')[0];
      if (tradeDate !== today || trade.status !== 'closed') return false;
      // Mode filter
      if (trade.trade_mode) return trade.trade_mode === tradeMode;
      // Legacy: binance = live, others = paper
      if (tradeMode === 'live') return trade.source === 'binance';
      return trade.source !== 'binance';
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
    
    const totalTrades = todayTrades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    return {
      totalPnl,
      grossPnl: totalPnl + totalFees,
      netPnl: totalPnl,
      totalTrades,
      wins,
      losses,
      winRate,
      totalCommission: totalFees,
      totalFunding: 0,
      totalRebates: 0,
    };
  }, [trades, source, tradeMode]);
  
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
      isLoading: connectionLoading || tradesLoading,
    };
  }, [source, binancePnl, paperPnl, tradesLoading, connectionLoading]);
}
