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
