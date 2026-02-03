// Service Worker for Småbruk Kunnskapsbase v4.3
const CACHE_NAME = 'smabruk-v4.3';
const ASSETS = [
    './',
    './index.html',
    './style.css?v=4.3',
    './app.js?v=4.3',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg'
];

// Install - Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

// Fetch - Network first for API/Firestore, cache for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Let network-only for Firestore, Google APIs, etc.
    if (url.hostname.includes('firestore') || 
        url.hostname.includes('googleapis') ||
        url.hostname.includes('google.com') ||
        url.hostname.includes('gstatic.com')) {
        // Don't intercept - let browser handle it
        return;
    }
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response and update cache in background
                    event.waitUntil(
                        fetch(event.request)
                            .then((response) => {
                                if (response && response.status === 200 && response.type === 'basic') {
                                    const responseClone = response.clone();
                                    caches.open(CACHE_NAME)
                                        .then((cache) => {
                                            cache.put(event.request, responseClone);
                                        });
                                }
                            })
                            .catch(() => {})
                    );
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Only cache same-origin and successful responses
                        if (response && response.status === 200 && response.type === 'basic') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Message handler for client communication
self.addEventListener('message', (event) => {
    // Handle messages from clients without blocking
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
