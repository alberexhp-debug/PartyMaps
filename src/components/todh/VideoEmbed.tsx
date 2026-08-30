'use client'
import { useEffect, useState } from 'react'
import { parseVideoUrl, tiempoTwitch } from '@/lib/torneos/video'

// Reproductor incrustado del vídeo/directo del torneo (YouTube o Twitch) a partir
// de la URL que pegó el TO al crear/editar el evento. Twitch exige el hostname en
// `parent`, así que el iframe se monta en cliente.
// `tSeg` (VODs N1): arranca el vídeo en ese segundo — YouTube con `start=`,
// Twitch VOD con `time=`; el canal de Twitch (directo) no admite salto y lo
// ignora. Para cambiar de salto con el player ya montado, re-monta con `key`.
export function VideoEmbed({ url, titulo = 'Emisión del torneo', className = '', tSeg }: { url: string; titulo?: string; className?: string; tSeg?: number }) {
  const [host, setHost] = useState<string | null>(null)
  useEffect(() => { setHost(window.location.hostname) }, [])

  const info = parseVideoUrl(url)
  if (!info) return null

  const seg = tSeg != null && tSeg > 0 ? Math.floor(tSeg) : null
  let src: string | null = null
  if (info.tipo === 'youtube') src = `https://www.youtube-nocookie.com/embed/${info.id}?rel=0${seg ? `&start=${seg}` : ''}`
  else if (host) {
    src = info.tipo === 'twitch-video'
      ? `https://player.twitch.tv/?video=${info.id}&parent=${host}&autoplay=false${seg ? `&time=${tiempoTwitch(seg)}` : ''}`
      : `https://player.twitch.tv/?channel=${info.canal}&parent=${host}&autoplay=false`
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-black ${className}`}>
      {src && (
        <iframe
          src={src}
          title={titulo}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
    </div>
  )
}
