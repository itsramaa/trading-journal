/**
 * Background Sync Client Library
 * Provides APIs to register sync tasks that continue when tab is closed
 */

const DB_NAME = 'tradingjournal-sw';
const STORE_NAME = 'sync-requests';
const SYNC_TAG = 'binance-sync';

interface SyncRequest {
  id: string;
  userId: string;
  accessToken: string;
  edgeFunctionUrl: string;
  syncType: 'full' | 'incremental';
  createdAt: number;
}

/**
 * Check if Background Sync is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Check if Push Notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Open IndexedDB for storing sync requests
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Store sync request in IndexedDB for service worker to pick up
 */
async function storeSyncRequest(request: SyncRequest): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(request);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

/**
 * Register a background sync task
 * This will continue even if the tab is closed (as long as browser is open)
 */
export async function registerBackgroundSync(options: {
  userId: string;
  accessToken: string;
  syncType: 'full' | 'incremental';
}): Promise<boolean> {
  if (!isBackgroundSyncSupported()) {
    console.warn('[BackgroundSync] Not supported in this browser');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Store the sync request data for the service worker
    await storeSyncRequest({
      id: 'current',
      userId: options.userId,
      accessToken: options.accessToken,
      edgeFunctionUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-background-sync`,
      syncType: options.syncType,
      createdAt: Date.now(),
    });

    // Register the sync - use type assertion for Background Sync API
    const syncManager = (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync;
    await syncManager.register(SYNC_TAG);
    console.log('[BackgroundSync] Sync registered:', SYNC_TAG);
    return true;
  } catch (error) {
    console.error('[BackgroundSync] Failed to register:', error);
    return false;
  }
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[Push] Permission:', permission);
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[Push] Push not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check existing subscription
    let subscription = await (registration as any).pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Already subscribed');
      return subscription;
    }

    // Subscribe with VAPID key
    subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    console.log('[Push] Subscribed:', subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await (registration as any).pushManager.getSubscription();
  } catch (error) {
    console.error('[Push] Get subscription failed:', error);
    return null;
  }
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

/**
 * Show a local notification (for testing or fallback)
 */
export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!('Notification' in window)) return;
  
  if (Notification.permission !== 'granted') {
    await requestNotificationPermission();
  }

  if (Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options,
    });
  }
}
