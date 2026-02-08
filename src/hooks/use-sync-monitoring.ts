/**
 * useSyncMonitoring - Monitoring hook for sync health, failures, and reconciliation alerts
 * Part of Phase 5: Monitoring for Binance Aggregation Architecture
 * 
 * Features:
 * 1. Tracks sync failure count with retry logic
 * 2. Creates notifications for reconciliation mismatches
 * 3. Provides data quality metrics
 * 4. Exponential backoff for retry attempts
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { AggregationResult } from '@/services/binance/types';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'binance_sync_monitoring';
const MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY_MS = 5000; // 5 seconds

// =============================================================================
// Types
// =============================================================================

interface SyncMonitoringState {
  lastSyncResult: AggregationResult | null;
  lastSyncTimestamp: number | null;
  failureCount: number;
  consecutiveFailures: number;
  lastFailureReason: string | null;
  retryScheduled: boolean;
}

interface MonitoringConfig {
  enableReconciliationAlerts: boolean;
  enableFailureNotifications: boolean;
  reconciliationThresholdPercent: number;
  maxConsecutiveFailures: number;
}

// =============================================================================
// Storage Helpers
// =============================================================================

function getMonitoringState(): SyncMonitoringState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        lastSyncResult: parsed.lastSyncResult || null,
        lastSyncTimestamp: parsed.lastSyncTimestamp || null,
        failureCount: parsed.failureCount || 0,
        consecutiveFailures: parsed.consecutiveFailures || 0,
        lastFailureReason: parsed.lastFailureReason || null,
        retryScheduled: false,
      };
    }
  } catch (e) {
    console.warn('[SyncMonitoring] Failed to load state:', e);
  }
  
  return {
    lastSyncResult: null,
    lastSyncTimestamp: null,
    failureCount: 0,
    consecutiveFailures: 0,
    lastFailureReason: null,
    retryScheduled: false,
  };
}

function saveMonitoringState(state: Partial<SyncMonitoringState>): void {
  try {
    const current = getMonitoringState();
    const updated = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[SyncMonitoring] Failed to save state:', e);
  }
}

// =============================================================================
// Hook
// =============================================================================

interface UseSyncMonitoringOptions {
  config?: Partial<MonitoringConfig>;
  onRetryTriggered?: () => void;
}

export function useSyncMonitoring(options: UseSyncMonitoringOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const config: MonitoringConfig = {
    enableReconciliationAlerts: true,
    enableFailureNotifications: true,
    reconciliationThresholdPercent: 0.1, // 0.1% threshold
    maxConsecutiveFailures: MAX_RETRY_COUNT,
    ...options.config,
  };

  const [state, setState] = useState<SyncMonitoringState>(getMonitoringState);

  // Update state and persist
  const updateState = useCallback((updates: Partial<SyncMonitoringState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      saveMonitoringState(newState);
      return newState;
    });
  }, []);

  // Record successful sync
  const recordSyncSuccess = useCallback(async (result: AggregationResult) => {
    updateState({
      lastSyncResult: result,
      lastSyncTimestamp: Date.now(),
      consecutiveFailures: 0,
      lastFailureReason: null,
      retryScheduled: false,
    });

    // Check for reconciliation issues and create alert
    if (config.enableReconciliationAlerts && !result.reconciliation.isReconciled) {
      const diffPercent = result.reconciliation.differencePercent;
      
      if (diffPercent > config.reconciliationThresholdPercent && user?.id) {
        // Create notification for reconciliation mismatch
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'sync_warning',
          title: 'P&L Reconciliation Mismatch',
          message: `Sync completed but P&L differs by ${diffPercent.toFixed(2)}%. Consider running a Re-Sync for affected period.`,
          metadata: {
            source: 'binance_sync_monitoring',
            reconciliation: result.reconciliation,
            stats: result.stats,
          },
        });

        toast.warning('Reconciliation mismatch detected', {
          description: `P&L differs by ${diffPercent.toFixed(2)}%. Check notifications for details.`,
        });
      }
    }

    // Invalidate notifications query to show new alerts
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [config, user?.id, queryClient, updateState]);

  // Record sync failure
  const recordSyncFailure = useCallback(async (error: Error | string) => {
    const reason = typeof error === 'string' ? error : error.message;
    const newFailureCount = state.failureCount + 1;
    const newConsecutiveFailures = state.consecutiveFailures + 1;

    updateState({
      failureCount: newFailureCount,
      consecutiveFailures: newConsecutiveFailures,
      lastFailureReason: reason,
    });

    // Create notification for persistent failures
    if (config.enableFailureNotifications && 
        newConsecutiveFailures >= config.maxConsecutiveFailures && 
        user?.id) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'sync_error',
        title: 'Binance Sync Failed Repeatedly',
        message: `Sync has failed ${newConsecutiveFailures} times in a row. Last error: ${reason}`,
        metadata: {
          source: 'binance_sync_monitoring',
          failureCount: newConsecutiveFailures,
          lastError: reason,
        },
      });

      toast.error('Sync failed multiple times', {
        description: 'Check your API connection and credentials.',
      });
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    return newConsecutiveFailures;
  }, [state, config, user?.id, queryClient, updateState]);

  // Schedule retry with exponential backoff
  const scheduleRetry = useCallback((retryFn: () => Promise<void>) => {
    if (state.consecutiveFailures >= config.maxConsecutiveFailures) {
      console.log('[SyncMonitoring] Max retries reached, not scheduling retry');
      return;
    }

    // Clear any existing retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Calculate delay with exponential backoff + jitter
    const backoffMultiplier = Math.pow(2, state.consecutiveFailures);
    const jitter = Math.random() * 1000;
    const delayMs = (BASE_RETRY_DELAY_MS * backoffMultiplier) + jitter;

    console.log(`[SyncMonitoring] Scheduling retry in ${Math.round(delayMs / 1000)}s`);
    
    updateState({ retryScheduled: true });

    retryTimeoutRef.current = setTimeout(async () => {
      updateState({ retryScheduled: false });
      options.onRetryTriggered?.();
      
      try {
        await retryFn();
      } catch (error) {
        console.error('[SyncMonitoring] Retry failed:', error);
      }
    }, delayMs);
  }, [state.consecutiveFailures, config.maxConsecutiveFailures, options, updateState]);

  // Reset failure count
  const resetFailures = useCallback(() => {
    updateState({
      failureCount: 0,
      consecutiveFailures: 0,
      lastFailureReason: null,
      retryScheduled: false,
    });
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    lastSyncResult: state.lastSyncResult,
    lastSyncTimestamp: state.lastSyncTimestamp,
    failureCount: state.failureCount,
    consecutiveFailures: state.consecutiveFailures,
    lastFailureReason: state.lastFailureReason,
    isRetryScheduled: state.retryScheduled,
    
    // Data quality metrics
    dataQuality: {
      isHealthy: state.lastSyncResult?.reconciliation.isReconciled ?? false,
      validTradesPercent: state.lastSyncResult 
        ? (state.lastSyncResult.stats.validTrades / 
           (state.lastSyncResult.stats.validTrades + state.lastSyncResult.stats.invalidTrades)) * 100
        : 0,
      hasReconciliationIssue: state.lastSyncResult 
        ? !state.lastSyncResult.reconciliation.isReconciled 
        : false,
    },
    
    // Actions
    recordSyncSuccess,
    recordSyncFailure,
    scheduleRetry,
    resetFailures,
  };
}
