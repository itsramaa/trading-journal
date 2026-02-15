import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts open (non-deleted) trades across the given account IDs.
 */
export function useOpenTradesCount(accountIds: string[]) {
  return useQuery({
    queryKey: ['open-trades-count', accountIds],
    queryFn: async () => {
      if (!accountIds.length) return 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from('trade_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'open')
        .is('deleted_at', null)
        .in('trading_account_id', accountIds);

      return count || 0;
    },
    enabled: accountIds.length > 0,
    staleTime: 30 * 1000,
  });
}
