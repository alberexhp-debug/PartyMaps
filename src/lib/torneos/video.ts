// Parseo de URLs de vídeo/directo que pega el TO (YouTube y Twitch) a datos de
// embed. Devuelve null si la URL no se reconoce (el caller decide qué mostrar).

export type VideoEmbedInfo =
  | { tipo: 'youtube'; id: string }
  | { tipo: 'twitch-video'; id: string }
  | { tipo: 'twitch-canal'; canal: string }

export function parseVideoUrl(url?: string | null): VideoEmbedInfo | null {
  if (!url?.trim()) return null
  let u: URL
  try {
    u = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '')

  // YouTube: watch?v=, youtu.be/, /live/, /shorts/, /embed/
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    return id ? { tipo: 'youtube', id } : null
  }
  if (host.endsWith('youtube.com')) {
    const v = u.searchParams.get('v')
    if (v) return { tipo: 'youtube', id: v }
    const m = u.pathname.match(/^\/(live|shorts|embed)\/([\w-]{6,})/)
    if (m) return { tipo: 'youtube', id: m[2] }
    return null
  }

  // Twitch: twitch.tv/videos/123 (VOD) o twitch.tv/canal (directo)
  if (host.endsWith('twitch.tv')) {
    const vod = u.pathname.match(/^\/videos\/(\d+)/)
    if (vod) return { tipo: 'twitch-video', id: vod[1] }
    const canal = u.pathname.split('/')[1]
    return canal ? { tipo: 'twitch-canal', canal } : null
  }

  return null
}

// ── VODs N1: saltos de tiempo dentro de la emisión ──────────────────────────

// Fragmento de tiempo al estilo Twitch: 3725 → '1h2m5s' (siempre con horas,
// que es el formato que aceptan tanto el player como twitch.tv?t=).
export function tiempoTwitch(seg: number): string {
  const s = Math.max(0, Math.floor(seg))
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m${s % 60}s`
}

// Timecode legible para la fila del set: 1240 → '20:40', 5350 → '1:29:10'.
export function formatoTiempo(seg: number): string {
  const s = Math.max(0, Math.floor(seg))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

// URL pública del VOD saltando al segundo dado (para abrir en pestaña nueva).
// YouTube: watch?v=…&t=1240s · Twitch VOD: /videos/…?t=1h2m5s · el canal de
// Twitch no tiene VOD al que saltar y cualquier URL no reconocida se devuelve
// tal cual (defensivo: el enlace nunca rompe, como mucho no salta).
export function urlConTiempo(url: string, tSeg?: number): string {
  const info = parseVideoUrl(url)
  if (!info || tSeg == null) return url
  const s = Math.max(0, Math.floor(tSeg))
  if (info.tipo === 'youtube') return `https://www.youtube.com/watch?v=${info.id}&t=${s}s`
  if (info.tipo === 'twitch-video') return `https://www.twitch.tv/videos/${info.id}?t=${tiempoTwitch(s)}`
  return url
}
