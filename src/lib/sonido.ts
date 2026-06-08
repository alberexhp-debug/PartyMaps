// Ping corto y sutil al recibir un mensaje. Sintetizado con Web Audio (sin assets,
// <0,3 s). Reglas (§1.7): solo si la pestaña está visible, respeta el toggle del
// usuario, y nunca suena más de una vez cada 5 s (anti-ametralladora).

let ultimo = 0
const CLAVE_TOGGLE = 'rumbo_sonido_mensajes'

export function sonidoMensajesActivo(): boolean {
  if (typeof window === 'undefined') return true
  try { return localStorage.getItem(CLAVE_TOGGLE) !== 'off' } catch { return true }
}

export function setSonidoMensajes(activo: boolean) {
  try { localStorage.setItem(CLAVE_TOGGLE, activo ? 'on' : 'off') } catch { /* almacenamiento no disponible */ }
}

export function sonidoMensaje() {
  try {
    if (typeof window === 'undefined') return
    if (document.visibilityState !== 'visible') return
    if (!sonidoMensajesActivo()) return
    const now = Date.now()
    if (now - ultimo < 5000) return       // anti-ametralladora
    ultimo = now

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.connect(g); g.connect(ctx.destination)
    const t = ctx.currentTime
    o.frequency.setValueAtTime(740, t)
    o.frequency.exponentialRampToValueAtTime(1180, t + 0.10)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02)   // sutil
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
    o.start(t); o.stop(t + 0.28)
    o.onended = () => ctx.close()
  } catch { /* el sonido es opcional: nunca rompe el flujo */ }
}
