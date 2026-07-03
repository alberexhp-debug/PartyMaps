'use client'
import { useEffect, useState } from 'react'
import { parseVideoUrl } from '@/lib/torneos/video'

// Reproductor incrustado del vídeo/directo del torneo (YouTube o Twitch) a partir
// de la URL que pegó el TO al crear/editar el evento. Twitch exige el hostname en
// `parent`, así que el iframe se monta en cliente.
export function VideoEmbed({ url, titulo = 'Emisión del torneo', className = '' }: { url: string; titulo?: string; className?: string }) {
  const [host, setHost] = useState<string | null>(null)
  useEffect(() => { setHost(window.location.hostname) }, [])

  const info = parseVideoUrl(url)
  if (!info) return null

  let src: string | null = null
  if (info.tipo === 'youtube') src = `https://www.youtube-nocookie.com/embed/${info.id}?rel=0`
  else if (host) {
    src = info.tipo === 'twitch-video'
      ? `https://player.twitch.tv/?video=${info.id}&parent=${host}&autoplay=false`
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
