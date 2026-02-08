/**
 * Notification Service - Centralized notification creation
 * Handles automatic notification triggers for:
 * - Position closed
 * - Daily loss limit warnings (70%, 90%, 100%)
 * - Market alerts (extreme fear/greed, sentiment conflicts)
 */
import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | 'trade_closed'
  | 'daily_loss_warning'
  | 'daily_loss_limit'
  | 'market_alert'
  | 'weekly_report'
  | 'sync_error'
  | 'sync_warning'
  | 'system';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  assetSymbol?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification in the database
 */
export async function createNotification(input: CreateNotificationInput): Promise<boolean> {
  try {
    const insertData = {
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      asset_symbol: input.assetSymbol || null,
      metadata: input.metadata || {},
      read: false,
    };

    const { error } = await (supabase
      .from("notifications")
      .insert(insertData as never) as unknown as Promise<{ error: Error | null }>);

    if (error) {
      console.error("Failed to create notification:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error creating notification:", err);
    return false;
  }
}

/**
 * Notify when a trade position is closed
 */
export async function notifyTradeClosed(params: {
  userId: string;
  pair: string;
  direction: string;
  pnl: number;
  result: 'win' | 'loss' | 'breakeven';
}): Promise<boolean> {
  const { userId, pair, direction, pnl, result } = params;
  
  const resultEmoji = result === 'win' ? '🟢' : result === 'loss' ? '🔴' : '⚪';
  const pnlSign = pnl >= 0 ? '+' : '';
  
  return createNotification({
    userId,
    type: 'trade_closed',
    title: `${resultEmoji} Position Closed: ${pair}`,
    message: `${direction} position closed with ${pnlSign}$${pnl.toFixed(2)} P&L`,
    assetSymbol: pair,
    metadata: { pnl, direction, result },
  });
}

/**
 * Notify when daily loss limit threshold is reached
 */
export async function notifyDailyLossWarning(params: {
  userId: string;
  percentage: number;
  level: 'warning' | 'danger' | 'limit';
  currentLoss: number;
  lossLimit: number;
}): Promise<boolean> {
  const { userId, percentage, level, currentLoss, lossLimit } = params;
  
  let title: string;
  let message: string;
  
  switch (level) {
    case 'warning':
      title = '⚠️ Daily Loss Warning (70%)';
      message = `You've used ${percentage.toFixed(1)}% of your daily loss limit. Consider reducing position sizes.`;
      break;
    case 'danger':
      title = '🔴 Daily Loss Critical (90%)';
      message = `You've used ${percentage.toFixed(1)}% of your daily loss limit! Last trade of the day recommended.`;
      break;
    case 'limit':
      title = '🛑 Daily Loss Limit Reached';
      message = `Daily loss limit reached ($${Math.abs(currentLoss).toFixed(2)} of $${lossLimit.toFixed(2)}). Trading disabled.`;
      break;
  }
  
  return createNotification({
    userId,
    type: level === 'limit' ? 'daily_loss_limit' : 'daily_loss_warning',
    title,
    message,
    metadata: { percentage, currentLoss, lossLimit, level },
  });
}

/**
 * Notify when extreme market conditions are detected
 */
export async function notifyMarketAlert(params: {
  userId: string;
  alertType: 'extreme_fear' | 'extreme_greed' | 'sentiment_conflict';
  value: number;
  description: string;
}): Promise<boolean> {
  const { userId, alertType, value, description } = params;
  
  let title: string;
  let emoji: string;
  
  switch (alertType) {
    case 'extreme_fear':
      emoji = '😨';
      title = `${emoji} Extreme Fear: Index at ${value}`;
      break;
    case 'extreme_greed':
      emoji = '🤑';
      title = `${emoji} Extreme Greed: Index at ${value}`;
      break;
    case 'sentiment_conflict':
      emoji = '⚔️';
      title = `${emoji} Market Sentiment Conflict`;
      break;
  }
  
  return createNotification({
    userId,
    type: 'market_alert',
    title,
    message: description,
    metadata: { alertType, value },
  });
}

/**
 * Notify when weekly report is ready
 */
export async function notifyWeeklyReport(params: {
  userId: string;
  weekStart: string;
  weekEnd: string;
  totalTrades: number;
  netPnl: number;
  winRate: number;
}): Promise<boolean> {
  const { userId, weekStart, weekEnd, totalTrades, netPnl, winRate } = params;
  
  const pnlSign = netPnl >= 0 ? '+' : '';
  const resultEmoji = netPnl >= 0 ? '📈' : '📉';
  
  return createNotification({
    userId,
    type: 'weekly_report',
    title: `${resultEmoji} Weekly Report Ready`,
    message: `Week ${weekStart} - ${weekEnd}: ${totalTrades} trades, ${pnlSign}$${netPnl.toFixed(2)}, ${winRate.toFixed(1)}% win rate`,
    metadata: { weekStart, weekEnd, totalTrades, netPnl, winRate },
  });
}

/**
 * Notify when sync fails multiple times
 */
export async function notifySyncFailure(params: {
  userId: string;
  failureCount: number;
  lastError: string;
  sendEmail?: boolean;
}): Promise<boolean> {
  const { userId, failureCount, lastError, sendEmail = true } = params;
  
  // Create in-app notification
  const created = await createNotification({
    userId,
    type: 'sync_error',
    title: `🔴 Sync Failed ${failureCount}x Consecutively`,
    message: `Binance sync has failed ${failureCount} times in a row. Last error: ${lastError}. Please check your API credentials.`,
    metadata: { failureCount, lastError, timestamp: new Date().toISOString() },
  });
  
  // Optionally trigger email notification via edge function
  if (sendEmail && failureCount >= 3) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sync-failure-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            failureCount,
            lastError,
          }),
        });
      }
    } catch (err) {
      console.error('Failed to send sync failure email:', err);
    }
  }
  
  return created;
}

/**
 * Notify when sync has reconciliation issues
 */
export async function notifySyncReconciliationIssue(params: {
  userId: string;
  differencePercent: number;
  validTrades: number;
  invalidTrades: number;
}): Promise<boolean> {
  const { userId, differencePercent, validTrades, invalidTrades } = params;
  
  return createNotification({
    userId,
    type: 'sync_warning',
    title: `⚠️ P&L Reconciliation Mismatch`,
    message: `Sync completed but P&L differs by ${differencePercent.toFixed(2)}%. ${validTrades} valid trades, ${invalidTrades} invalid. Consider running Re-Sync.`,
    metadata: { differencePercent, validTrades, invalidTrades },
  });
}
