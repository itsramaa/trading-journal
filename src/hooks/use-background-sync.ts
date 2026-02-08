/**
 * useBackgroundSync - Hook for managing background sync with Service Worker
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  isBackgroundSyncSupported,
  registerBackgroundSync,
  showLocalNotification,
} from '@/lib/background-sync';

interface UseBackgroundSyncResult {
  isSupported: boolean;
  isRegistering: boolean;
  registerSync: (syncType: 'full' | 'incremental') => Promise<boolean>;
}

export function useBackgroundSync(): UseBackgroundSyncResult {
  const { user, session } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  const isSupported = isBackgroundSyncSupported();

  const registerSync = useCallback(
    async (syncType: 'full' | 'incremental'): Promise<boolean> => {
      if (!isSupported) {
        console.warn('[BackgroundSync] Not supported, falling back to foreground sync');
        return false;
      }

      if (!user?.id || !session?.access_token) {
        toast.error('Please login to sync');
        return false;
      }

      setIsRegistering(true);

      try {
        const success = await registerBackgroundSync({
          userId: user.id,
          accessToken: session.access_token,
          syncType,
        });

        if (success) {
          toast.success(
            'Background sync registered. Sync will continue even if you close this tab.',
            { duration: 5000 }
          );

          // Show local notification as confirmation
          await showLocalNotification('Sync Registered', {
            body: 'Your Binance data will sync in the background',
            tag: 'sync-registered',
          });
        }

        return success;
      } catch (error) {
        console.error('[BackgroundSync] Registration failed:', error);
        toast.error('Failed to register background sync');
        return false;
      } finally {
        setIsRegistering(false);
      }
    },
    [isSupported, user?.id, session?.access_token]
  );

  return {
    isSupported,
    isRegistering,
    registerSync,
  };
}
