/**
 * Trading Gate Hook - Central control for trading permissions
 * REFACTORED: Uses unified balance and P&L sources for both Binance and Paper Trading
 * Checks daily loss limits and AI quality scores to determine if trading is allowed
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useRiskProfile } from '@/hooks/use-risk-profile';
import { useBestAvailableBalance, AccountSourceType } from '@/hooks/use-combined-balance';
import { useUnifiedDailyPnl } from '@/hooks/use-unified-daily-pnl';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { useMemo } from 'react';
import { 
  DAILY_LOSS_THRESHOLDS, 
  AI_QUALITY_THRESHOLDS,
  DEFAULT_RISK_VALUES 
} from '@/lib/constants/risk-thresholds';

export interface TradingGateState {
  canTrade: boolean;
  reason: string | null;
  status: 'ok' | 'warning' | 'disabled';
  lossUsedPercent: number;
  remainingBudget: number;
  dailyLossLimit: number;
  currentPnl: number;
  startingBalance: number;
  source: AccountSourceType;
  // AI Quality gate
  aiQualityWarning: boolean;
  aiQualityBlocked: boolean;
  avgRecentQuality: number;
}

export function useTradingGate() {
  const { user } = useAuth();
  const { data: riskProfile } = useRiskProfile();
  const queryClient = useQueryClient();
  
  // UNIFIED: Use single source for balance (Binance or Paper)
  const { balance: startingBalance, source, isLoading: balanceLoading } = useBestAvailableBalance();
  
  // UNIFIED: Use single source for daily P&L (Binance or Paper)
  const dailyPnl = useUnifiedDailyPnl();
  
  // Trade entries for AI quality check
  const { data: trades = [] } = useTradeEntries();

  // Calculate AI quality from recent trades using centralized thresholds
  const aiQualityData = useMemo(() => {
    const closedTrades = trades
      .filter(t => t.status === 'closed' && t.ai_quality_score !== null)
      .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())
      .slice(0, AI_QUALITY_THRESHOLDS.SAMPLE_COUNT);
    
    if (closedTrades.length < AI_QUALITY_THRESHOLDS.SAMPLE_COUNT) {
      return { avgQuality: 100, hasEnoughData: false };
    }
    
    const avgQuality = closedTrades.reduce((sum, t) => sum + (t.ai_quality_score || 0), 0) / closedTrades.length;
    return { avgQuality, hasEnoughData: true };
  }, [trades]);

  // UNIFIED: Calculate trading gate state (same logic for both sources)
  const gateState = useMemo((): TradingGateState => {
    const maxDailyLossPercent = riskProfile?.max_daily_loss_percent || DEFAULT_RISK_VALUES.MAX_DAILY_LOSS;
    const currentPnl = dailyPnl.totalPnl;
    
    // AI Quality checks using centralized thresholds
    const aiQualityWarning = aiQualityData.hasEnoughData && aiQualityData.avgQuality < AI_QUALITY_THRESHOLDS.WARNING_BELOW;
    const aiQualityBlocked = aiQualityData.hasEnoughData && aiQualityData.avgQuality < AI_QUALITY_THRESHOLDS.BLOCK_BELOW;
    
    // Calculate daily loss metrics
    const dailyLossLimit = startingBalance > 0 
      ? (startingBalance * maxDailyLossPercent) / 100 
      : 0;
    
    const lossUsedPercent = currentPnl < 0 && dailyLossLimit > 0
      ? Math.min((Math.abs(currentPnl) / dailyLossLimit) * 100, 100)
      : 0;
    
    const remainingBudget = dailyLossLimit - Math.abs(Math.min(currentPnl, 0));

    // Determine gate status using centralized thresholds
    let status: 'ok' | 'warning' | 'disabled' = 'ok';
    let canTrade = true;
    let reason: string | null = null;

    // Check thresholds in order of severity
    if (lossUsedPercent >= DAILY_LOSS_THRESHOLDS.DISABLED) {
      status = 'disabled';
      canTrade = false;
      reason = 'Daily loss limit reached. Trading disabled for today.';
    } else if (aiQualityBlocked) {
      status = 'disabled';
      canTrade = false;
      reason = `Low AI quality score (${aiQualityData.avgQuality.toFixed(0)}%). Review recent trades before continuing.`;
    } else if (lossUsedPercent >= DAILY_LOSS_THRESHOLDS.DANGER) {
      status = 'warning';
      reason = `Danger: ${lossUsedPercent.toFixed(0)}% of daily loss limit used. Consider stopping.`;
    } else if (lossUsedPercent >= DAILY_LOSS_THRESHOLDS.WARNING || aiQualityWarning) {
      status = 'warning';
      if (aiQualityWarning) {
        reason = `AI quality warning: Average score ${aiQualityData.avgQuality.toFixed(0)}% on last ${AI_QUALITY_THRESHOLDS.SAMPLE_COUNT} trades.`;
      } else {
        reason = `Warning: ${lossUsedPercent.toFixed(0)}% of daily loss limit used.`;
      }
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
      source,
      aiQualityWarning,
      aiQualityBlocked,
      avgRecentQuality: aiQualityData.avgQuality,
    };
  }, [startingBalance, source, dailyPnl, riskProfile, aiQualityData]);

  // Manual override: Disable trading for today (Paper Trading only)
  const disableTrading = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('daily_risk_snapshots')
        .upsert({
          user_id: user.id,
          snapshot_date: today,
          starting_balance: startingBalance,
          current_pnl: gateState.currentPnl,
          loss_limit_used_percent: 100,
          trading_allowed: false,
        }, {
          onConflict: 'user_id,snapshot_date',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-risk-snapshot'] });
    },
  });

  // Re-enable trading (Paper Trading only)
  const enableTrading = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('daily_risk_snapshots')
        .update({ trading_allowed: true })
        .eq('user_id', user.id)
        .eq('snapshot_date', today);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-risk-snapshot'] });
    },
  });

  return {
    ...gateState,
    isLoading: balanceLoading || dailyPnl.isLoading,
    thresholds: DAILY_LOSS_THRESHOLDS,
    // Actions (Paper Trading only)
    disableTrading,
    enableTrading,
    // Stats from daily P&L
    dailyStats: {
      totalTrades: dailyPnl.totalTrades,
      wins: dailyPnl.wins,
      losses: dailyPnl.losses,
      winRate: dailyPnl.winRate,
    },
  };
}
