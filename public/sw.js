const CACHE_NAME = 'gym-tracker-v1';

// 1. When the app is installed, cache the core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon.png'
      ]);
    })
  );
});

// 2. The "Doorman" Logic: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // We have internet! Save a fresh copy of the files for later.
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // No internet! Fetch from the cache.
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse;
        });
      })
  );
});
