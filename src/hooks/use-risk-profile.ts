/**
 * Risk Profile Hook - Manages user's risk management settings
 * Now uses Binance data as primary source when connected
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/audit-logger";
import { useBinanceDailyPnl, useBinanceTotalBalance } from "@/hooks/use-binance-daily-pnl";
import { useTradeMode } from "@/hooks/use-trade-mode";
import type { RiskProfile, DailyRiskSnapshot, DailyRiskStatus } from "@/types/risk";
import { DEFAULT_RISK_PROFILE, RISK_THRESHOLDS } from "@/types/risk";
import { 
  DAILY_LOSS_THRESHOLDS, 
  DEFAULT_RISK_VALUES 
} from "@/lib/constants/risk-thresholds";

// Fetch risk profile
export function useRiskProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["risk-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("risk_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as RiskProfile | null;
    },
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
  });
}

// Create or update risk profile
export function useUpsertRiskProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<RiskProfile>) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Check if profile exists
      const { data: existing } = await supabase
        .from("risk_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("risk_profiles")
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new with centralized defaults
        const { data, error } = await supabase
          .from("risk_profiles")
          .insert({
            user_id: user.id,
            risk_per_trade_percent: input.risk_per_trade_percent ?? DEFAULT_RISK_PROFILE.risk_per_trade_percent,
            max_daily_loss_percent: input.max_daily_loss_percent ?? DEFAULT_RISK_PROFILE.max_daily_loss_percent,
            max_weekly_drawdown_percent: input.max_weekly_drawdown_percent ?? DEFAULT_RISK_PROFILE.max_weekly_drawdown_percent,
            max_position_size_percent: input.max_position_size_percent ?? DEFAULT_RISK_PROFILE.max_position_size_percent,
            max_correlated_exposure: input.max_correlated_exposure ?? DEFAULT_RISK_PROFILE.max_correlated_exposure,
            max_concurrent_positions: input.max_concurrent_positions ?? DEFAULT_RISK_PROFILE.max_concurrent_positions,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["risk-profile"] });
      toast.success("Risk profile saved successfully");
      if (user?.id && data) {
        logAuditEvent(user.id, {
          action: 'risk_profile_updated',
          entityType: 'risk_profile',
          entityId: data.id,
          metadata: { changed_fields: Object.keys(data) },
        });
      }
    },
  });
}

// Get today's risk snapshot (for Paper Trading fallback)
export function useDailyRiskSnapshot() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ["daily-risk-snapshot", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("daily_risk_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .eq("snapshot_date", today)
        .maybeSingle();

      if (error) throw error;
      return data as DailyRiskSnapshot | null;
    },
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
  });
}

// Update daily risk snapshot
export function useUpdateDailyRiskSnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  return useMutation({
    mutationFn: async (input: Partial<DailyRiskSnapshot>) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Check if snapshot exists
      const { data: existing } = await supabase
        .from("daily_risk_snapshots")
        .select("id")
        .eq("user_id", user.id)
        .eq("snapshot_date", today)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("daily_risk_snapshots")
          .update(input)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("daily_risk_snapshots")
          .insert({
            user_id: user.id,
            snapshot_date: today,
            starting_balance: input.starting_balance ?? 0,
            current_pnl: input.current_pnl ?? 0,
            loss_limit_used_percent: input.loss_limit_used_percent ?? 0,
            positions_open: input.positions_open ?? 0,
            capital_deployed_percent: input.capital_deployed_percent ?? 0,
            trading_allowed: input.trading_allowed ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-risk-snapshot"] });
    },
    onError: (error) => {
      toast.error(`Failed to update risk snapshot: ${error.message}`);
    },
  });
}

// Calculate daily risk status - System-first with Binance enrichment
export function useDailyRiskStatus() {
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { data: snapshot, isLoading: snapshotLoading } = useDailyRiskSnapshot();
  const { isPaper } = useTradeMode();
  
  // Binance data (optional enrichment - skip in Paper mode M-26)
  const { totalBalance: binanceBalance, isConnected: isBinanceConnected } = useBinanceTotalBalance();
  const binancePnl = useBinanceDailyPnl();

  const calculateStatus = (): DailyRiskStatus | null => {
    if (!riskProfile) return null;
    
    const maxDailyLossPercent = riskProfile.max_daily_loss_percent || DEFAULT_RISK_PROFILE.max_daily_loss_percent;
    
    // Priority 1: Use Binance data if connected, has balance, AND NOT in Paper mode (M-26)
    if (!isPaper && isBinanceConnected && binanceBalance > 0) {
      const startingBalance = binanceBalance;
      const currentPnl = binancePnl.totalPnl;
      const lossLimit = startingBalance * (maxDailyLossPercent / 100);
      const lossUsedPercent = currentPnl < 0 
        ? (Math.abs(currentPnl) / lossLimit) * 100 
        : 0;
      const remainingBudget = lossLimit + Math.min(0, currentPnl);
      
      // Use centralized thresholds
      let status: 'ok' | 'warning' | 'disabled' = 'ok';
      if (lossUsedPercent >= DAILY_LOSS_THRESHOLDS.DISABLED) {
        status = 'disabled';
      } else if (lossUsedPercent >= DAILY_LOSS_THRESHOLDS.WARNING) {
        status = 'warning';
      }

      return {
        date: new Date().toISOString().split('T')[0],
        starting_balance: startingBalance,
        current_pnl: currentPnl,
        loss_limit: lossLimit,
        loss_used_percent: lossUsedPercent,
        remaining_budget: Math.max(0, remainingBudget),
        trading_allowed: status !== 'disabled',
        status,
      };
    }
    
    // Priority 2: Fallback to local snapshot (Paper Trading)
    if (snapshot && snapshot.starting_balance > 0) {
      const lossLimit = snapshot.starting_balance * (maxDailyLossPercent / 100);
      const lossUsedPercent = snapshot.starting_balance > 0 
        ? (Math.abs(Math.min(0, snapshot.current_pnl || 0)) / lossLimit) * 100 
        : 0;
      const remainingBudget = lossLimit + Math.min(0, snapshot.current_pnl || 0);
      
      // Use centralized thresholds
      let status: 'ok' | 'warning' | 'disabled' = 'ok';
      if (lossUsedPercent >= DAILY_LOSS_THRESHOLDS.DISABLED) {
        status = 'disabled';
      } else if (lossUsedPercent >= DAILY_LOSS_THRESHOLDS.WARNING) {
        status = 'warning';
      }

      return {
        date: snapshot.snapshot_date,
        starting_balance: snapshot.starting_balance,
        current_pnl: snapshot.current_pnl || 0,
        loss_limit: lossLimit,
        loss_used_percent: lossUsedPercent,
        remaining_budget: Math.max(0, remainingBudget),
        trading_allowed: status !== 'disabled',
        status,
      };
    }
    
    // No data source available
    return null;
  };

  return {
    data: calculateStatus(),
    riskProfile,
    snapshot,
    isBinanceConnected,
    isLoading: profileLoading || snapshotLoading,
  };
}
