/**
 * Symbol Breakdown Hook - Aggregates P&L by symbol from both sources
 * Prioritizes Binance data when connected, falls back to trade_entries for Paper
 */
import { useMemo } from 'react';
import { useBinanceDailyPnl } from '@/hooks/use-binance-daily-pnl';
import { useBinanceConnectionStatus } from '@/features/binance';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { useTradeMode } from '@/hooks/use-trade-mode';
import { subDays, isWithinInterval, startOfDay } from 'date-fns';

export interface SymbolBreakdownItem {
  symbol: string;
  pnl: number;
  fees: number;
  funding: number;
  rebates: number;
  net: number;
  trades: number;
}

export interface SymbolBreakdownResult {
  dailyBreakdown: SymbolBreakdownItem[];
  weeklyBreakdown: SymbolBreakdownItem[];
  source: 'binance' | 'paper';
  isLoading: boolean;
}

export function useSymbolBreakdown(): SymbolBreakdownResult {
  const { data: connectionStatus, isLoading: connectionLoading } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  const { tradeMode } = useTradeMode();
  
  // Binance P&L data (has bySymbol)
  const binancePnl = useBinanceDailyPnl();
  
  // Trade entries for Paper calculation
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();
  
  // Calculate Paper Trading symbol breakdown
  const paperBreakdown = useMemo(() => {
    if (tradeMode === 'live' && isConnected) return { daily: [], weekly: [] };
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekAgo = subDays(today, 6);
    
    // Daily breakdown (today only)
    const dailyBySymbol = new Map<string, SymbolBreakdownItem>();
    // Weekly breakdown (last 7 days)
    const weeklyBySymbol = new Map<string, SymbolBreakdownItem>();
    
    trades.forEach(trade => {
      if (trade.status !== 'closed') return;
      
      // Inline mode filter — identical pattern to useUnifiedWeeklyPnl
      const matchesMode = trade.trade_mode 
        ? trade.trade_mode === tradeMode
        : (tradeMode === 'live' ? trade.source === 'binance' : trade.source !== 'binance');
      if (!matchesMode) return;
      
      const tradeDate = trade.trade_date ? new Date(trade.trade_date) : null;
      if (!tradeDate) return;
      
      const tradeDateStr = tradeDate.toISOString().split('T')[0];
      const symbol = trade.pair || 'UNKNOWN';
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const fees = trade.fees ?? 0;
      
      // Check if within last 7 days for weekly
      if (isWithinInterval(tradeDate, { start: startOfDay(weekAgo), end: today })) {
        if (!weeklyBySymbol.has(symbol)) {
          weeklyBySymbol.set(symbol, {
            symbol,
            pnl: 0,
            fees: 0,
            funding: 0,
            rebates: 0,
            net: 0,
            trades: 0,
          });
        }
        const item = weeklyBySymbol.get(symbol)!;
        item.pnl += pnl;
        item.fees += fees;
        item.net += pnl - fees;
        item.trades += 1;
      }
      
      // Check if today for daily
      if (tradeDateStr === todayStr) {
        if (!dailyBySymbol.has(symbol)) {
          dailyBySymbol.set(symbol, {
            symbol,
            pnl: 0,
            fees: 0,
            funding: 0,
            rebates: 0,
            net: 0,
            trades: 0,
          });
        }
        const item = dailyBySymbol.get(symbol)!;
        item.pnl += pnl;
        item.fees += fees;
        item.net += pnl - fees;
        item.trades += 1;
      }
    });
    
    return {
      daily: Array.from(dailyBySymbol.values())
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
      weekly: Array.from(weeklyBySymbol.values())
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
    };
  }, [trades, isConnected, tradeMode]);
  
  // Return Binance or Paper data
  return useMemo((): SymbolBreakdownResult => {
    // Binance connected - use bySymbol data
    if (tradeMode === 'live' && isConnected && binancePnl.bySymbol) {
      const binanceBreakdown: SymbolBreakdownItem[] = Object.entries(binancePnl.bySymbol)
        .filter(([symbol]) => symbol !== 'N/A')
        .map(([symbol, data]) => ({
          symbol,
          pnl: data.pnl,
          fees: data.fees,
          funding: data.funding,
          rebates: data.rebates,
          net: data.pnl - data.fees + data.funding + data.rebates,
          trades: data.count,
        }))
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
      
      return {
        dailyBreakdown: binanceBreakdown,
        weeklyBreakdown: binanceBreakdown, // Binance daily hook only fetches 1 day, so same for now
        source: 'binance',
        isLoading: binancePnl.isLoading,
      };
    }
    
    // Paper Trading - use calculated breakdown
    return {
      dailyBreakdown: paperBreakdown.daily,
      weeklyBreakdown: paperBreakdown.weekly,
      source: 'paper',
      isLoading: connectionLoading || tradesLoading,
    };
  }, [isConnected, binancePnl, paperBreakdown, connectionLoading, tradesLoading]);
}
