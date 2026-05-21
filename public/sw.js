const CACHE_NAME = 'partymaps-v1'
const STATIC_ASSETS = [
  '/',
  '/explorar',
  '/entradas',
  '/planes',
  '/suscritos',
  '/perfil',
]
const QR_CACHE_NAME = 'partymaps-qr-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== QR_CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Cache QR entries for offline wallet
  if (url.pathname.startsWith('/entradas/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(QR_CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request)
        const networkPromise = fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone())
          return response
        })
        return cached || networkPromise
      })
    )
    return
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })))
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'PartyMaps', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})
