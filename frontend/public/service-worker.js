// Service Worker para notificações push
// Roda em uma thread separada da UI, não tem acesso ao DOM

console.log('Service Worker carregado');

const CACHE_NAME = 'tcc-cache-v1';
const API_CACHE = 'tcc-api-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/ifsul-logo.png',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', function(event) {
  console.log('Service Worker: Instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker: Ativado');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => { if (k !== CACHE_NAME && k !== API_CACHE) return caches.delete(k); }))
      await self.clients.claim();
    })()
  );
});

// Helper: network-first for API requests (cache fallback)
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    // Only cache successful JSON responses
    if (response && response.status === 200) {
      try { await cache.put(request, response.clone()); } catch (e) { /* ignore caching errors */ }
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', function(event) {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // API: events - network first, cache fallback
  if (url.pathname.startsWith('/api/events') || url.pathname.includes('/api/events')) {
    event.respondWith(
      networkFirst(req).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Navigation requests (HTML pages) - try network, fallback to cache or offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          try { await cache.put('/index.html', response.clone()); } catch (e) {}
          return response;
        } catch (err) {
          return (await caches.match('/index.html')) || (await caches.match('/offline.html'));
        }
      })()
    );
    return;
  }

  // For other requests (static assets) use cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(async res => {
        // Cache the fetched asset for future offline use (avoid caching cross-origin opaque responses)
        try {
          const contentType = res.headers.get('content-type') || '';
          // Only cache JS/CSS/HTML/JSON/images/fonts
          if (!res || res.type === 'opaque') return res;
          if (contentType.includes('javascript') || contentType.includes('css') || contentType.includes('text/html') || contentType.includes('application/json') || contentType.includes('image') || contentType.includes('font')) {
            const cache = await caches.open(CACHE_NAME);
            try { await cache.put(req, res.clone()); } catch (e) { /* ignore */ }
          }
        } catch (err) {
          // ignore caching errors
        }
        return res;
      }).catch(() => caches.match('/offline.html'));
    })
  );
});

// Push notifications: ignore health-check payloads and show others
self.addEventListener('push', function(event) {
  console.log('Push notification recebida:', event);
  event.waitUntil((async () => {
    let data = { title: 'Notificação', body: 'Você recebeu uma nova notificação' };
    if (event.data) {
      try {
        data = event.data.json();
      } catch (e) {
        try {
          const text = await event.data.text();
          // If backend sent a raw 'health-check' string, ignore it
          if (text === 'health-check') return;
          data.body = text;
        } catch (err) {
          console.log('Erro ao parsear dados da notificação:', err);
        }
      }
    }

    if (data && (data.type === 'health-check' || data.title === 'health-check' || data.body === 'health-check')) {
      // silently ignore
      return;
    }

    const options = {
      body: data.body,
      icon: '/ifsul-logo.png',
      badge: '/ifsul-logo.png',
      data: data,
      requireInteraction: false,
      silent: false
    };

    return self.registration.showNotification(data.title, options);
  })());
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notificação clicada:', event);
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
  