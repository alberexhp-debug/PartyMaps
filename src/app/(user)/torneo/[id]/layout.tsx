import type { Metadata } from 'next'
import { getTorneo, JUEGOS } from '@/lib/torneos/sample'

// Metadata de servidor para compartir fichas de torneo (WhatsApp/Discord/X):
// título y descripción reales del evento en vez del genérico de la app.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const t = getTorneo(id)
  if (!t) return { title: 'Torneo — Torneum' }
  const juego = JUEGOS[t.juego]
  const title = `${t.nombre} — Torneum`
  const description = `${juego?.nombre ?? 'Torneo'} · ${t.fechaLabel} · ${t.online ? 'Online' : t.local} · ${t.inscritos}/${t.plazas} inscritos${t.bote ? ` · ${t.bote}€ en juego` : t.precio === 0 ? ' · Gratis' : ` · ${t.precio}€`}`
  return {
    title,
    description,
    openGraph: { title, description, ...(t.banner ? { images: [t.banner] } : {}) },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function TorneoLayout({ children }: { children: React.ReactNode }) {
  return children
}
