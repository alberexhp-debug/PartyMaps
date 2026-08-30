/* Service worker de TORNEUM · v2 (mínimo a conciencia).
 *
 * Historia: el SW de Rumbo cacheaba el shell (cache-first) y tras el pivote
 * servía HTML viejo con chunks muertos → pantalla de carga infinita. Le siguió
 * un kill-switch que purgaba y se desregistraba.
 *
 * Este v2 existe SOLO para que la app sea instalable (añadir a inicio) y para
 * las push del futuro. NO tiene handler de fetch: cero caché, todo va a red.
 * Si algún día se añade caché, que sea con versionado y expiración explícitos.
 */
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Higiene: fuera cualquier caché heredada de versiones anteriores
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})
