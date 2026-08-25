/**
 * DefesAi Progressive Web App (PWA) Service Worker
 * Version: defesai-pwa-v1.0.0
 */

const CACHE_NAME = 'defesai-pwa-v1.0.0';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg',
];

// Install Event - Precache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache partially failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic caching and routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // 2. API calls - Network Only (do not cache dynamic legal queries or auth endpoints)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. HTML Navigation requests - Network First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 4. Static Assets (Fonts, CSS, JS, Images, SVGs) - Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff|woff2|ttf|eot|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Push Notification Listener (for legal deadline reminders, case status changes & marketing)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'DefesAi — Atualização de Recurso';
    const options = {
      body: data.body || 'O status do seu recurso de multa foi atualizado.',
      icon: '/icons/icon-192.svg',
      badge: '/favicon.svg',
      vibrate: [150, 80, 150, 80, 200],
      tag: data.tag || `defesai-case-${data.caseId || Date.now()}`,
      renotify: true,
      data: {
        url: data.url || (data.caseId ? `/cases/${data.caseId}` : '/'),
        caseId: data.caseId,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: 'view_case',
          title: '📄 Ver Recurso',
        },
        {
          action: 'close',
          title: 'Dispensar',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('DefesAi', {
        body: text,
        icon: '/icons/icon-192.svg',
        badge: '/favicon.svg',
      })
    );
  }
});

// Direct Message Listener (allows UI to request local SW notification dispatch)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, caseId, tag } = event.data;
    const options = {
      body: body || 'O status do seu recurso foi atualizado.',
      icon: '/icons/icon-192.svg',
      badge: '/favicon.svg',
      vibrate: [150, 80, 150],
      tag: tag || `defesai-status-${caseId || Date.now()}`,
      renotify: true,
      data: {
        url: url || (caseId ? `/cases/${caseId}` : '/'),
        caseId,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: 'view_case',
          title: '📄 Ver Recurso',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title || 'DefesAi Notificação', options));
  }
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus if an open tab is on the site
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || targetUrl === '/') {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
