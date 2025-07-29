const CACHE_NAME = 'kmu-desk-v1.0.0';
const STATIC_CACHE = 'kmu-static-v1.0.0';
const API_CACHE = 'kmu-api-v1.0.0';

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
    '/',
    '/login',
    '/kmu_logo.svg',
    '/manifest.json',
    '/static/css/globals.css',
];

// Static assets to cache
const STATIC_ASSETS = [
    '/_next/static/css/',
    '/_next/static/chunks/',
    '/_next/static/media/',
    '/_next/static/js/',
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/health',
    '/api/cases',
    '/api/students',
    '/api/reports',
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('Caching critical resources');
            return cache.addAll(CRITICAL_RESOURCES);
        })
        .then(() => {
            console.log('Service Worker installed');
            return self.skipWaiting();
        })
        .catch((error) => {
            console.error('Service Worker install failed:', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');

    event.waitUntil(
        caches.keys()
        .then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME &&
                        cacheName !== STATIC_CACHE &&
                        cacheName !== API_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static assets
    if (isStaticAsset(url.pathname)) {
        event.respondWith(handleStaticAsset(request));
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(request));
        return;
    }

    // Default: try network first, fallback to cache
    event.respondWith(
        fetch(request)
        .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => cache.put(request, responseClone));
            }
            return response;
        })
        .catch(() => {
            return caches.match(request);
        })
    );
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE);

    try {
        // Try network first
        const response = await fetch(request);

        // Cache successful responses
        if (response.status === 200) {
            const responseClone = response.clone();
            cache.put(request, responseClone);
        }

        return response;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline response for API calls
        return new Response(
            JSON.stringify({ error: 'Offline - No cached data available' }), {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
    const cache = await caches.open(STATIC_CACHE);

    // Check cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        // Try network
        const response = await fetch(request);

        // Cache successful responses
        if (response.status === 200) {
            const responseClone = response.clone();
            cache.put(request, responseClone);
        }

        return response;
    } catch (error) {
        // Return offline response
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Handle navigation requests with network-first strategy
async function handleNavigation(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // Try network first
        const response = await fetch(request);

        // Cache successful responses
        if (response.status === 200) {
            const responseClone = response.clone();
            cache.put(request, responseClone);
        }

        return response;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page
        return cache.match('/');
    }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
    return STATIC_ASSETS.some(asset => pathname.startsWith(asset)) ||
        pathname.includes('.css') ||
        pathname.includes('.js') ||
        pathname.includes('.png') ||
        pathname.includes('.jpg') ||
        pathname.includes('.jpeg') ||
        pathname.includes('.gif') ||
        pathname.includes('.svg') ||
        pathname.includes('.woff') ||
        pathname.includes('.woff2') ||
        pathname.includes('.ttf') ||
        pathname.includes('.eot');
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Sync any pending data
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                timestamp: Date.now()
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/kmu_logo.svg',
        badge: '/kmu_logo.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [{
                action: 'explore',
                title: 'View',
                icon: '/kmu_logo.svg'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/kmu_logo.svg'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('KMU Discipline Desk', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('Service Worker loaded');