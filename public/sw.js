/* Service worker — modo PIVOTE TODH.
 *
 * El SW anterior cacheaba el shell de Rumbo (cache-first sobre `/`), así que tras
 * el pivote el navegador seguía sirviendo el HTML viejo y pedía chunks JS de
 * hashes que ya no existen → la app no hidrataba y se quedaba en el splash
 * ("pantalla de carga infinita de Rumbo").
 *
 * Esto es un "kill-switch": purga TODA la caché y se desregistra. Cualquier
 * navegador que tuviera el SW viejo de Rumbo se auto-cura en cuanto fetcha este
 * fichero. No cachea nada (todo va a red). Reintroduciremos un SW/PWA propio de
 * TODH más adelante, cuando el MVP esté estable.
 */
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    await self.clients.claim()
    await self.registration.unregister()
  })())
})

/* Sin handler de 'fetch': el SW no intercepta nada; todo se sirve de red. */
