const CACHE_NAME = 'kmu-discipline-desk-v1';
const STATIC_CACHE = 'kmu-static-v1';
const API_CACHE = 'kmu-api-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/login',
    '/dashboard',
    '/students',
    '/cases',
    '/reports',
    '/admin',
    '/audit',
    '/evidence',
    '/settings',
    '/profile',
    '/help',
    '/security-dashboard',
    '/academic-dashboard',
    '/admin/users',
    '/offline.html'
];

// Critical assets to cache
const CRITICAL_ASSETS = [
    '/kmu_logo.svg',
    '/manifest.json',
    '/sw.js',
    '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/students',
    '/api/cases',
    '/api/evidence',
    '/api/users',

    '/api/settings',
    '/api/audit'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('Caching static files and critical assets');
            return cache.addAll([...STATIC_FILES, ...CRITICAL_ASSETS]);
        }).then(() => {
            console.log('All files cached successfully');
            return self.skipWaiting();
        }).catch((error) => {
            console.error('Failed to cache files:', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests for static files
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    // Handle static file requests
    event.respondWith(handleStaticRequest(request));
});

// Handle API requests with offline-first strategy
async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE);
    const url = new URL(request.url);

    try {
        // Try network first
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
        }

        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', request.url);

        // Fallback to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline response for GET requests
        if (request.method === 'GET') {
            return new Response(JSON.stringify({
                error: 'Offline mode - no cached data available',
                offline: true
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // For non-GET requests, queue for later sync
        return new Response(JSON.stringify({
            error: 'Offline mode - request queued for sync',
            queued: true
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle static file requests
async function handleStaticRequest(request) {
    const cache = await caches.open(STATIC_CACHE);

    try {
        // Try cache first for static files
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback to network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
        }

        return networkResponse;
    } catch (error) {
        console.log('Network failed for static request:', request.url);

        // Return offline page for navigation requests
        if (request.destination === 'document' || request.mode === 'navigate') {
            const offlineResponse = await cache.match('/offline.html');
            if (offlineResponse) {
                return offlineResponse;
            }
            // Fallback to root page
            return cache.match('/');
        }

        // For other static files, return a simple offline response
        return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
    const cache = await caches.open(STATIC_CACHE);

    try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Try network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
        }
        return networkResponse;
    } catch (error) {
        console.log('Navigation request failed:', request.url);

        // Return offline page
        const offlineResponse = await cache.match('/offline.html');
        if (offlineResponse) {
            return offlineResponse;
        }

        // Fallback to root page
        return cache.match('/');
    }
}

// Background sync for queued requests
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(syncQueuedRequests());
    }
});

// Sync queued requests when back online
async function syncQueuedRequests() {
    try {
        const db = await openDB();
        const queuedRequests = await db.getAll('queuedRequests');

        for (const queuedRequest of queuedRequests) {
            try {
                const response = await fetch(queuedRequest.url, queuedRequest.options);
                if (response.ok) {
                    await db.delete('queuedRequests', queuedRequest.id);
                }
            } catch (error) {
                console.error('Failed to sync request:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Open IndexedDB
async function openDB() {
    // Check if IndexedDB is available
    if (!self.indexedDB) {
        throw new Error('IndexedDB is not available in this environment');
    }

    return new Promise((resolve, reject) => {
        const request = self.indexedDB.open('KMUDisciplineDesk', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object stores
            if (!db.objectStoreNames.contains('students')) {
                db.createObjectStore('students', { keyPath: '_id' });
            }
            if (!db.objectStoreNames.contains('cases')) {
                db.createObjectStore('cases', { keyPath: '_id' });
            }
            if (!db.objectStoreNames.contains('evidence')) {
                db.createObjectStore('evidence', { keyPath: '_id' });
            }
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: '_id' });
            }

            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('queuedRequests')) {
                db.createObjectStore('queuedRequests', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}