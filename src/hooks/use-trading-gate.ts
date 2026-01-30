/**
 * Trading Gate Hook - Central control for trading permissions
 * Checks daily loss limits and determines if trading is allowed
 * Now uses Binance balance as primary source when connected
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useRiskProfile } from '@/hooks/use-risk-profile';
import { useBinanceDailyPnl, useBinanceTotalBalance } from '@/hooks/use-binance-daily-pnl';
import { useMemo } from 'react';

export interface TradingGateState {
  canTrade: boolean;
  reason: string | null;
  status: 'ok' | 'warning' | 'disabled';
  lossUsedPercent: number;
  remainingBudget: number;
  dailyLossLimit: number;
  currentPnl: number;
  startingBalance: number;
  source: 'binance' | 'local';
}

const THRESHOLDS = {
  warning: 70,
  danger: 90,
  disabled: 100,
};

export function useTradingGate() {
  const { user } = useAuth();
  const { data: riskProfile } = useRiskProfile();
  const queryClient = useQueryClient();
  
  // Binance data
  const { totalBalance: binanceBalance, isConnected: isBinanceConnected } = useBinanceTotalBalance();
  const binancePnl = useBinanceDailyPnl();

  // Get today's risk snapshot (for Paper Trading fallback)
  const { data: snapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ['daily-risk-snapshot', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_risk_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('snapshot_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isBinanceConnected,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Calculate trading gate state
  const gateState = useMemo((): TradingGateState => {
    const maxDailyLossPercent = riskProfile?.max_daily_loss_percent || 5;
    
    // Use Binance data if connected
    if (isBinanceConnected && binanceBalance > 0) {
      const startingBalance = binanceBalance; // Use current balance as starting
      const currentPnl = binancePnl.totalPnl;
      const dailyLossLimit = (startingBalance * maxDailyLossPercent) / 100;
      const lossUsedPercent = currentPnl < 0 
        ? Math.min((Math.abs(currentPnl) / dailyLossLimit) * 100, 100)
        : 0;
      const remainingBudget = dailyLossLimit - Math.abs(Math.min(currentPnl, 0));

      let status: 'ok' | 'warning' | 'disabled' = 'ok';
      let canTrade = true;
      let reason: string | null = null;

      if (lossUsedPercent >= THRESHOLDS.disabled) {
        status = 'disabled';
        canTrade = false;
        reason = 'Daily loss limit reached. Trading disabled for today.';
      } else if (lossUsedPercent >= THRESHOLDS.warning) {
        status = 'warning';
        reason = `Warning: ${lossUsedPercent.toFixed(0)}% of daily loss limit used.`;
      }

      return {
        canTrade,
        reason,
        status,
        lossUsedPercent,
        remainingBudget: Math.max(0, remainingBudget),
        dailyLossLimit,
        currentPnl,
        startingBalance,
        source: 'binance',
      };
    }
    
    // Fallback to local snapshot (Paper Trading)
    const startingBalance = snapshot?.starting_balance || 10000;
    const currentPnl = snapshot?.current_pnl || 0;
    
    const dailyLossLimit = (startingBalance * maxDailyLossPercent) / 100;
    const lossUsedPercent = currentPnl < 0 
      ? Math.min((Math.abs(currentPnl) / dailyLossLimit) * 100, 100)
      : 0;
    const remainingBudget = dailyLossLimit - Math.abs(Math.min(currentPnl, 0));

    let status: 'ok' | 'warning' | 'disabled' = 'ok';
    let canTrade = true;
    let reason: string | null = null;

    if (lossUsedPercent >= THRESHOLDS.disabled) {
      status = 'disabled';
      canTrade = false;
      reason = 'Daily loss limit reached. Trading disabled for today.';
    } else if (lossUsedPercent >= THRESHOLDS.warning) {
      status = 'warning';
      reason = `Warning: ${lossUsedPercent.toFixed(0)}% of daily loss limit used.`;
    }

    // Also check if explicitly disabled in snapshot
    if (snapshot?.trading_allowed === false) {
      status = 'disabled';
      canTrade = false;
      reason = 'Trading has been disabled for today.';
    }

    return {
      canTrade,
      reason,
      status,
      lossUsedPercent,
      remainingBudget: Math.max(0, remainingBudget),
      dailyLossLimit,
      currentPnl,
      startingBalance,
      source: 'local',
    };
  }, [snapshot, riskProfile, isBinanceConnected, binanceBalance, binancePnl]);

  // Create or update today's snapshot (for Paper Trading)
  const initializeSnapshot = useMutation({
    mutationFn: async (startingBalance: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_risk_snapshots')
        .upsert({
          user_id: user.id,
          snapshot_date: today,
          starting_balance: startingBalance,
          current_pnl: 0,
          loss_limit_used_percent: 0,
          positions_open: 0,
          capital_deployed_percent: 0,
          trading_allowed: true,
        }, {
          onConflict: 'user_id,snapshot_date',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-risk-snapshot'] });
    },
  });

  // Update current P&L (for Paper Trading)
  const updatePnl = useMutation({
    mutationFn: async (pnlChange: number) => {
      if (!user?.id || !snapshot) throw new Error('No snapshot to update');
      
      const newPnl = (snapshot.current_pnl || 0) + pnlChange;
      const dailyLossLimit = (snapshot.starting_balance * (riskProfile?.max_daily_loss_percent || 5)) / 100;
      const lossUsedPercent = newPnl < 0 
        ? Math.min((Math.abs(newPnl) / dailyLossLimit) * 100, 100)
        : 0;
      
      const tradingAllowed = lossUsedPercent < 100;
      
      const { error } = await supabase
        .from('daily_risk_snapshots')
        .update({
          current_pnl: newPnl,
          loss_limit_used_percent: lossUsedPercent,
          trading_allowed: tradingAllowed,
        })
        .eq('id', snapshot.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-risk-snapshot'] });
    },
  });

  return {
    ...gateState,
    isLoading: snapshotLoading || binancePnl.isLoading,
    snapshot,
    initializeSnapshot,
    updatePnl,
    thresholds: THRESHOLDS,
    isBinanceConnected,
  };
}
