'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getTorneo, JUEGOS, rankingPorJuego, type Jugador } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import {
  ArrowLeft, Search, Check, Users, ListTree, Radio, Lock, UserCheck,
  Trophy, Settings2, Share2, Zap, CircleDot,
} from 'lucide-react'

// Panel de gestión del TO para un torneo (demo, sin login). Flujo real:
// inscritos → check-in → generar bracket → modo directo. Datos de muestra.
export default function GestionarTorneoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const t = getTorneo(id) || creado

  const [tab, setTab] = useState<'inscritos' | 'bracket'>('inscritos')
  const [q, setQ] = useState('')
  const [checkin, setCheckin] = useState<Set<string>>(new Set())
  const [cerrado, setCerrado] = useState(false)
  const [generado, setGenerado] = useState(false)
  const [sel, setSel] = useState<Jugador | null>(null)

  const inscritos = useMemo(() => {
    if (!t) return [] as Jugador[]
    const n = Math.min(t.inscritos || 16, t.plazas, 16)
    return rankingPorJuego(t.juego).slice(0, n)
  }, [t])

  if (!t) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Trophy size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">Torneo no encontrado</p>
        <Link href="/consola" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">Volver a la consola</Link>
      </div>
    )
  }

  const juego = JUEGOS[t.juego]
  const filtrados = inscritos.filter(p => p.nombre.toLowerCase().includes(q.trim().toLowerCase()))
  const nCheck = checkin.size
  const seedOf = (pid: string) => inscritos.findIndex(p => p.id === pid) + 1
  const toggle = (pid: string) => setCheckin(s => { const n = new Set(s); n.has(pid) ? n.delete(pid) : n.add(pid); return n })
  const checkAll = () => setCheckin(new Set(inscritos.map(p => p.id)))
  const seeded = [...inscritos].filter(p => checkin.has(p.id))

  return (
    <div className="relative min-h-screen pb-28 lg:pb-12 max-w-xl lg:max-w-5xl mx-auto">
      {/* Cabecera */}
      <div className="relative h-32 lg:h-40 overflow-hidden lg:rounded-b-3xl">
        <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.2) 28%, #0C0E13)' }} />
        <div className="relative flex items-center gap-3 px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#B6FF3A] font-bold">Consola del TO · Demo</p>
        </div>
        <div className="absolute bottom-3 left-5 right-5">
          <h1 className="text-xl lg:text-2xl font-bold text-white text-display tracking-tight leading-tight truncate">{t.nombre}</h1>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full font-bold" style={{ background: `${juego.color}26`, color: juego.color, border: `1px solid ${juego.color}55` }}>{juego.corto}</span>
            <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-full font-bold ${cerrado ? 'bg-[#FF8A5C]/15 text-[#FF8A5C]' : 'bg-[#B6FF3A]/15 text-[#B6FF3A]'}`}>{cerrado ? 'Inscripción cerrada' : 'Inscripción abierta'}</span>
            {t.enDirecto && <span className="badge-live">Live</span>}
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        {/* KPIs */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Kpi icon={<Users size={15} className="text-[#9B82FF]" />} value={`${inscritos.length}/${t.plazas}`} label="Inscritos" />
          <Kpi icon={<UserCheck size={15} className="text-[#B6FF3A]" />} value={`${nCheck}`} label="Con check-in" />
          <Kpi icon={<Trophy size={15} className="text-[#E0BE63]" />} value={t.bote ? `${t.bote}€` : '—'} label="Bote" />
          <Kpi icon={<CircleDot size={15} className="text-[#4F8EF7]" />} value={t.formato.split(' ')[0]} label="Formato" />
        </div>

        {/* Acciones rápidas */}
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button onClick={() => setCerrado(c => !c)} className="h-11 rounded-xl bg-white/6 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
            <Lock size={15} /> {cerrado ? 'Reabrir' : 'Cerrar inscripción'}
          </button>
          <button onClick={() => { setGenerado(true); setTab('bracket') }} disabled={nCheck < 2}
            className="h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            <Zap size={15} /> Generar bracket
          </button>
          <Link href="/modo-directo" className="h-11 rounded-xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/40 text-[#B9A6FF] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#7C5CFF]/25 transition-colors">
            <Radio size={15} /> Modo directo
          </Link>
          <Link href={`/torneo/${t.id}`} className="h-11 rounded-xl bg-white/6 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
            <Share2 size={15} /> Ficha pública
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1 glass-subtle rounded-2xl p-1 sm:max-w-xs">
          {(['inscritos', 'bracket'] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === tb ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#A0A0B8] hover:text-white'}`}>
              {tb === 'inscritos' ? `Inscritos · ${inscritos.length}` : 'Bracket'}
            </button>
          ))}
        </div>

        {/* Inscritos */}
        {tab === 'inscritos' && (
          <div className="mt-4">
            <div className="flex items-center gap-2.5">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar jugador…"
                  className="w-full h-11 pl-9 pr-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
              </div>
              <button onClick={checkAll} className="h-11 px-3.5 rounded-xl bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 text-[#B6FF3A] text-sm font-bold whitespace-nowrap flex items-center gap-1.5">
                <UserCheck size={15} /> Check-in masivo
              </button>
            </div>
            <p className="mt-2.5 text-[11px] text-[#8B8BA8]"><span className="font-mono-num text-[#B6FF3A]">{nCheck}</span> de <span className="font-mono-num">{inscritos.length}</span> con check-in · seeding por ranking</p>

            <div className="mt-2 space-y-1.5">
              {filtrados.map(p => {
                const ok = checkin.has(p.id)
                return (
                  <div key={p.id} className="flex items-center gap-3 card-premium p-2.5">
                    <span className="w-7 text-center text-xs font-bold text-[#8B8BA8] font-mono-num">#{seedOf(p.id)}</span>
                    <button onClick={() => setSel(p)} className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#0A0A0F] font-black shrink-0" style={{ background: juego.color }}>{p.nombre[0]}</button>
                    <button onClick={() => setSel(p)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-white truncate">{p.nombre} <span className="text-xs">{p.bandera}</span></p>
                      <p className="text-[11px] text-[#8B8BA8] font-mono-num">{p.rating} · {p.tier}{p.main ? ` · ${p.main}` : ''}</p>
                    </button>
                    <button onClick={() => toggle(p.id)} aria-label={ok ? 'Quitar check-in' : 'Hacer check-in'}
                      className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${ok ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'bg-white/8 text-[#B8B8CC] hover:bg-white/12'}`}>
                      <Check size={14} /> {ok ? 'Check-in' : 'Pendiente'}
                    </button>
                  </div>
                )
              })}
              {filtrados.length === 0 && <p className="text-center text-sm text-[#8B8BA8] py-8">Sin jugadores con ese nombre.</p>}
            </div>
          </div>
        )}

        {/* Bracket */}
        {tab === 'bracket' && (
          <div className="mt-4">
            {!generado ? (
              <div className="card-premium p-6 flex flex-col items-center text-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#B6FF3A]/12 text-[#B6FF3A]"><ListTree size={26} /></span>
                <p className="text-white font-bold">Aún no has generado el bracket</p>
                <p className="text-sm text-[#A0A0B8] max-w-xs">Haz check-in a los jugadores y pulsa <span className="text-[#B6FF3A] font-semibold">Generar bracket</span>. Se siembra por ranking ({nCheck} listos).</p>
                <button onClick={() => setGenerado(true)} disabled={nCheck < 2}
                  className="mt-1 h-11 px-5 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold flex items-center gap-2 disabled:opacity-40">
                  <Zap size={15} /> Generar bracket
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 rounded-2xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.08] p-3.5 mb-3">
                  <Check size={18} className="text-[#B6FF3A]" />
                  <p className="text-sm text-white font-semibold flex-1">Bracket generado con {seeded.length} jugadores sembrados por ranking.</p>
                </div>
                <p className="eyebrow eyebrow-muted mb-2">Seeding</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {seeded.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 card-premium p-2.5">
                      <span className="w-6 text-center text-xs font-black text-[#B6FF3A] font-mono-num">{i + 1}</span>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#0A0A0F] font-black text-sm" style={{ background: juego.color }}>{p.nombre[0]}</span>
                      <p className="text-sm font-bold text-white truncate flex-1">{p.nombre} <span className="text-xs">{p.bandera}</span></p>
                      <span className="text-[11px] text-[#8B8BA8] font-mono-num">{p.rating}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <Link href={`/torneo/${t.id}/bracket`} className="h-12 rounded-xl bg-white/8 border border-white/10 text-white text-sm font-bold flex items-center justify-center gap-2"><ListTree size={16} /> Ver bracket</Link>
                  <Link href="/modo-directo" className="h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold flex items-center justify-center gap-2"><Radio size={16} /> Iniciar directo</Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA fija móvil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-5 pt-3 safe-bottom bg-gradient-to-t from-[#0C0E13] via-[#0C0E13] to-transparent">
        <button onClick={() => { setGenerado(true); setTab('bracket') }} disabled={nCheck < 2}
          className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold flex items-center justify-center gap-2 disabled:opacity-40">
          <Zap size={17} /> Generar bracket · {nCheck} con check-in
        </button>
      </div>

      {sel && <MiniPerfil jugador={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function Kpi({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card-premium p-3">
      <div className="mb-1">{icon}</div>
      <p className="text-lg font-bold text-white font-mono-num leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.1em] text-[#8B8BA8] font-semibold mt-1">{label}</p>
    </div>
  )
}
