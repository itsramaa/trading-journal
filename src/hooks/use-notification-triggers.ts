/**
 * Notification Triggers Hook
 * Automatically creates notifications based on system events:
 * - Position closed (via realtime subscription)
 * - Daily loss limit warnings (via risk status monitoring)
 * - Market alerts (via market data monitoring)
 */
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDailyRiskStatus } from "@/hooks/use-risk-profile";
import { useMarketSentiment } from "@/features/market-insight/useMarketSentiment";
import { supabase } from "@/integrations/supabase/client";
import { 
  notifyTradeClosed, 
  notifyDailyLossWarning, 
  notifyMarketAlert 
} from "@/lib/notification-service";
import type { TradeEntry } from "@/hooks/use-trade-entries";

const FEAR_GREED_THRESHOLDS = { low: 25, high: 75 };
const LOSS_THRESHOLDS = { warning: 70, danger: 90, limit: 100 };

interface NotificationTriggersOptions {
  enableTradeNotifications?: boolean;
  enableRiskNotifications?: boolean;
  enableMarketAlerts?: boolean;
}

/**
 * Hook that monitors system events and auto-creates notifications
 * Should be used in a top-level component (e.g., DashboardLayout)
 */
export function useNotificationTriggers(options: NotificationTriggersOptions = {}) {
  const {
    enableTradeNotifications = true,
    enableRiskNotifications = true,
    enableMarketAlerts = true,
  } = options;

  const { user } = useAuth();
  const { data: riskStatus } = useDailyRiskStatus();
  const { data: sentimentData } = useMarketSentiment();
  
  // Track which notifications we've already sent to avoid duplicates
  const sentNotifications = useRef<Set<string>>(new Set());
  
  // Helper to check if notification was already sent
  const wasNotificationSent = useCallback((key: string) => {
    return sentNotifications.current.has(key);
  }, []);
  
  const markNotificationSent = useCallback((key: string) => {
    sentNotifications.current.add(key);
    // Clean up old keys after 24 hours worth of keys
    if (sentNotifications.current.size > 100) {
      const keysArray = Array.from(sentNotifications.current);
      sentNotifications.current = new Set(keysArray.slice(-50));
    }
  }, []);

  // 1. Trade Closed Notifications (via realtime subscription)
  useEffect(() => {
    if (!user?.id || !enableTradeNotifications) return;

    const channel = supabase
      .channel('trade-closed-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trade_entries',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newTrade = payload.new as TradeEntry;
          const oldTrade = payload.old as Partial<TradeEntry>;
          
          // Check if trade just closed
          if (newTrade.status === 'closed' && oldTrade.status === 'open') {
            const notificationKey = `trade-closed-${newTrade.id}`;
            if (wasNotificationSent(notificationKey)) return;
            
            await notifyTradeClosed({
              userId: user.id,
              pair: newTrade.pair,
              direction: newTrade.direction,
              pnl: newTrade.realized_pnl || 0,
              result: (newTrade.result as 'win' | 'loss' | 'breakeven') || 'breakeven',
            });
            
            markNotificationSent(notificationKey);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, enableTradeNotifications, wasNotificationSent, markNotificationSent]);

  // 2. Daily Loss Limit Notifications
  useEffect(() => {
    if (!user?.id || !enableRiskNotifications || !riskStatus) return;
    
    const { loss_used_percent, current_pnl, loss_limit } = riskStatus;
    const today = new Date().toISOString().split('T')[0];
    
    // Only notify once per threshold per day
    const checkAndNotify = async (level: 'warning' | 'danger' | 'limit', threshold: number) => {
      if (loss_used_percent >= threshold) {
        const notificationKey = `loss-${level}-${today}`;
        if (wasNotificationSent(notificationKey)) return;
        
        await notifyDailyLossWarning({
          userId: user.id,
          percentage: loss_used_percent,
          level,
          currentLoss: current_pnl,
          lossLimit: loss_limit,
        });
        
        markNotificationSent(notificationKey);
      }
    };
    
    // Check thresholds in order (limit first to ensure most important notification)
    if (loss_used_percent >= LOSS_THRESHOLDS.limit) {
      checkAndNotify('limit', LOSS_THRESHOLDS.limit);
    } else if (loss_used_percent >= LOSS_THRESHOLDS.danger) {
      checkAndNotify('danger', LOSS_THRESHOLDS.danger);
    } else if (loss_used_percent >= LOSS_THRESHOLDS.warning) {
      checkAndNotify('warning', LOSS_THRESHOLDS.warning);
    }
  }, [user?.id, enableRiskNotifications, riskStatus, wasNotificationSent, markNotificationSent]);

  // 3. Market Alert Notifications (Extreme Fear/Greed)
  useEffect(() => {
    if (!user?.id || !enableMarketAlerts || !sentimentData) return;
    
    const fearGreedValue = sentimentData.sentiment.fearGreed.value;
    const hour = new Date().getHours();
    const today = new Date().toISOString().split('T')[0];
    
    // Extreme Fear
    if (fearGreedValue <= FEAR_GREED_THRESHOLDS.low) {
      const notificationKey = `extreme-fear-${today}-${hour}`;
      if (!wasNotificationSent(notificationKey)) {
        notifyMarketAlert({
          userId: user.id,
          alertType: 'extreme_fear',
          value: fearGreedValue,
          description: `Fear & Greed Index at ${fearGreedValue} - potential accumulation opportunity for long-term positions. Consider scaling into positions with tight risk management.`,
        });
        markNotificationSent(notificationKey);
      }
    }
    
    // Extreme Greed
    if (fearGreedValue >= FEAR_GREED_THRESHOLDS.high) {
      const notificationKey = `extreme-greed-${today}-${hour}`;
      if (!wasNotificationSent(notificationKey)) {
        notifyMarketAlert({
          userId: user.id,
          alertType: 'extreme_greed',
          value: fearGreedValue,
          description: `Fear & Greed Index at ${fearGreedValue} - consider taking profits and reducing exposure. Market may be overheated.`,
        });
        markNotificationSent(notificationKey);
      }
    }
  }, [user?.id, enableMarketAlerts, sentimentData, wasNotificationSent, markNotificationSent]);

  return {
    isActive: !!user?.id,
    enabledTriggers: {
      trades: enableTradeNotifications,
      risk: enableRiskNotifications,
      market: enableMarketAlerts,
    },
  };
}
