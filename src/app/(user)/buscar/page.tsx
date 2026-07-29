'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ORGANIZADORES, LOCALES, JUEGOS, JUEGOS_LIST, rankingPorJuego, type Jugador,
} from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { useT } from '@/lib/i18n'
import { ArrowLeft, Search, Trophy, Store, MapPin, Star, Verified } from 'lucide-react'

const TODOS_JUGADORES: Jugador[] = JUEGOS_LIST.flatMap(j => rankingPorJuego(j.id))

const SUGERENCIAS = ['Smash', 'Lima Esports', 'Gamba', 'Major', 'Magic', 'Kaze']

export default function BuscarPage() {
  const { t: tr } = useT()
  const router = useRouter()
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const efectivos = useMemo(() => torneosEfectivos(creados, editados, cancelados), [creados, editados, cancelados])
  const [q, setQ] = useState('')
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const query = q.trim().toLowerCase()

  const res = useMemo(() => {
    if (!query) return null
    const torneos = efectivos.filter(t =>
      t.nombre.toLowerCase().includes(query) || JUEGOS[t.juego]?.nombre.toLowerCase().includes(query)).slice(0, 6)
    const orgs = Object.values(ORGANIZADORES).filter(o =>
      o.nombre.toLowerCase().includes(query) || o.handle.toLowerCase().includes(query)).slice(0, 4)
    const locales = Object.values(LOCALES).filter(l =>
      l.nombre.toLowerCase().includes(query) || l.zona.toLowerCase().includes(query)).slice(0, 4)
    const seen = new Set<string>()
    const jugadores = TODOS_JUGADORES.filter(p => {
      if (!p.nombre.toLowerCase().includes(query) && !p.handle.toLowerCase().includes(query)) return false
      if (seen.has(p.nombre)) return false; seen.add(p.nombre); return true
    }).slice(0, 6)
    return { torneos, orgs, locales, jugadores }
  }, [query, efectivos])

  const total = res ? res.torneos.length + res.orgs.length + res.locales.length + res.jugadores.length : 0

  return (
    <div className="relative min-h-screen pb-10">
      <div className="px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
      <div className="flex items-center gap-2 max-w-2xl lg:max-w-3xl mx-auto">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={tr('buscar.placeholder')}
            className="w-full h-11 pl-10 pr-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-[#8B8BA8] focus:border-[#B6FF3A]/60 focus:ring-2 focus:ring-[#B6FF3A]/20 outline-none transition-all" />
        </div>
      </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl lg:max-w-3xl mx-auto">
        {!query ? (
          <div>
            <p className="eyebrow eyebrow-muted mb-2.5">{tr('buscar.sugeridas')}</p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map(s => (
                <button key={s} onClick={() => setQ(s)} className="px-3 h-9 rounded-full bg-white/4 border border-white/10 text-sm text-[#B8B8CC] hover:text-white transition-colors">{s}</button>
              ))}
            </div>

            {/* Descubrimiento antes de escribir: tendencias y TOs top */}
            <p className="eyebrow eyebrow-muted mt-7 mb-2.5">{tr('buscar.tendencia')}</p>
            <div className="space-y-1.5">
              {[...efectivos].sort((a, b) => b.popularidad - a.popularidad).slice(0, 4).map((t, i) => (
                <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-3 card-premium card-int p-2.5 stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>
                  <span className="w-5 text-center text-sm font-black text-[#B6FF3A] font-mono-num">{i + 1}</span>
                  <GameKeyart juegoId={t.juego} label={false} className="w-11 h-11 rounded-xl shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                    <p className="text-[11px] text-[#8B8BA8]">{JUEGOS[t.juego]?.corto} · {t.fechaLabel} · <span className="font-mono-num">{t.inscritos}/{t.plazas}</span></p>
                  </div>
                  {t.enDirecto && <span className="badge-live shrink-0">Live</span>}
                </Link>
              ))}
            </div>

            <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('buscar.tos')}</p>
            <div className="space-y-1.5">
              {Object.values(ORGANIZADORES).filter(o => o.verificado).slice(0, 3).map((o, i) => (
                <Link key={o.id} href={`/organizador/${o.id}`} className="flex items-center gap-3 card-premium card-int p-2.5 stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[#0A0A0F] font-black shrink-0" style={{ background: o.color }}>{o.nombre[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate flex items-center gap-1">{o.nombre} <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#4F8EF7] text-white text-[8px] items-center justify-center">✓</span></p>
                    <p className="text-[11px] text-[#8B8BA8] flex items-center gap-1"><Star size={10} className="text-[#E0BE63]" /> {o.rating} · {o.torneosOrg} torneos</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <Search size={30} className="text-[#8B8BA8]" />
            <p className="text-white font-bold text-lg text-display">Sin resultados</p>
            <p className="text-sm text-[#A0A0B8]">No encontramos nada para «{q}».</p>
          </div>
        ) : (
          <div className="space-y-6">
            {res!.torneos.length > 0 && (
              <Grupo titulo="Torneos" icon={<Trophy size={14} />} count={res!.torneos.length}>
                {res!.torneos.map(t => (
                  <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-3 card-premium card-int p-2.5">
                    <GameKeyart juegoId={t.juego} label={false} className="w-12 h-12 rounded-xl shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{JUEGOS[t.juego]?.corto} · {t.fechaLabel}</p>
                    </div>
                  </Link>
                ))}
              </Grupo>
            )}
            {res!.orgs.length > 0 && (
              <Grupo titulo="Organizadores" icon={<Verified size={14} />} count={res!.orgs.length}>
                {res!.orgs.map(o => (
                  <Link key={o.id} href={`/organizador/${o.id}`} className="flex items-center gap-3 card-premium card-int p-2.5">
                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[#0A0A0F] font-black shrink-0" style={{ background: o.color }}>{o.nombre[0]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate flex items-center gap-1">{o.nombre} {o.verificado && <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#4F8EF7] text-white text-[8px] items-center justify-center">✓</span>}</p>
                      <p className="text-[11px] text-[#8B8BA8] flex items-center gap-1"><Star size={10} className="text-[#E0BE63]" /> {o.rating} · {o.torneosOrg} torneos</p>
                    </div>
                  </Link>
                ))}
              </Grupo>
            )}
            {res!.locales.length > 0 && (
              <Grupo titulo="Locales" icon={<Store size={14} />} count={res!.locales.length}>
                {res!.locales.map(l => (
                  <div key={l.id} className="flex items-center gap-3 card-premium p-2.5">
                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[#0A0A0F] font-black shrink-0" style={{ background: l.color }}>{l.nombre[0]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{l.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8] flex items-center gap-1"><MapPin size={10} /> {l.zona} · {l.setups} setups</p>
                    </div>
                  </div>
                ))}
              </Grupo>
            )}
            {res!.jugadores.length > 0 && (
              <Grupo titulo="Jugadores" icon={<Star size={14} />} count={res!.jugadores.length}>
                {res!.jugadores.map(p => (
                  <button key={p.id} onClick={() => setJugador(p)} className="w-full flex items-center gap-3 card-premium card-int p-2.5 text-left">
                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-full text-[#0A0A0F] font-black shrink-0" style={{ background: JUEGOS[p.juego]?.color }}>{p.nombre[0]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{p.nombre} {p.bandera}</p>
                      <p className="text-[11px] text-[#8B8BA8] font-mono-num">{JUEGOS[p.juego]?.corto} · {p.rating} · {p.tier}</p>
                    </div>
                  </button>
                ))}
              </Grupo>
            )}
          </div>
        )}
      </div>

      {jugador && <MiniPerfil jugador={jugador} onClose={() => setJugador(null)} />}
    </div>
  )
}

function Grupo({ titulo, icon, count, children }: { titulo: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5 text-[#8B8BA8]">
        {icon}
        <p className="eyebrow eyebrow-muted">{titulo}</p>
        <span className="text-[11px] font-mono-num text-[#6B6B85]">{count}</span>
      </div>
      <div className="space-y-2">
        {Array.isArray(children)
          ? children.map((c, i) => <div key={i} className="stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>{c}</div>)
          : children}
      </div>
    </div>
  )
}
