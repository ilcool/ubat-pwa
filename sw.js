const CACHE_NAME = 'ubat-pwa-v3';

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// ===============================
// INSTALL
// ===============================
self.addEventListener("install", event => {
  console.log("[PWA] Installing:", CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ===============================
// ACTIVATE
// ===============================
self.addEventListener("activate", event => {
  console.log("[PWA] Activated:", CACHE_NAME);

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith("ubat-pwa-") && name !== CACHE_NAME)
          .map(name => {
            console.log("[PWA] Delete old cache:", name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ===============================
// FETCH
// ===============================
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {

        // Guna cache dahulu jika tersedia
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tiada cache, cuba internet
        return fetch(event.request)
          .then(networkResponse => {

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

            // Jika offline, kembali ke index
            return caches.match("./index.html");
          });
      })
  );
});

// ===============================
// PUSH NOTIFICATION
// ===============================
self.addEventListener("push", event => {

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: "Peringatan Ubat",
      body: "Masa untuk mengambil ubat anda."
    };
  }

  const title = data.title || "💊 Peringatan Ubat";

  const options = {
    body: data.body || "Masa untuk mengambil ubat anda.",
    icon: data.icon || "./icon-512.png",
    badge: data.badge || "./icon-512.png",
    vibrate: [200, 100, 200, 100, 300],
    tag: data.tag || "medicine-reminder",
    renotify: true,
    requireInteraction: true,
    data: {
      url: "./"
    },
    actions: [
      {
        action: "open",
        title: "Buka Aplikasi"
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ===============================
// NOTIFICATION CLICK
// ===============================
self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clientList => {

      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("./");
      }

    })
  );
});

// ===============================
// MESSAGE
// ===============================
self.addEventListener("message", event => {

  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "GET_VERSION") {
    event.source.postMessage({
      type: "VERSION",
      version: CACHE_NAME
    });
  }
});
