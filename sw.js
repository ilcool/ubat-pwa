const CACHE_NAME = 'ubat-pwa-v3';

const APP_FILES = [
    './',
    './index.html',
    './manifest.json',
    './sw.js'
];

// INSTALL
self.addEventListener('install', event => {
    console.log('[PWA] Service Worker V3 installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

// ACTIVATE
self.addEventListener('activate', event => {
    console.log('[PWA] Service Worker V3 activated');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// FETCH - OFFLINE SUPPORT
self.addEventListener('fetch', event => {

    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(networkResponse => {

                        if (
                            networkResponse &&
                            networkResponse.status === 200 &&
                            networkResponse.type === 'basic'
                        ) {
                            const responseClone = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }

                        return networkResponse;
                    })
                    .catch(() => {
                        return caches.match('./index.html');
                    });
            })
    );
});

// RECEIVE MESSAGE FROM INDEX.HTML
self.addEventListener('message', event => {

    if (!event.data) return;

    if (event.data.type === 'MEDICINE_NOTIFICATION') {

        const data = event.data;

        self.registration.showNotification(
            data.title || 'Peringatan Ubat',
            {
                body: data.body || 'Masa untuk mengambil ubat.',
                icon: './icon-192.png',
                badge: './icon-192.png',
                tag: data.tag || 'medicine-reminder',
                renotify: true,
                vibrate: [300, 150, 300, 150, 500],
                requireInteraction: true,
                data: {
                    url: './',
                    medicineId: data.medicineId || null
                },
                actions: [
                    {
                        action: 'taken',
                        title: '✓ Sudah Diambil'
                    },
                    {
                        action: 'open',
                        title: 'Buka Aplikasi'
                    }
                ]
            }
        );
    }
});

// NOTIFICATION CLICK
self.addEventListener('notificationclick', event => {

    event.notification.close();

    const notificationData = event.notification.data || {};
    const targetUrl = notificationData.url || './';

    event.waitUntil(

        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })

        .then(clientList => {

            for (const client of clientList) {

                if ('focus' in client) {

                    if (notificationData.medicineId) {

                        client.postMessage({
                            type: 'MEDICINE_NOTIFICATION_CLICK',
                            medicineId: notificationData.medicineId,
                            action: event.action
                        });

                    }

                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }

        })
    );
});
