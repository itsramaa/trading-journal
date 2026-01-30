/**
 * Daily P&L Hook - Aggregates today's realized P&L
 * Prioritizes Binance data when connected, falls back to local DB for Paper Trading
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useMemo } from 'react';
import { useBinanceDailyPnl } from '@/hooks/use-binance-daily-pnl';

interface DailyPnlStats {
  tradesOpened: number;
  tradesClosed: number;
  realizedPnl: number;
  winRate: number;
  wins: number;
  losses: number;
  bestTrade: { pair: string; pnl: number } | null;
  worstTrade: { pair: string; pnl: number } | null;
  source: 'binance' | 'local';
}

export function useDailyPnl() {
  const { user } = useAuth();
  const binancePnl = useBinanceDailyPnl();

  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00`;
  const todayEnd = `${today}T23:59:59`;

  // Fetch local trades for Paper Trading fallback
  const { data: localTrades, isLoading: localLoading } = useQuery({
    queryKey: ['daily-trades', user?.id, today],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('trade_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('trade_date', todayStart)
        .lte('trade_date', todayEnd);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !binancePnl.isConnected,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const stats = useMemo((): DailyPnlStats => {
    // Use Binance data if connected
    if (binancePnl.isConnected) {
      return {
        tradesOpened: 0, // Binance doesn't track "opened today" separately
        tradesClosed: binancePnl.totalTrades,
        realizedPnl: binancePnl.totalPnl,
        winRate: binancePnl.winRate,
        wins: binancePnl.wins,
        losses: binancePnl.losses,
        bestTrade: null, // Would need more detailed Binance data
        worstTrade: null,
        source: 'binance',
      };
    }

    // Fallback to local trades (Paper Trading)
    if (!localTrades || localTrades.length === 0) {
      return {
        tradesOpened: 0,
        tradesClosed: 0,
        realizedPnl: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        bestTrade: null,
        worstTrade: null,
        source: 'local',
      };
    }

    const openTrades = localTrades.filter(t => t.status === 'open');
    const closedTrades = localTrades.filter(t => t.status === 'closed');
    
    const realizedPnl = closedTrades.reduce((sum, t) => sum + (t.realized_pnl || t.pnl || 0), 0);
    const wins = closedTrades.filter(t => (t.realized_pnl || t.pnl || 0) > 0).length;
    const losses = closedTrades.filter(t => (t.realized_pnl || t.pnl || 0) < 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    // Find best and worst trades
    let bestTrade: DailyPnlStats['bestTrade'] = null;
    let worstTrade: DailyPnlStats['worstTrade'] = null;

    if (closedTrades.length > 0) {
      const sortedByPnl = [...closedTrades].sort((a, b) => 
        (b.realized_pnl || b.pnl || 0) - (a.realized_pnl || a.pnl || 0)
      );
      
      const best = sortedByPnl[0];
      const worst = sortedByPnl[sortedByPnl.length - 1];
      
      if (best) bestTrade = { pair: best.pair, pnl: best.realized_pnl || best.pnl || 0 };
      if (worst) worstTrade = { pair: worst.pair, pnl: worst.realized_pnl || worst.pnl || 0 };
    }

    return {
      tradesOpened: openTrades.length,
      tradesClosed: closedTrades.length,
      realizedPnl,
      winRate,
      wins,
      losses,
      bestTrade,
      worstTrade,
      source: 'local',
    };
  }, [localTrades, binancePnl]);

  return {
    ...stats,
    trades: binancePnl.isConnected ? binancePnl.incomeData : localTrades,
    isLoading: binancePnl.isLoading || localLoading,
    today,
  };
}
