// Virtuosa Service Worker v2.0.0
// Multi-strategy caching + Push Notifications + Offline Support
const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `virtuosa-${CACHE_VERSION}`;
const MAX_CACHE_ENTRIES = 150;
const API_BASE = new URL(self.location).searchParams.get('apiBase') || '';
console.log('[SW] Initialized with API_BASE:', API_BASE);


// ──────────────────────────────────────────
// PRECACHE: Core app shell (install-time)
// ──────────────────────────────────────────
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/config.js',
  '/js/pwa-register.js',
  '/js/header.js',
  '/js/mobile-header.js',
  '/js/router.js',
  '/js/url-helper.js',
  '/js/critical-css.js',
  '/favicon.svg',
  '/favicon-enhanced.svg',
  '/assets/images/icon-192x192.png',
  '/assets/images/icon-512x512.png',
  '/assets/images/apple-touch-icon-180x180.png'
];

// Patterns for routing strategies
const API_PATTERN = /\/api\//;
const STATIC_ASSET_PATTERN = /\.(css|js|svg|png|jpg|jpeg|webp|gif|woff2?|ttf|eot|ico)$/i;
const CDN_PATTERN = /^https:\/\/(cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)/;
const IMAGE_CDN_PATTERN = /^https:\/\/res\.cloudinary\.com/;
const HTML_PATTERN = /\.(html?)$/i;

// ──────────────────────────────────────────
// IndexedDB for cache metadata (LRU)
// ──────────────────────────────────────────
const DB_NAME = 'virtuosa-sw-db';
const DB_VERSION = 1;
const STORE_NAME = 'cache-metadata';

const cacheManager = {
  db: null,

  async initDB() {
    if (this.db) return this.db;
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

  async setTimestamp(requestUrl) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ url: requestUrl, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getTimestamp(requestUrl) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(requestUrl);
      req.onsuccess = () => resolve(req.result?.timestamp);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteTimestamp(requestUrl) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      tx.objectStore(STORE_NAME).delete(requestUrl);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async cleanupOldTimestamps() {
    if (!this.db) await this.initDB();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const index = tx.objectStore(STORE_NAME).index('timestamp');
      const cursor = index.openCursor(IDBKeyRange.upperBound(cutoff));
      let count = 0;
      cursor.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { c.delete(); count++; c.continue(); }
        else {
          if (count > 0) console.log(`[SW] Cleaned ${count} expired cache entries`);
          resolve();
        }
      };
      cursor.onerror = () => reject(cursor.error);
    });
  },

  async enforceCacheLimits(cache) {
    const keys = await cache.keys();
    if (keys.length <= MAX_CACHE_ENTRIES) return;

    console.log(`[SW] Cache at ${keys.length} entries, enforcing limit of ${MAX_CACHE_ENTRIES}`);
    const entries = [];
    for (const request of keys) {
      const ts = (await this.getTimestamp(request.url).catch(() => null)) || 0;
      entries.push({ request, timestamp: ts });
    }
    entries.sort((a, b) => a.timestamp - b.timestamp);

    let current = keys.length;
    for (const entry of entries) {
      if (current <= MAX_CACHE_ENTRIES) break;
      await cache.delete(entry.request);
      await this.deleteTimestamp(entry.request.url).catch(() => {});
      current--;
    }
    console.log(`[SW] Cache trimmed to ${current} entries`);
  },

  initPeriodicCleanup() {
    setInterval(() => {
      this.cleanupOldTimestamps().catch(() => {});
    }, 10 * 60 * 1000);
  }
};

// ──────────────────────────────────────────
// INSTALL: Precache app shell
// ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache each URL individually to be resilient to individual failures
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] Failed to precache ${url}:`, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW] Precaching complete');
      })
  );
});

// ──────────────────────────────────────────
// ACTIVATE: Clean old caches, take control
// ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter(n => n.startsWith('virtuosa-') && n !== CACHE_NAME)
          .map(n => {
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          })
      ))
      .then(() => self.clients.claim())
      .then(() => cacheManager.initDB())
      .then(() => {
        cacheManager.initPeriodicCleanup();
        console.log('[SW] Activation complete');
      })
  );
});

// ──────────────────────────────────────────
// FETCH: Multi-strategy routing
// ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (let mutations go straight to network)
  if (request.method !== 'GET') return;

  // Skip chrome-extension, devtools, etc.
  if (!url.protocol.startsWith('http')) return;

  // Strategy routing
  if (API_PATTERN.test(url.pathname)) {
    // API calls → Network-first with cache fallback
    event.respondWith(networkFirst(request));
  } else if (CDN_PATTERN.test(url.origin)) {
    // External CDN resources → Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
  } else if (IMAGE_CDN_PATTERN.test(url.origin)) {
    // Cloudinary images → Cache-first (images rarely change)
    event.respondWith(cacheFirst(request));
  } else if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    // Local static assets → Cache-first
    event.respondWith(cacheFirst(request));
  } else {
    // HTML pages and everything else → Network-first
    event.respondWith(networkFirst(request));
  }
});

// ──────────────────────────────────────────
// Caching Strategies
// ──────────────────────────────────────────

/**
 * Cache-First: Try cache, fall back to network.
 * Good for static assets that change infrequently.
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      cacheManager.setTimestamp(request.url).catch(() => {});
      cacheManager.enforceCacheLimits(cache).catch(() => {});
    }
    return response;
  } catch (err) {
    // If it was an image request, return a transparent 1px placeholder
    if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(request.url)) {
      return new Response('', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-First: Try network, fall back to cache.
 * Good for HTML pages and API responses.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      cache.put(request, response.clone());
      cacheManager.setTimestamp(request.url).catch(() => {});
      cacheManager.enforceCacheLimits(cache).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;

    // For navigation requests, show the offline fallback (index.html)
    if (request.mode === 'navigate' || request.destination === 'document') {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }

    return new Response('You are offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Stale-While-Revalidate: Serve cached immediately, update in background.
 * Good for CDN libraries and fonts that update infrequently.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        cacheManager.setTimestamp(request.url).catch(() => {});
      }
      return response;
    })
    .catch(() => cached || new Response('Offline', { status: 503 }));

  return cached || fetchPromise;
}

// ──────────────────────────────────────────
// PUSH NOTIFICATIONS
// ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Virtuosa Notification',
    body: 'You have a new notification',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/icon-96x96.png',
    tag: 'virtuosa-notification',
    requireInteraction: false,
    actions: []
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };

      if (payload.priority === 'high' || payload.priority === 'critical') {
        data.requireInteraction = true;
      }
      if (payload.actionUrl && payload.actionText) {
        data.actions = [
          { action: 'view', title: payload.actionText || 'View Details' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
      }
    } catch (err) {
      console.error('[SW] Error parsing push data:', err);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      actions: data.actions,
      data: {
        url: data.actionUrl || '/',
        notificationId: data.id,
        timestamp: Date.now()
      }
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) return client.focus();
        }
        return clients.openWindow ? clients.openWindow(url) : null;
      })
  );
});

// Notification close (analytics)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data;
  if (data?.notificationId) {
    const analyticsUrl = API_BASE ? `${API_BASE}/notifications/analytics/dismiss` : '/api/notifications/analytics/dismiss';
    fetch(analyticsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: data.notificationId,
        dismissedAt: new Date().toISOString()
      })
    }).catch(() => {});
  }
});

// ──────────────────────────────────────────
// BACKGROUND SYNC
// ──────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync-notifications') {
    event.waitUntil(checkForNewNotifications());
  }
});

async function syncNotifications() {
  try {
    const actions = await getOfflineActions();
    for (const action of actions) {
      try {
        await fetch(action.url, action.options);
        await removeOfflineAction(action.id);
      } catch (err) {
        console.error('[SW] Failed to sync action:', err);
      }
    }
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
  }
}

async function checkForNewNotifications() {
  console.log('[SW] Checking for new notifications...');
}

async function getOfflineActions() { return []; }
async function removeOfflineAction(id) { console.log('[SW] Removed offline action:', id); }

// ──────────────────────────────────────────
// MESSAGE HANDLER
// ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_NOTIFICATION_COUNT':
      self.registration.getNotifications().then(n => {
        event.ports[0]?.postMessage({ type: 'NOTIFICATION_COUNT', count: n.length });
      });
      break;

    case 'CLEAR_NOTIFICATIONS':
      self.registration.getNotifications().then(notifications => {
        notifications.forEach(n => n.close());
        event.ports[0]?.postMessage({ type: 'NOTIFICATIONS_CLEARED' });
      });
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

console.log('[SW] Virtuosa Service Worker v' + CACHE_VERSION + ' loaded');
