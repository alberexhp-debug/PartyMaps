'use client'
import { useEffect, useState } from 'react'
import type { StartggDatos } from '@/lib/torneos/startgg'
import { ExternalLink, RefreshCw, Trophy } from 'lucide-react'

// Espejo en vivo de start.gg en la ficha del torneo: mientras el TO lleve su
// bracket allí, aquí se ven inscritos, estado y top 8 sin salir de Tourneum
// (y su sistema de puntos se conserva intacto). Solo lectura vía /api/startgg.
export function StartggLive({ slug }: { slug: string }) {
  const [datos, setDatos] = useState<StartggDatos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    const carga = () => {
      fetch(`/api/startgg?slug=${encodeURIComponent(slug)}`)
        .then(async r => {
          if (!vivo) return
          if (r.ok) { setDatos(await r.json()); setError(null) }
          else setError((await r.json().catch(() => null))?.error ?? 'error')
        })
        .catch(() => vivo && setError('red'))
        .finally(() => vivo && setCargando(false))
    }
    carga()
    const t = setInterval(carga, 120000) // refresco cada 2 min
    return () => { vivo = false; clearInterval(t) }
  }, [slug])

  const ESTADO = {
    'inscripciones': ['Inscripciones abiertas', '#4F8EF7'],
    'en-juego': ['En juego', '#B6FF3A'],
    'finalizado': ['Finalizado', '#E0BE63'],
  } as const

  return (
    <div className="mt-5">
      <p className="eyebrow eyebrow-muted mb-2">Bracket oficial · start.gg</p>
      <div className="card-premium p-4">
        {cargando ? (
          <div className="flex items-center gap-2.5 text-sm text-[#8B8BA8]">
            <RefreshCw size={14} className="animate-spin" /> Leyendo datos de start.gg…
          </div>
        ) : error === 'sin-token' ? (
          <div className="text-sm text-[#B8B8CC]">
            <p className="font-bold text-white mb-1">Falta conectar start.gg</p>
            <p className="text-[12px] text-[#8B8BA8]">Crea un token gratis en start.gg → Settings → Developer Settings y añádelo como <code className="text-[#B6FF3A]">STARTGG_TOKEN</code> en Vercel. El torneo vinculado se leerá solo.</p>
          </div>
        ) : error ? (
          <p className="text-sm text-[#8B8BA8]">{error === 'no-encontrado' ? 'Ese torneo no existe en start.gg — revisa el enlace.' : 'start.gg no responde ahora mismo; se reintenta solo.'}</p>
        ) : datos && (
          <>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#3870E0]/15 text-[#6E9BFF] font-black text-lg shrink-0">sgg</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{datos.nombre}{datos.evento ? ` · ${datos.evento.nombre}` : ''}</p>
                <p className="text-[11px] text-[#8B8BA8] font-mono-num">{datos.evento?.entrants ?? datos.asistentes} jugadores{datos.demo ? ' · datos de muestra' : ''}</p>
              </div>
              {datos.evento && (
                <span className="px-2 h-6 inline-flex items-center rounded-full text-[10px] font-bold shrink-0"
                  style={{ color: ESTADO[datos.evento.estado][1], background: `${ESTADO[datos.evento.estado][1]}1A`, border: `1px solid ${ESTADO[datos.evento.estado][1]}55` }}>
                  {ESTADO[datos.evento.estado][0]}
                </span>
              )}
            </div>

            {datos.top8.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {datos.top8.map((p, i) => (
                  <div key={`${p.puesto}-${p.nombre}-${i}`} className="flex items-center gap-2 rounded-lg bg-white/4 px-2.5 py-1.5">
                    <span className={`w-6 text-center text-[11px] font-black font-mono-num ${p.puesto === 1 ? 'text-[#E0BE63]' : 'text-[#8B8BA8]'}`}>{p.puesto}º</span>
                    <span className="text-[12px] font-bold text-white truncate">{p.puesto === 1 ? '🏆 ' : ''}{p.nombre}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] text-[#8B8BA8] inline-flex items-center gap-1"><RefreshCw size={9} /> Se sincroniza cada 2 min · los puntos de start.gg no se tocan</p>
              {!datos.demo && (
                <a href={datos.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6E9BFF] hover:text-white transition-colors">
                  Ver en start.gg <ExternalLink size={11} />
                </a>
              )}
            </div>
          </>
        )}
        {!cargando && !error && !datos?.top8.length && !datos?.evento && (
          <p className="mt-2 text-[11px] text-[#8B8BA8] inline-flex items-center gap-1"><Trophy size={11} /> Aún sin standings — aparecerán al avanzar el bracket.</p>
        )}
      </div>
    </div>
  )
}
