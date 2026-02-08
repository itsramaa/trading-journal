/**
 * useBinanceBackgroundSync - Background periodic sync with notification support
 * Runs in the background when enabled, creates notifications on sync errors
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useBinanceConnectionStatus } from '@/features/binance';
import { 
  getAutoSyncSettings, 
  saveAutoSyncSettings,
} from '@/components/settings/BinanceAutoSyncToggle';
import { useBinanceIncrementalSync } from '@/hooks/use-binance-incremental-sync';

export interface BackgroundSyncState {
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  error: string | null;
}

/**
 * Hook to run background sync based on user settings
 * Should be mounted at app level (e.g., in DashboardLayout)
 */
export function useBinanceBackgroundSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRunRef = useRef<Date | null>(null);

  const { sync, isLoading } = useBinanceIncrementalSync({
    autoSyncOnMount: false, // We control the timing
  });

  // Run sync
  const runSync = useCallback(async () => {
    if (!isConnected || isLoading) return;

    try {
      sync();
      lastRunRef.current = new Date();
      
      // Update last sync timestamp in settings
      saveAutoSyncSettings({ lastSyncTimestamp: Date.now() });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Background sync failed:', error);
      
      // Create notification for sync failure if enabled
      const settings = getAutoSyncSettings();
      if (settings.notifyOnMismatch && user?.id) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'sync_error',
          title: 'Binance Sync Failed',
          message: 'Background sync encountered an error. Please try a manual sync.',
          metadata: { source: 'binance_background_sync' },
        });
      }
    }
  }, [isConnected, isLoading, sync, queryClient, user?.id]);

  // Setup interval based on settings
  useEffect(() => {
    if (!user?.id || !isConnected) return;

    const settings = getAutoSyncSettings();
    
    if (!settings.enabled) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Run immediately if stale (> interval since last sync)
    const lastSync = settings.lastSyncTimestamp;
    const intervalMs = settings.intervalMinutes * 60 * 1000;
    
    if (!lastSync || Date.now() - lastSync > intervalMs) {
      runSync();
    }

    // Set up periodic sync
    intervalRef.current = setInterval(runSync, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, isConnected, runSync]);

  // Listen for settings changes (when user toggles in Settings page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'binance_auto_sync_settings') {
        // Settings changed, the useEffect above will handle the update
        // by re-running when the component re-renders
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    isRunning: isLoading,
    lastRun: lastRunRef.current,
    triggerSync: runSync,
  };
}
