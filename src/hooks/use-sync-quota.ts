/**
 * Hook for managing sync quota usage
 * Provides current usage, max quota, and remaining syncs
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserSettings } from "@/hooks/use-user-settings";

export interface SyncQuotaInfo {
  currentCount: number;
  maxQuota: number;
  remaining: number;
  usagePercent: number;
  isExhausted: boolean;
}

export function useSyncQuota() {
  const { user } = useAuth();
  const { data: settings } = useUserSettings();

  return useQuery({
    queryKey: ["sync-quota", user?.id],
    queryFn: async (): Promise<SyncQuotaInfo> => {
      if (!user?.id) {
        return {
          currentCount: 0,
          maxQuota: 10,
          remaining: 10,
          usagePercent: 0,
          isExhausted: false,
        };
      }

      // Get today's usage from sync_quota_usage table
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('sync_quota_usage')
        .select('sync_count')
        .eq('user_id', user.id)
        .eq('sync_date', today)
        .maybeSingle();

      const currentCount = data?.sync_count ?? 0;
      const maxQuota = settings?.binance_daily_sync_quota ?? 10;
      const remaining = Math.max(0, maxQuota - currentCount);
      const usagePercent = maxQuota > 0 ? (currentCount / maxQuota) * 100 : 0;

      return {
        currentCount,
        maxQuota,
        remaining,
        usagePercent,
        isExhausted: remaining <= 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refresh every minute
  });
}
