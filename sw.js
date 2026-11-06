const CACHE_NAME = 'hanja-kanji-learner-v3';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/hanzi-writer.min.js',
  './js/storage.js',
  './js/detail-modal.js',
  './js/tree-view.js',
  './js/test-mode.js',
  './js/app.js',
  './data/hanja.json',
  './data/kanji.json',
  './manifest.json',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install — pre-cache all critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache successful GET responses for future offline use
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback — return the cached index for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
