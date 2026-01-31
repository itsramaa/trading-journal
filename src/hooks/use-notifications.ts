import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  asset_symbol?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const NOTIFICATIONS_KEY = ["notifications"];

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: async () => {
      if (!user?.id) return [];

      // Use type assertion since the table was just created and types may not be synced
      const { data, error } = await (supabase
        .from("notifications" as "notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50) as unknown as Promise<{ data: Notification[] | null; error: Error | null }>);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Realtime subscription for notifications
 * Call this hook once in a top-level component (e.g., DashboardLayout) to enable instant updates
 */
export function useNotificationsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate query to refetch with debounce
          queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}

export function useUnreadCount() {
  const { data: notifications = [] } = useNotifications();
  return notifications.filter(n => !n.read).length;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("notifications" as "notifications")
        .update({ read: true })
        .eq("id", id) as unknown as Promise<{ error: Error | null }>);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await (supabase
        .from("notifications" as "notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false) as unknown as Promise<{ error: Error | null }>);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      type: string;
      title: string;
      message: string;
      asset_symbol?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const insertData = {
        user_id: user.id,
        type: input.type,
        title: input.title,
        message: input.message,
        asset_symbol: input.asset_symbol || null,
        metadata: input.metadata || {},
      };

      const { data, error } = await (supabase
        .from("notifications" as "notifications")
        .insert(insertData as never)
        .select()
        .single() as unknown as Promise<{ data: Notification | null; error: Error | null }>);

      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await (supabase
        .from("notifications" as "notifications")
        .delete()
        .eq("user_id", user.id) as unknown as Promise<{ error: Error | null }>);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
