/**
 * API Rate Limit Hook
 * Monitor and display rate limit usage per user
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RateLimitStatus {
  endpoint_category: string;
  weight_used: number;
  max_weight: number;
  reset_at: string;
  usage_percent: number;
}

/**
 * Hook to get current rate limit status
 */
export function useApiRateLimit(exchange = 'binance') {
  return useQuery({
    queryKey: ['api-rate-limit', exchange],
    queryFn: async (): Promise<RateLimitStatus[]> => {
      const { data, error } = await supabase
        .rpc('get_rate_limit_status', { p_exchange: exchange });
      
      if (error) {
        console.error('Error fetching rate limit status:', error);
        return [];
      }
      
      return (data || []) as RateLimitStatus[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

/**
 * Get time remaining until rate limit resets
 */
export function getResetTimeRemaining(resetAt: string): number {
  const resetTime = new Date(resetAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((resetTime - now) / 1000));
}

/**
 * Format seconds as MM:SS
 */
export function formatResetTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
