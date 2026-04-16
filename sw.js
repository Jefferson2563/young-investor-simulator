/* ===== SERVICE WORKER — Young Investor Simulator ===== */
var CACHE_NAME = 'yis-v1';
var ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/i18n.js',
    '/js/premium.js',
    '/js/firebase-config.js',
    '/assets/logo.svg',
    '/manifest.json'
];

// Install — cache core assets
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                     .map(function(n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', function(e) {
    e.respondWith(
        fetch(e.request).then(function(response) {
            // Cache successful GET responses
            if (e.request.method === 'GET' && response.status === 200) {
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(e.request, clone);
                });
            }
            return response;
        }).catch(function() {
            return caches.match(e.request);
        })
    );
});
