/**
 * Hook to get the effective data source filter based on user settings
 * 
 * When use_binance_history is:
 * - true: Show all trades (binance + manual) -> source filter = undefined
 * - false: Show only non-binance trades -> source filter = 'manual'
 */
import { useMemo } from 'react';
import { useUserSettings } from '@/hooks/use-user-settings';

export interface DataSourceFilter {
  /** The source filter to apply to queries */
  sourceFilter: 'manual' | 'binance' | undefined;
  /** Whether binance history is enabled */
  useBinanceHistory: boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Returns the appropriate source filter based on user's use_binance_history setting
 */
export function useBinanceDataSource(): DataSourceFilter {
  const { data: settings, isLoading } = useUserSettings();

  const result = useMemo<DataSourceFilter>(() => {
    // Default to showing all if settings not loaded
    if (!settings) {
      return {
        sourceFilter: undefined,
        useBinanceHistory: true,
        isLoading,
      };
    }

    const useBinanceHistory = settings.use_binance_history !== false; // Default true

    return {
      // If binance history is disabled, only show manual trades
      sourceFilter: useBinanceHistory ? undefined : 'manual',
      useBinanceHistory,
      isLoading,
    };
  }, [settings, isLoading]);

  return result;
}

/**
 * Hook to get sync quota information
 */
export function useSyncQuota() {
  const { data: settings, isLoading } = useUserSettings();

  return useMemo(() => ({
    dailyQuota: settings?.binance_daily_sync_quota ?? 10,
    isLoading,
  }), [settings, isLoading]);
}
