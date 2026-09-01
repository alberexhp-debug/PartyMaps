// ─────────────────────────────────────────────────────────────────────────────
// SALA de demo multi-dispositivo (01-09-2026). Un código opt-in que sincroniza
// el MUNDO de la demo ('todh-mundo') entre navegadores y dispositivos vía la
// tabla estado_mundo (filas 'sala:{codigo}', con policies para anon: las
// cuentas demo no tienen auth.uid()). Sin código, todo sigue como siempre —
// solo localStorage — y las suites no se ven afectadas.
// Conectar: campo en /login, o `?sala=codigo` en cualquier URL (`?sala=salir`
// desconecta). El código queda en localStorage y sobrevive a la sesión.
// ─────────────────────────────────────────────────────────────────────────────
const CLAVE_SALA = 'todh-sala'

export function normalizarSala(v: string | null | undefined): string | null {
  const c = (v ?? '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '').slice(0, 24)
  return c.length >= 3 ? c : null
}

export function salaActual(): string | null {
  if (typeof window === 'undefined') return null
  try { return normalizarSala(window.localStorage.getItem(CLAVE_SALA)) } catch { return null }
}

export function setSala(codigo: string | null) {
  if (typeof window === 'undefined') return
  try {
    const c = normalizarSala(codigo)
    if (c) window.localStorage.setItem(CLAVE_SALA, c)
    else window.localStorage.removeItem(CLAVE_SALA)
    // Aviso en la misma pestaña (la de otros tabs llega por el evento 'storage')
    window.dispatchEvent(new Event('todh-sala'))
  } catch { /* sin sitio: la demo sigue sin sala */ }
}

// Para useSyncExternalStore (regla del repo: nada de setState-en-efecto):
// se re-lee al cambiar la sala en esta pestaña ('todh-sala') o en otra ('storage').
export function suscribirSala(cb: () => void) {
  window.addEventListener('todh-sala', cb)
  window.addEventListener('storage', cb)
  return () => { window.removeEventListener('todh-sala', cb); window.removeEventListener('storage', cb) }
}

// `?sala=` en la URL conecta (o desconecta con 'salir') — pensado para abrir
// torneum.vercel.app?sala=micodigo directamente en el móvil o en incógnito.
export function capturarSalaDeURL() {
  if (typeof window === 'undefined') return
  const v = new URLSearchParams(window.location.search).get('sala')
  if (!v) return
  if (v === 'salir') setSala(null)
  else if (normalizarSala(v)) setSala(v)
}
