// Service Worker for Vocabulary Master PWA
const CACHE_NAME = 'vocabulary-master-v1.0.0';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png'
];

// ==================== INSTALL EVENT ====================
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching core assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim();
    })
    .catch(error => {
      console.error('[Service Worker] Activation failed:', error);
    })
  );
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if available
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        console.log('[Service Worker] Fetching from network:', event.request.url);
        
        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache if not successful
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Cache the successful response
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Cached:', event.request.url);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', event.request.url, error);
            
            // For navigation requests, return the app shell
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // For other requests, return error response
            return new Response('Network error occurred', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// ==================== MESSAGE EVENT ====================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skipping waiting');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Clearing cache');
    caches.delete(CACHE_NAME);
  }
});

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || 'Vocabulary Master';
  const options = {
    body: data.body || 'Time to review your vocabulary!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'review',
        title: 'Start Review'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'review') {
    // Focus on existing window or open new one
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(windowClients => {
          // Check if there's already a window open
          for (const client of windowClients) {
            if (client.url.includes('/study') && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window if none exists
          if (clients.openWindow) {
            return clients.openWindow('/study?mode=flashcard');
          }
        })
    );
  }
});

// ==================== SYNC EVENT (Background Sync) ====================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-study-session') {
    console.log('[Service Worker] Background sync triggered');
    event.waitUntil(syncStudySessions());
  }
});

async function syncStudySessions() {
  try {
    // Get study sessions from IndexedDB (if you implement it later)
    const db = await openIndexedDB();
    const offlineSessions = await db.getAll('offlineSessions');
    
    for (const session of offlineSessions) {
      // Sync with server (if you add backend later)
      const response = await fetch('/api/sync-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      
      if (response.ok) {
        await db.delete('offlineSessions', session.id);
        console.log('[Service Worker] Synced session:', session.id);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Helper function for IndexedDB (for future use)
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    // You can implement this if you add IndexedDB later
    reject(new Error('IndexedDB not implemented'));
  });
}

// ==================== PERIODIC SYNC (Experimental) ====================
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'daily-reminder') {
      console.log('[Service Worker] Daily reminder sync');
      event.waitUntil(sendDailyReminder());
    }
  });
}

async function sendDailyReminder() {
  // Send push notification for daily review
  // Implement if you add push notifications
                      }
