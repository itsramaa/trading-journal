/**
 * Custom Service Worker for Background Sync
 * Handles Binance sync when tab is closed but browser is open
 */

// Background Sync tag
const SYNC_TAG = 'binance-sync';

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('[SW] Background sync triggered:', SYNC_TAG);
    event.waitUntil(performBackgroundSync());
  }
});

// Perform the actual sync via Edge Function
async function performBackgroundSync() {
  try {
    // Get stored sync request from IndexedDB
    const syncRequest = await getSyncRequest();
    
    if (!syncRequest) {
      console.log('[SW] No pending sync request found');
      return;
    }

    console.log('[SW] Performing background sync for user:', syncRequest.userId);

    // Call the edge function
    const response = await fetch(syncRequest.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${syncRequest.accessToken}`,
      },
      body: JSON.stringify({
        userId: syncRequest.userId,
        syncType: syncRequest.syncType || 'incremental',
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[SW] Background sync completed:', result);

    // Clear the sync request
    await clearSyncRequest();

    // Show notification
    await showSyncNotification(result);

  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    // The sync will be retried automatically by the browser
    throw error;
  }
}

// IndexedDB helpers for storing sync requests
const DB_NAME = 'tradingjournal-sw';
const STORE_NAME = 'sync-requests';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function getSyncRequest() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('current');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function clearSyncRequest() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete('current');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification for sync completion
async function showSyncNotification(result) {
  if (!self.registration.showNotification) {
    console.log('[SW] Notifications not supported');
    return;
  }

  const options = {
    body: result.success 
      ? `Synced ${result.tradesCount || 0} trades successfully`
      : 'Sync completed with errors',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'binance-sync-complete',
    data: {
      url: '/history',
      syncResult: result,
    },
    actions: [
      { action: 'view', title: 'View Trades' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  await self.registration.showNotification(
    result.success ? '✅ Binance Sync Complete' : '⚠️ Sync Finished',
    options
  );
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/history';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Handle push notifications from server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[SW] Push received:', data);

    const options = {
      body: data.body || 'New notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'general',
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Trading Journal', options)
    );
  } catch (error) {
    console.error('[SW] Push handling error:', error);
  }
});

console.log('[SW] Custom service worker loaded');
