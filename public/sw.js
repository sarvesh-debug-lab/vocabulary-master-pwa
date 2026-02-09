// public/sw.js
const CACHE_NAME = 'vocabulary-master-v1.2.1';
const DYNAMIC_CACHE_NAME = 'vocabulary-master-dynamic-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo-192.png',
  '/logo-512.png',
  '/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/words',
  '/api/study-sessions',
  '/api/analytics'
];

// Audio and media files patterns
const MEDIA_CACHE_PATTERNS = [
  /\.mp3$/,
  /\.wav$/,
  /\.ogg$/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Install completed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation completed');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[Service Worker] Activation failed:', error);
      })
  );
});

// Fetch event - network first with cache fallback strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests (network first, then cache)
  if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle media requests (cache first, then network)
  if (isMediaRequest(request)) {
    event.respondWith(handleMediaRequest(request));
    return;
  }
  
  // Handle static assets (cache first, then network)
  event.respondWith(handleStaticRequest(request));
});

// Check if request is an API request
function isApiRequest(request) {
  const url = new URL(request.url);
  return API_CACHE_PATTERNS.some(pattern => {
    if (typeof pattern === 'string') {
      return url.pathname.startsWith(pattern);
    }
    return pattern.test(url.pathname);
  });
}

// Check if request is a media request
function isMediaRequest(request) {
  const url = new URL(request.url);
  return MEDIA_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Handle API requests - Network First strategy
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Clone response to store in cache
    const responseClone = networkResponse.clone();
    
    // Cache successful responses (excluding errors)
    if (networkResponse.ok) {
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed for API, trying cache:', request.url);
    
    // Try cache if network fails
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API
    return new Response(
      JSON.stringify({ 
        error: 'Network error', 
        message: 'You are offline. Please check your connection.',
        offline: true 
      }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle media requests - Cache First strategy
async function handleMediaRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cache);
    return cachedResponse;
  }
  
  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for future use
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Failed to fetch media:', request.url);
    
    // Return placeholder for missing media
    return new Response(null, {
      status: 404,
      statusText: 'Media not available offline'
    });
  }
}

// Handle static asset requests - Cache First strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, try network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for future use
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Failed to fetch static asset:', request.url);
    
    // Return offline page for HTML requests
    if (request.headers.get('Accept')?.includes('text/html')) {
      return cache.match('/offline.html') || new Response('You are offline', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Return appropriate fallback based on content type
    const acceptHeader = request.headers.get('Accept') || '';
    
    if (acceptHeader.includes('image')) {
      // Return placeholder image
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f3f4f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#9ca3af">Image</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    if (acceptHeader.includes('css')) {
      // Return empty CSS
      return new Response('', { headers: { 'Content-Type': 'text/css' } });
    }
    
    if (acceptHeader.includes('javascript')) {
      // Return empty JS
      return new Response('', { headers: { 'Content-Type': 'application/javascript' } });
    }
    
    // Generic fallback
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Background fetch and cache
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (error) {
    console.log('[Service Worker] Background fetch failed:', error);
  }
}

// Periodic background sync for study data
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-study-data') {
    event.waitUntil(syncStudyData());
  }
});

// Sync study data in background
async function syncStudyData() {
  console.log('[Service Worker] Syncing study data...');
  
  // Check if there are pending study sessions to sync
  const pendingSessions = await getPendingSessions();
  
  if (pendingSessions.length > 0) {
    try {
      const response = await fetch('/api/study-sessions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessions: pendingSessions })
      });
      
      if (response.ok) {
        console.log('[Service Worker] Study data synced successfully');
        await clearPendingSessions();
        
        // Notify clients about successful sync
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              data: { syncedCount: pendingSessions.length }
            });
          });
        });
      }
    } catch (error) {
      console.error('[Service Worker] Sync failed:', error);
    }
  }
}

// Get pending study sessions from IndexedDB
async function getPendingSessions() {
  return new Promise((resolve) => {
    const request = indexedDB.open('VocabularyMasterDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingSessions'], 'readonly');
      const store = transaction.objectStore('pendingSessions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => {
        resolve([]);
      };
    };
    
    request.onerror = () => {
      resolve([]);
    };
  });
}

// Clear pending sessions after successful sync
async function clearPendingSessions() {
  return new Promise((resolve) => {
    const request = indexedDB.open('VocabularyMasterDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingSessions'], 'readwrite');
      const store = transaction.objectStore('pendingSessions');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        resolve();
      };
      
      clearRequest.onerror = () => {
        resolve();
      };
    };
    
    request.onerror = () => {
      resolve();
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Time to study your vocabulary!',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/study',
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'study',
        title: 'Start Studying',
        icon: '/icons/study-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Vocabulary Master', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'study') {
    // Open study page
    event.waitUntil(
      clients.openWindow('/study')
    );
  } else if (event.action === 'dismiss') {
    // Notification dismissed
    console.log('Notification dismissed');
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-vocabulary-data') {
    event.waitUntil(syncVocabularyData());
  }
});

// Sync vocabulary data
async function syncVocabularyData() {
  try {
    // Sync words
    await syncResource('/api/words/sync', 'words');
    
    // Sync study sessions
    await syncResource('/api/study-sessions/sync', 'studySessions');
    
    // Sync user preferences
    await syncResource('/api/settings/sync', 'settings');
    
    console.log('[Service Worker] All data synced successfully');
    
    // Notify clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'DATA_SYNC_COMPLETE'
        });
      });
    });
  } catch (error) {
    console.error('[Service Worker] Data sync failed:', error);
  }
}

// Generic sync function for resources
async function syncResource(endpoint, resourceType) {
  // Get pending changes from IndexedDB
  const pendingChanges = await getPendingChanges(resourceType);
  
  if (pendingChanges.length > 0) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: resourceType,
        changes: pendingChanges
      })
    });
    
    if (response.ok) {
      await clearPendingChanges(resourceType);
      console.log(`[Service Worker] ${resourceType} synced: ${pendingChanges.length} items`);
    } else {
      throw new Error(`Failed to sync ${resourceType}`);
    }
  }
}

// Get pending changes from IndexedDB
async function getPendingChanges(resourceType) {
  return new Promise((resolve) => {
    const request = indexedDB.open('VocabularyMasterDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingChanges'], 'readonly');
      const store = transaction.objectStore('pendingChanges');
      const index = store.index('resourceType');
      const getAllRequest = index.getAll(resourceType);
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => {
        resolve([]);
      };
    };
    
    request.onerror = () => {
      resolve([]);
    };
  });
}

// Clear pending changes
async function clearPendingChanges(resourceType) {
  return new Promise((resolve) => {
    const request = indexedDB.open('VocabularyMasterDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingChanges'], 'readwrite');
      const store = transaction.objectStore('pendingChanges');
      const index = store.index('resourceType');
      const getAllRequest = index.getAll(resourceType);
      
      getAllRequest.onsuccess = () => {
        const items = getAllRequest.result || [];
        items.forEach((item) => {
          store.delete(item.id);
        });
        resolve();
      };
      
      getAllRequest.onerror = () => {
        resolve();
      };
    };
    
    request.onerror = () => {
      resolve();
    };
  });
}

// Message handling from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
      break;
      
    case 'GET_CACHE_INFO':
      caches.keys().then((cacheNames) => {
        event.source.postMessage({
          type: 'CACHE_INFO',
          data: { cacheNames }
        });
      });
      break;
      
    case 'UPDATE_AVAILABLE':
      // Notify all clients about update
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'UPDATE_READY',
            data: { version: data.version }
          });
        });
      });
      break;
  }
});

// Cache cleanup on version update
async function cleanupOldCaches() {
  const currentCaches = [CACHE_NAME, DYNAMIC_CACHE_NAME];
  const cacheKeys = await caches.keys();
  
  const cachesToDelete = cacheKeys.filter(
    (key) => !currentCaches.includes(key)
  );
  
  await Promise.all(
    cachesToDelete.map((key) => caches.delete(key))
  );
  
  console.log('[Service Worker] Cleaned up old caches');
}

// Health check for service worker
self.addEventListener('healthcheck', () => {
  console.log('[Service Worker] Health check passed');
});

// Error reporting
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
  
  // Report error to analytics
  if (self.clients && self.clients.matchAll) {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'SERVICE_WORKER_ERROR',
          data: { error: event.error?.message || 'Unknown error' }
        });
      });
    });
  }
});

// Log service worker lifecycle
console.log('[Service Worker] Loaded successfully');
