const CACHE_NAME = "ubat-pwa-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install Service Worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — offline support
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            // Simpan fail yang berjaya dimuat turun
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }

            return networkResponse;
          })
          .catch(() => {
            // Jika offline dan halaman tiada dalam cache
            return caches.match("./index.html");
          });
      })
  );
});

// Terima arahan untuk update segera
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
