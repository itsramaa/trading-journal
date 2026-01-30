/**
 * Binance Daily P&L Hook
 * Calculates daily P&L from Binance 24H trades
 */
import { useQuery } from '@tanstack/react-query';
import { useBinanceBalance, useBinanceConnectionStatus } from '@/features/binance';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface BinanceTrade {
  id: number;
  symbol: string;
  realizedPnl: number;
  commission: number;
  time: number;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
}

interface BinanceDailyPnlStats {
  totalPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalCommission: number;
  source: 'binance' | 'local';
  isConnected: boolean;
}

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;

/**
 * Fetch 24H trades from Binance for all major pairs
 */
async function fetchBinance24HTrades(): Promise<BinanceTrade[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Fetch trades for major symbols
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
  const allTrades: BinanceTrade[] = [];
  
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  for (const symbol of symbols) {
    try {
      const response = await fetch(BINANCE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ 
          action: 'trades', 
          symbol,
          limit: 100,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Filter trades from last 24 hours
        const recentTrades = result.data.filter((t: BinanceTrade) => t.time >= oneDayAgo);
        allTrades.push(...recentTrades);
      }
    } catch (e) {
      // Continue with other symbols
    }
  }
  
  return allTrades;
}

export function useBinanceDailyPnl() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  const { data: trades, isLoading } = useQuery({
    queryKey: ['binance', 'daily-pnl-trades'],
    queryFn: fetchBinance24HTrades,
    enabled: isConnected,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
  
  const stats = useMemo((): BinanceDailyPnlStats => {
    if (!isConnected || !trades || trades.length === 0) {
      return {
        totalPnl: 0,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalCommission: 0,
        source: isConnected ? 'binance' : 'local',
        isConnected,
      };
    }
    
    const totalPnl = trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
    const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    
    // Group trades by position to calculate wins/losses
    // A positive realized P&L = win, negative = loss
    const wins = trades.filter(t => t.realizedPnl > 0).length;
    const losses = trades.filter(t => t.realizedPnl < 0).length;
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    return {
      totalPnl,
      totalTrades,
      wins,
      losses,
      winRate,
      totalCommission,
      source: 'binance',
      isConnected: true,
    };
  }, [trades, isConnected]);
  
  return {
    ...stats,
    trades,
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
