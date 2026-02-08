/**
 * Centralized notification type configuration
 * Maps notification types to their visual styles for consistent rendering
 */

import type { NotificationType } from '@/lib/notification-service';

export interface NotificationTypeConfig {
  colorClass: string;
  iconBgClass: string;
}

/**
 * Visual configuration for each notification type
 * Uses semantic design tokens for consistency
 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType | string, NotificationTypeConfig> = {
  // Trade notifications
  trade_closed: {
    colorClass: 'text-profit',
    iconBgClass: 'bg-profit/10 text-profit',
  },
  
  // Risk/Loss notifications
  daily_loss_warning: {
    colorClass: 'text-warning',
    iconBgClass: 'bg-warning/10 text-warning',
  },
  daily_loss_limit: {
    colorClass: 'text-loss',
    iconBgClass: 'bg-loss/10 text-loss',
  },
  
  // Market alerts
  market_alert: {
    colorClass: 'text-warning',
    iconBgClass: 'bg-warning/10 text-warning',
  },
  
  // Reports
  weekly_report: {
    colorClass: 'text-primary',
    iconBgClass: 'bg-primary/10 text-primary',
  },
  
  // Sync notifications
  sync_error: {
    colorClass: 'text-loss',
    iconBgClass: 'bg-loss/10 text-loss',
  },
  sync_warning: {
    colorClass: 'text-warning',
    iconBgClass: 'bg-warning/10 text-warning',
  },
  
  // System
  system: {
    colorClass: 'text-muted-foreground',
    iconBgClass: 'bg-muted text-muted-foreground',
  },
  
  // Legacy types (for backwards compatibility)
  success: {
    colorClass: 'text-profit',
    iconBgClass: 'bg-profit/10 text-profit',
  },
  price_alert: {
    colorClass: 'text-profit',
    iconBgClass: 'bg-profit/10 text-profit',
  },
  warning: {
    colorClass: 'text-warning',
    iconBgClass: 'bg-warning/10 text-warning',
  },
  error: {
    colorClass: 'text-loss',
    iconBgClass: 'bg-loss/10 text-loss',
  },
};

/**
 * Default configuration for unknown notification types
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationTypeConfig = {
  colorClass: 'text-primary',
  iconBgClass: 'bg-primary/10 text-primary',
};

/**
 * Get notification type configuration with fallback
 */
export function getNotificationConfig(type: string): NotificationTypeConfig {
  return NOTIFICATION_TYPE_CONFIG[type] || DEFAULT_NOTIFICATION_CONFIG;
}
