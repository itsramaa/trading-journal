/**
 * usePushNotifications - Hook for managing Web Push notification subscriptions
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import {
  isPushSupported,
  requestNotificationPermission,
  getPushSubscription,
} from '@/lib/background-sync';

// VAPID public key - should match the one in Edge Function
// This is a placeholder - generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission | 'unknown';
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = isPushSupported();

  // Check current subscription status on mount
  useEffect(() => {
    if (!isSupported || !user?.id) return;

    const checkStatus = async () => {
      // Check permission
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }

      // Check if subscribed
      const subscription = await getPushSubscription();
      setIsSubscribed(!!subscription);
    };

    checkStatus();
  }, [isSupported, user?.id]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) {
      toast.error('Push notifications not supported');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      toast.error('Push notifications not configured');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      // Save to database - use type assertion since types aren't updated yet
      const { error } = await (supabase.from('push_subscriptions') as any).upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
        is_active: true,
        user_agent: navigator.userAgent,
      }, {
        onConflict: 'user_id,endpoint',
      });

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      toast.success('Push notifications enabled');
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      toast.error('Failed to enable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) return false;

    setIsLoading(true);

    try {
      const subscription = await getPushSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database - use type assertion
        await (supabase.from('push_subscriptions') as any)
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      toast.error('Failed to disable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
