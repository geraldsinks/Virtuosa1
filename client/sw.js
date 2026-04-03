// Virtuosa Service Worker for Background Notifications
const CACHE_VERSION = 'v1.3.0';
const CACHE_NAME = `virtuosa-${CACHE_VERSION}`;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache size
const MAX_CACHE_ENTRIES = 100; // Maximum number of cached items

const urlsToCache = [
  '/',
  '/index.html',
  '/pages/notifications.html',
  '/css/style.css',
  '/js/notifications.js',
  '/js/config.js',
  '/favicon.ico'
];

// IndexedDB for persistent cache metadata storage
const DB_NAME = 'virtuosa-sw-db';
const DB_VERSION = 1;
const STORE_NAME = 'cache-metadata';

// Cache management utilities with IndexedDB
const cacheManager = {
  // Initialize IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  },

  // Store timestamp in IndexedDB
  async setTimestamp(requestUrl) {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const data = {
        url: requestUrl,
        timestamp: Date.now()
      };
      
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Get timestamp from IndexedDB
  async getTimestamp(requestUrl) {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(requestUrl);
      request.onsuccess = () => resolve(request.result?.timestamp);
      request.onerror = () => reject(request.error);
    });
  },

  // Delete timestamp from IndexedDB
  async deleteTimestamp(requestUrl) {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(requestUrl);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Clean up old timestamps periodically
  async cleanupOldTimestamps() {
    if (!this.db) await this.initDB();
    
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const cutoffTime = now - maxAge;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          if (deletedCount > 0) {
            console.log(`🧹 Cleaned ${deletedCount} expired timestamp entries from IndexedDB`);
          }
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  // Get cache size estimate without loading blobs
  async getCacheSizeEstimate(cache) {
    const keys = await cache.keys();
    return { size: 0, count: keys.length }; // Estimate count without loading all data
  },

  // Implement LRU eviction to maintain cache limits
  async enforceCacheLimits(cache) {
    const { count } = await this.getCacheSizeEstimate(cache);
    
    if (count <= MAX_CACHE_ENTRIES) {
      return; // Cache is within limits
    }

    console.log(`Cache exceeds limit: ${count} entries. Enforcing LRU eviction.`);
    
    // Get all cache entries with timestamps from IndexedDB
    const keys = await cache.keys();
    const entries = [];
    
    for (const request of keys) {
      try {
        const timestamp = await this.getTimestamp(request.url) || Date.now();
        entries.push({
          request,
          timestamp
        });
      } catch (error) {
        console.error('Error getting timestamp:', error);
        entries.push({
          request,
          timestamp: Date.now()
        });
      }
    }

    // Sort by timestamp (oldest first) for LRU eviction
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until within limit
    let currentCount = count;
    
    for (const entry of entries) {
      if (currentCount <= MAX_CACHE_ENTRIES) {
        break;
      }
      
      await cache.delete(entry.request);
      await this.deleteTimestamp(entry.request.url);
      currentCount--;
      console.log(`Evicted from cache: ${entry.request.url}`);
    }
    
    console.log(`Cache cleanup complete. New count: ${currentCount} entries`);
  },

  // Initialize periodic cleanup
  initPeriodicCleanup() {
    // Clean up timestamps every 10 minutes
    setInterval(() => {
      this.cleanupOldTimestamps().catch(error => {
        console.error('Periodic cleanup failed:', error);
      });
    }, 10 * 60 * 1000); // Every 10 minutes
  }
};

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed:', error);
        // Try to cache essential files individually
        return caches.open(CACHE_NAME).then((cache) => {
          const essentialFiles = ['/index.html', '/favicon.ico'];
          return Promise.all(
            essentialFiles.map(url => 
              cache.add(url).catch(err => 
                console.error(`Failed to cache ${url}:`, err)
              )
            )
          );
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Only delete caches that don't match current version
          if (!cacheName.startsWith(`virtuosa-${CACHE_VERSION}`)) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
          // Also clean up any caches with timestamp pattern (old format)
          if (cacheName.includes('-') && cacheName.split('-').length > 3) {
            const parts = cacheName.split('-');
            // Check if last part looks like a timestamp
            const lastPart = parts[parts.length - 1];
            if (lastPart.length === 13 && !isNaN(lastPart)) {
              console.log('Service Worker: Clearing timestamp-based cache:', cacheName);
              return caches.delete(cacheName);
            }
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    }).then(() => {
      // Initialize IndexedDB and periodic cleanup after activation
      return cacheManager.initDB().then(() => {
        cacheManager.initPeriodicCleanup();
        console.log('Service Worker: IndexedDB and periodic cleanup initialized');
      });
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Check cache first
        return cache.match(event.request)
          .then((response) => {
            // Cache hit - return response
            if (response) {
              return response;
            }

            // Clone the request
            const fetchRequest = event.request.clone();

            return fetch(fetchRequest).then((response) => {
              // Check if valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              // Store timestamp separately and cache the response
              cacheManager.setTimestamp(event.request.url);
              
              // Cache the response and enforce limits
              cache.put(event.request, responseToCache).then(() => {
                return cacheManager.enforceCacheLimits(cache);
              }).catch((error) => {
                console.error('Cache put error:', error);
              });

              return response;
            }).catch(() => {
              // Offline fallback
              if (event.request.destination === 'document') {
                return caches.match('/index.html');
              }
            });
          });
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  let notificationData = {
    title: 'Virtuosa Notification',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'virtuosa-notification',
    requireInteraction: false,
    actions: []
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };

      // Set requireInteraction based on priority
      if (data.priority === 'high' || data.priority === 'critical') {
        notificationData.requireInteraction = true;
      }

      // Add action buttons if actionUrl is provided
      if (data.actionUrl && data.actionText) {
        notificationData.actions = [
          {
            action: 'view',
            title: data.actionText || 'View Details'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ];
      }

    } catch (error) {
      console.error('Service Worker: Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: {
        url: notificationData.actionUrl || '/',
        notificationId: notificationData.id,
        timestamp: Date.now()
      }
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'dismiss') {
    // User dismissed the notification
    return;
  }

  // Default action or 'view' action - open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === notificationData.url && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(notificationData.url);
        }
      })
  );
});

// Notification close event (user manually closed)
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
  
  // You can track notification analytics here
  const notificationData = event.notification.data;
  
  // Send analytics to server if needed
  if (notificationData.notificationId) {
    fetch('/api/notifications/analytics/dismiss', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: notificationData.notificationId,
        dismissedAt: new Date().toISOString()
      })
    }).catch(error => {
      console.error('Failed to send notification analytics:', error);
    });
  }
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync');
  
  if (event.tag === 'background-sync-notifications') {
    event.waitUntil(
      // Sync pending notifications
      syncNotifications()
    );
  }
});

// Periodic sync for updating notifications
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync');
  
  if (event.tag === 'periodic-sync-notifications') {
    event.waitUntil(
      // Check for new notifications periodically
      checkForNewNotifications()
    );
  }
});

// Helper function to sync notifications
async function syncNotifications() {
  try {
    // Get any stored offline actions
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, action.options);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper function to check for new notifications
async function checkForNewNotifications() {
  try {
    // This would typically check with the server for new notifications
    // Implementation depends on your API structure
    console.log('Checking for new notifications...');
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Helper functions for offline storage (using IndexedDB)
async function getOfflineActions() {
  // Implementation for getting stored offline actions
  return [];
}

async function removeOfflineAction(actionId) {
  // Implementation for removing stored offline action
  console.log('Removed offline action:', actionId);
}

// Message event for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_NOTIFICATION_COUNT':
      // Get notification count and send back to client
      getNotificationCount().then(count => {
        event.ports[0].postMessage({ type: 'NOTIFICATION_COUNT', count });
      });
      break;
      
    case 'CLEAR_NOTIFICATIONS':
      // Clear all notifications
      clearAllNotifications().then(() => {
        event.ports[0].postMessage({ type: 'NOTIFICATIONS_CLEARED' });
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Helper function to get notification count
async function getNotificationCount() {
  try {
    const notifications = await self.registration.getNotifications();
    return notifications.length;
  } catch (error) {
    console.error('Failed to get notification count:', error);
    return 0;
  }
}

// Helper function to clear all notifications
async function clearAllNotifications() {
  try {
    const notifications = await self.registration.getNotifications();
    notifications.forEach(notification => notification.close());
    console.log('All notifications cleared');
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
}

console.log('Service Worker: Loaded successfully');
