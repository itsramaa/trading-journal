/**
 * Risk Events Hook - Logs and fetches risk-related events
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export interface RiskEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_date: string;
  trigger_value: number;
  threshold_value: number;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type RiskEventType = 
  | 'warning_70'
  | 'warning_90'
  | 'limit_reached'
  | 'trading_disabled'
  | 'trading_enabled'
  | 'position_limit_warning'
  | 'correlation_warning';

export function useRiskEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch recent risk events
  const { data: events, isLoading } = useQuery({
    queryKey: ['risk-events', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('risk_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as RiskEvent[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  // Fetch today's events
  const { data: todayEvents } = useQuery({
    queryKey: ['risk-events-today', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('risk_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RiskEvent[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Log a new risk event
  const logEvent = useMutation({
    mutationFn: async ({
      eventType,
      triggerValue,
      thresholdValue,
      message,
      metadata = {},
    }: {
      eventType: RiskEventType;
      triggerValue: number;
      thresholdValue: number;
      message: string;
      metadata?: Record<string, string | number | boolean>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if this event type was already logged today
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('risk_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_date', today)
        .eq('event_type', eventType)
        .maybeSingle();

      // Don't log duplicate events for the same day
      if (existing) return null;

      const { data, error } = await supabase
        .from('risk_events')
        .insert([{
          user_id: user.id,
          event_type: eventType,
          event_date: today,
          trigger_value: triggerValue,
          threshold_value: thresholdValue,
          message,
          metadata: metadata as unknown as Record<string, never>,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-events'] });
      queryClient.invalidateQueries({ queryKey: ['risk-events-today'] });
    },
  });

  return {
    events,
    todayEvents,
    isLoading,
    logEvent,
  };
}
