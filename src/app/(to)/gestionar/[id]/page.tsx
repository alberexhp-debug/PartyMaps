'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { getTorneo, JUEGOS, rankingPorJuego, FORMATOS_SUGERIDOS, type Jugador } from '@/lib/torneos/sample'
import { construirRondas, nombreRonda, boDeRonda, paraGanar } from '@/lib/torneos/bracket'
import { useDemoStore, type BoDesde } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { PersonajeChip } from '@/components/todh/PersonajeChip'
import {
  ArrowLeft, Search, Check, Users, ListTree, Radio, Lock, UserCheck,
  Trophy, Share2, Zap, CircleDot, Ban, RotateCcw, Megaphone,
} from 'lucide-react'
import type { MatchB } from '@/lib/torneos/bracket'

// Panel de gestión del TO para un torneo (demo, sin login). Flujo real:
// inscritos → check-in → generar bracket → reportar resultados → editar/cancelar.
export default function GestionarTorneoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const override = useDemoStore(s => s.editados[id])
  const cancelado = useDemoStore(s => s.cancelados.includes(id))
  const editarTorneo = useDemoStore(s => s.editarTorneo)
  const cancelarTorneo = useDemoStore(s => s.cancelarTorneo)
  const pushNoti = useDemoStore(s => s.pushNoti)
  const gestion = useDemoStore(s => s.gestion[id])
  const setGestion = useDemoStore(s => s.setGestion)
  const base = getTorneo(id) || creado
  const t = base ? { ...base, ...(override || {}) } : undefined

  const [tab, setTab] = useState<'inscritos' | 'bracket' | 'ajustes'>('inscritos')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Jugador | null>(null)
  const [form, setForm] = useState<{ nombre: string; plazas: number; precio: number; formato: string; fechaLabel: string; videoUrl: string } | null>(null)
  const [guardado, setGuardado] = useState(false)

  // Estado de gestión persistido en el store demo: sobrevive a la navegación y
  // lo lee también /modo-directo (cola de combates real).
  const cerrado = gestion?.cerrado ?? false
  const generado = gestion?.generado ?? false
  const winners = useMemo(() => gestion?.winners ?? {}, [gestion?.winners])
  const puntos = useMemo(() => gestion?.puntos ?? {}, [gestion?.puntos])
  const bo = gestion?.bo ?? { base: 3, top: 5, desde: 'semis' as BoDesde }
  const checkin = useMemo(() => new Set(gestion?.checkin ?? []), [gestion?.checkin])

  const inscritos = useMemo(() => {
    if (!base) return [] as Jugador[]
    const n = Math.min((override?.inscritos ?? base.inscritos) || 16, (override?.plazas ?? base.plazas), 16)
    return rankingPorJuego(base.juego).slice(0, n)
  }, [base, override?.inscritos, override?.plazas])

  const bracketSeeds = useMemo(() => {
    if (!base) return [] as Jugador[]
    const pool = rankingPorJuego(base.juego)
    return (gestion?.seeds ?? []).map(sid => pool.find(p => p.id === sid)).filter(Boolean) as Jugador[]
  }, [base, gestion?.seeds])

  // Bracket de eliminación simple, calculado a partir de los sembrados congelados
  // y de los ganadores reportados. Los byes avanzan solos.
  const rondas = useMemo(() => construirRondas(bracketSeeds, winners), [bracketSeeds, winners])
  const finalMatch = rondas.length ? rondas[rondas.length - 1][0] : null
  const campeon = finalMatch?.ganador ? (finalMatch.ganador === 'a' ? finalMatch.a : finalMatch.b) : null

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
  const toggle = (pid: string) => setGestion(id, { checkin: checkin.has(pid) ? [...checkin].filter(x => x !== pid) : [...checkin, pid] })
  const checkAll = () => setGestion(id, { checkin: inscritos.map(p => p.id) })
  const seeded = [...inscritos].filter(p => checkin.has(p.id))
  // Avisos TO→jugador: en demo van a la bandeja local (/notificaciones); con
  // backend serán push/email a cada inscrito.
  const generar = () => {
    setGestion(id, { seeds: seeded.map(p => p.id), winners: {}, puntos: {}, generado: true })
    pushNoti({
      tipo: 'combate', titulo: 'Tu combate está listo',
      cuerpo: `Bracket de «${t!.nombre}» publicado (${seeded.length} jugadores). Consulta tu primer combate.`,
      href: `/torneo/${t!.id}/bracket`,
    })
  }
  // Reporte por sets: cada toque anota un juego ganado; al llegar a los juegos
  // necesarios del Bo de esa ronda, el set se cierra y el cuadro avanza.
  const anotarJuego = (matchId: string, lado: 'a' | 'b', boN: number) => {
    const p = puntos[matchId] ?? { a: 0, b: 0 }
    const np = { ...p, [lado]: p[lado] + 1 }
    if (np[lado] >= paraGanar(boN)) {
      setGestion(id, { puntos: { ...puntos, [matchId]: np }, winners: { ...winners, [matchId]: lado } })
      const final = rondas[rondas.length - 1]?.[0]
      if (final && final.id === matchId && final.a && final.b) {
        const ganador = lado === 'a' ? final.a : final.b
        pushNoti({
          tipo: 'sistema', titulo: '🏆 Tenemos campeón',
          cuerpo: `${ganador.nombre} gana «${t!.nombre}» (${np.a}-${np.b} la final). Resultados y ranking ya actualizados.`,
          href: `/torneo/${t!.id}/resultados`,
        })
      }
    } else {
      setGestion(id, { puntos: { ...puntos, [matchId]: np } })
    }
  }
  // Deshacer un set: limpia ese combate y todas las rondas posteriores (sus
  // participantes dependían de este resultado).
  const deshacer = (matchId: string, ri: number) => {
    const w = { ...winners }
    const p = { ...puntos }
    delete w[matchId]; delete p[matchId]
    const rondaDe = (k: string) => parseInt(k.match(/^r(\d+)m/)?.[1] ?? '0', 10)
    for (const k of Object.keys(w)) if (rondaDe(k) > ri) delete w[k]
    for (const k of Object.keys(p)) if (rondaDe(k) > ri) delete p[k]
    setGestion(id, { winners: w, puntos: p })
  }
  const f = form ?? { nombre: t.nombre, plazas: t.plazas, precio: t.precio, formato: t.formato as string, fechaLabel: t.fechaLabel, videoUrl: t.videoUrl ?? '' }
  const setF = (patch: Partial<typeof f>) => { setForm({ ...f, ...patch }); setGuardado(false) }
  const guardar = () => {
    editarTorneo(t.id, { nombre: f.nombre.trim() || t.nombre, plazas: f.plazas, precio: f.precio, formato: f.formato.trim() || t.formato, fechaLabel: f.fechaLabel, videoUrl: f.videoUrl.trim() || undefined })
    setGuardado(true)
    pushNoti({
      tipo: 'sistema', titulo: 'Torneo actualizado',
      cuerpo: `El TO ha actualizado «${f.nombre.trim() || t.nombre}» (${f.fechaLabel}). Revisa los detalles.`,
      href: `/torneo/${t.id}`,
    })
  }
  const cancelar = () => {
    if (typeof window !== 'undefined' && !window.confirm(`¿Cancelar "${t.nombre}"? Se reembolsará el 100% a los inscritos. No se puede deshacer.`)) return
    cancelarTorneo(t.id, t.nombre)
  }

  return (
    <div className="relative min-h-screen pb-28 lg:pb-12 max-w-xl lg:max-w-5xl mx-auto lg:mx-0">
      {/* Cabecera */}
      <div className="relative h-32 lg:h-40 overflow-hidden lg:rounded-b-3xl">
        <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.2) 28%, #0D0F15)' }} />
        <div className="relative flex items-center gap-3 px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#B6FF3A] font-bold">Consola del TO · Demo</p>
        </div>
        <div className="absolute bottom-3 left-5 right-5">
          <h1 className="text-xl lg:text-2xl font-bold text-white text-display tracking-tight leading-tight truncate">{t.nombre}</h1>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full font-bold" style={{ background: `${juego.color}26`, color: juego.color, border: `1px solid ${juego.color}55` }}>{juego.corto}</span>
            {cancelado
              ? <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full font-bold bg-[#FF6B6B]/15 text-[#FF8A8A] border border-[#FF6B6B]/40">Cancelado</span>
              : <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-full font-bold ${cerrado ? 'bg-[#FF8A5C]/15 text-[#FF8A5C]' : 'bg-[#B6FF3A]/15 text-[#B6FF3A]'}`}>{cerrado ? 'Inscripción cerrada' : 'Inscripción abierta'}</span>}
            {t.enDirecto && !cancelado && <span className="badge-live">Live</span>}
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        {cancelado && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-[#FF6B6B]/40 bg-[#FF6B6B]/[0.08] p-3.5">
            <Ban size={18} className="text-[#FF8A8A] shrink-0" />
            <p className="text-sm text-white font-semibold">Torneo cancelado · se ha reembolsado el 100% a los inscritos.</p>
          </div>
        )}
        {/* KPIs */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <Kpi icon={<Users size={15} className="text-[#9B82FF]" />} value={`${inscritos.length}/${t.plazas}`} label="Inscritos" />
          <Kpi icon={<UserCheck size={15} className="text-[#B6FF3A]" />} value={`${nCheck}`} label="Con check-in" />
          <Kpi icon={<Trophy size={15} className="text-[#E0BE63]" />} value={t.bote ? `${t.bote}€` : '—'} label="Bote" />
          <Kpi icon={<CircleDot size={15} className="text-[#4F8EF7]" />} value={t.formato.split(' ')[0]} label="Formato" />
        </div>

        {/* Acciones rápidas */}
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button onClick={() => setGestion(id, { cerrado: !cerrado })} disabled={cancelado} className="h-11 rounded-xl bg-white/6 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-40">
            <Lock size={15} /> {cerrado ? 'Reabrir' : 'Cerrar inscripción'}
          </button>
          <button onClick={() => { generar(); setTab('bracket') }} disabled={nCheck < 2 || cancelado}
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
        <div className="mt-5 flex gap-1 glass-subtle rounded-2xl p-1 sm:max-w-sm">
          {(['inscritos', 'bracket', 'ajustes'] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === tb ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#A0A0B8] hover:text-white'}`}>
              {tb === 'inscritos' ? `Inscritos · ${inscritos.length}` : tb === 'bracket' ? 'Bracket' : 'Ajustes'}
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
              {filtrados.map((p, i) => {
                const ok = checkin.has(p.id)
                return (
                  <div key={p.id} className="flex items-center gap-3 card-premium p-2.5 stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 12) * 35}ms` }}>
                    <span className="w-7 text-center text-xs font-bold text-[#8B8BA8] font-mono-num">#{seedOf(p.id)}</span>
                    <button onClick={() => setSel(p)} className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#0A0A0F] font-black shrink-0" style={{ background: juego.color }}>{p.nombre[0]}</button>
                    <button onClick={() => setSel(p)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-white truncate">{p.nombre} <span className="text-xs">{p.bandera}</span></p>
                      <p className="text-[11px] text-[#8B8BA8] font-mono-num flex items-center gap-1 whitespace-nowrap overflow-hidden">{p.rating} · {p.tier}{p.main ? <> · <PersonajeChip juegoId={p.juego} nombre={p.main} /></> : null}</p>
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
            {/* Config de sets (Bo por ronda): editable siempre, como en Smash o LoL */}
            <div className="card-premium p-3.5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold">Sets por ronda</p>
                <span className="text-[11px] font-mono-num text-[#B6FF3A]">Bo{bo.base} → Bo{bo.top} {bo.desde === 'final' ? 'en la final' : bo.desde === 'semis' ? 'desde semis' : 'desde top 8'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#8B8BA8] font-semibold">Inicio</span>
                  {[1, 3, 5].map(n => (
                    <button key={n} onClick={() => setGestion(id, { bo: { ...bo, base: n } })}
                      className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${bo.base === n ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>Bo{n}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#8B8BA8] font-semibold">Finales</span>
                  {[3, 5].map(n => (
                    <button key={n} onClick={() => setGestion(id, { bo: { ...bo, top: n } })}
                      className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${bo.top === n ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>Bo{n}</button>
                  ))}
                  <span className="text-[11px] text-[#8B8BA8] font-semibold ml-1">desde</span>
                  {([['top8', 'Top 8'], ['semis', 'Semis'], ['final', 'Final']] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setGestion(id, { bo: { ...bo, desde: k } })}
                      className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${bo.desde === k ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {!generado ? (
              <div className="card-premium p-6 flex flex-col items-center text-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#B6FF3A]/12 text-[#B6FF3A]"><ListTree size={26} /></span>
                <p className="text-white font-bold">Aún no has generado el bracket</p>
                <p className="text-sm text-[#A0A0B8] max-w-xs">Haz check-in a los jugadores y pulsa <span className="text-[#B6FF3A] font-semibold">Generar bracket</span>. Se siembra por ranking ({nCheck} listos).</p>
                <button onClick={generar} disabled={nCheck < 2}
                  className="mt-1 h-11 px-5 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold flex items-center gap-2 disabled:opacity-40">
                  <Zap size={15} /> Generar bracket
                </button>
              </div>
            ) : (
              <div>
                {campeon ? (
                  <Podio rondas={rondas} campeon={campeon} juegoColor={juego.color} onPublicar={() => {
                    pushNoti({
                      tipo: 'sistema', titulo: 'Resultados publicados',
                      cuerpo: `Clasificación final de «${t!.nombre}» disponible. ¡Gracias por competir!`,
                      href: `/torneo/${t!.id}/resultados`,
                    })
                  }} />
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.08] p-3.5 mb-4">
                    <ListTree size={18} className="text-[#B6FF3A]" />
                    <p className="text-sm text-white font-semibold flex-1">Toca un jugador para anotarle un juego. El set se cierra al llegar al Bo de la ronda.</p>
                    <button onClick={() => setGestion(id, { winners: {}, puntos: {} })} className="text-[11px] text-[#8B8BA8] font-semibold hover:text-white whitespace-nowrap">Reiniciar</button>
                  </div>
                )}

                <div className="space-y-5">
                  {rondas.map((matches, ri) => {
                    const boN = boDeRonda(ri, rondas.length, bo)
                    return (
                    <div key={ri}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="eyebrow eyebrow-muted flex items-center gap-2">{nombreRonda(matches.length)}
                          <span className="normal-case tracking-normal px-1.5 h-5 inline-flex items-center rounded-md bg-[#9B82FF]/15 text-[#B9A6FF] text-[10px] font-bold">Bo{boN}</span>
                        </p>
                        <span className="text-[11px] font-mono-num text-[#6B6B85]">{matches.filter(m => m.ganador).length}/{matches.length}</span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {matches.map(m => {
                          const reportable = !!m.a && !!m.b && !m.ganador
                          const pts = puntos[m.id] ?? { a: 0, b: 0 }
                          const conJuegos = pts.a > 0 || pts.b > 0
                          return (
                            <div key={m.id} className="card-premium p-2 space-y-1 relative">
                              {(['a', 'b'] as const).map(lado => {
                                const pl = m[lado]
                                const win = m.ganador === lado
                                return (
                                  <button key={lado} disabled={!pl || !!m.ganador || !m.a || !m.b}
                                    onClick={() => reportable && anotarJuego(m.id, lado, boN)}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${win ? 'bg-[#B6FF3A]/15 border border-[#B6FF3A]/40' : m.ganador ? 'opacity-45' : pl ? 'bg-white/4 enabled:hover:bg-white/8' : ''}`}>
                                    {pl ? (
                                      <>
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[#0A0A0F] font-black text-xs shrink-0" style={{ background: juego.color }}>{pl.nombre[0]}</span>
                                        <span className="text-sm font-bold text-white truncate flex-1 text-left">{pl.nombre} <span className="text-[10px]">{pl.bandera}</span></span>
                                        {win && <Check size={15} className="text-[#B6FF3A] shrink-0" />}
                                        {reportable && <span className="text-[10px] text-[#8B8BA8] font-semibold shrink-0">+1 juego</span>}
                                        <span className={`text-[17px] font-bold text-score shrink-0 w-5 text-right ${win ? 'text-[#B6FF3A]' : conJuegos || m.ganador ? 'text-white' : 'text-[#5A5A70]'}`}>
                                          {(m.a && m.b) || m.ganador ? pts[lado] : ''}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-[#6B6B85] pl-1">Por determinar</span>
                                    )}
                                  </button>
                                )
                              })}
                              {(m.ganador || conJuegos) && m.a && m.b && (
                                <button onClick={() => deshacer(m.id, ri)} aria-label="Deshacer set" title="Deshacer (borra también las rondas posteriores)"
                                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-[#1D2230] border border-white/15 text-[#8B8BA8] hover:text-white flex items-center justify-center">
                                  <RotateCcw size={11} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )})}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <Link href={`/torneo/${t.id}/bracket`} className="h-12 rounded-xl bg-white/8 border border-white/10 text-white text-sm font-bold flex items-center justify-center gap-2"><ListTree size={16} /> Ver bracket público</Link>
                  <Link href="/modo-directo" className="h-12 rounded-xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/40 text-[#B9A6FF] text-sm font-bold flex items-center justify-center gap-2"><Radio size={16} /> Modo directo</Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ajustes */}
        {tab === 'ajustes' && (
          <div className="mt-4 space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">Nombre del torneo</label>
                <input value={f.nombre} onChange={e => setF({ nombre: e.target.value })} disabled={cancelado}
                  className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">Fecha y hora</label>
                <input value={f.fechaLabel} onChange={e => setF({ fechaLabel: e.target.value })} disabled={cancelado} placeholder="Ej. Sáb 5 jul · 18:00"
                  className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none disabled:opacity-50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">Plazas</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setF({ plazas: Math.max(4, f.plazas - 4) })} disabled={cancelado} aria-label="Menos plazas" className="h-12 w-11 rounded-xl bg-white/8 text-white text-lg disabled:opacity-50">−</button>
                    <span className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold font-mono-num">{f.plazas}</span>
                    <button onClick={() => setF({ plazas: f.plazas + 4 })} disabled={cancelado} aria-label="Más plazas" className="h-12 w-11 rounded-xl bg-white/8 text-white text-lg disabled:opacity-50">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">Inscripción (€)</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setF({ precio: Math.max(0, f.precio - 1) })} disabled={cancelado} aria-label="Menos precio" className="h-12 w-11 rounded-xl bg-white/8 text-white text-lg disabled:opacity-50">−</button>
                    <span className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold font-mono-num">{f.precio === 0 ? 'Gratis' : `${f.precio}€`}</span>
                    <button onClick={() => setF({ precio: f.precio + 1 })} disabled={cancelado} aria-label="Más precio" className="h-12 w-11 rounded-xl bg-white/8 text-white text-lg disabled:opacity-50">+</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">Formato (texto libre)</label>
                <input value={f.formato} onChange={e => setF({ formato: e.target.value })} disabled={cancelado} placeholder="Ej. Suizo 6 rondas + top 8, Bo3"
                  className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none disabled:opacity-50" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {FORMATOS_SUGERIDOS.map(fmt => (
                    <button key={fmt} onClick={() => setF({ formato: fmt })} disabled={cancelado}
                      className={`px-3 h-9 rounded-full text-sm font-semibold border transition-all disabled:opacity-50 ${f.formato === fmt ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{fmt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">Vídeo o directo (YouTube/Twitch)</label>
                <input value={f.videoUrl} onChange={e => setF({ videoUrl: e.target.value })} disabled={cancelado} type="url" placeholder="https://youtube.com/watch?v=… o https://twitch.tv/tucanal"
                  className="w-full h-12 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none disabled:opacity-50" />
                <p className="mt-1.5 text-[11px] text-[#8B8BA8]">Se incrusta en la ficha pública y en la pantalla del directo.</p>
              </div>
              <button onClick={guardar} disabled={cancelado}
                className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                {guardado ? <><Check size={17} /> Guardado</> : 'Guardar cambios'}
              </button>
              {guardado && <p className="text-center text-[12px] text-[#8B8BA8]">Los cambios ya se ven en la ficha pública y en Explorar.</p>}
            </div>

            {/* Zona de peligro */}
            <div className="rounded-2xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/[0.05] p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] font-bold mb-1" style={{ color: '#FF8A8A' }}>Zona de peligro</p>
              <p className="text-sm text-[#A0A0B8] mb-3">Cancelar el torneo reembolsa el 100% a los inscritos y lo retira de Explorar. No se puede deshacer.</p>
              <button onClick={cancelar} disabled={cancelado}
                className="w-full h-11 rounded-xl bg-[#FF6B6B]/15 border border-[#FF6B6B]/40 text-[#FF8A8A] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                <Ban size={16} /> {cancelado ? 'Torneo cancelado' : 'Cancelar torneo'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CTA fija móvil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-5 pt-3 safe-bottom bg-gradient-to-t from-[#0D0F15] via-[#0D0F15] to-transparent">
        <button onClick={() => { generar(); setTab('bracket') }} disabled={nCheck < 2}
          className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold flex items-center justify-center gap-2 disabled:opacity-40">
          <Zap size={17} /> Generar bracket · {nCheck} con check-in
        </button>
      </div>

      {sel && <MiniPerfil jugador={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

// Podio al cerrar la final: campeón + subcampeón + semifinalistas (3º-4º), con
// publicación de resultados a los jugadores.
function Podio({ rondas, campeon, juegoColor, onPublicar }: { rondas: MatchB[][]; campeon: Jugador; juegoColor: string; onPublicar: () => void }) {
  const [publicado, setPublicado] = useState(false)
  const final = rondas[rondas.length - 1]?.[0]
  const subcampeon = final?.ganador ? (final.ganador === 'a' ? final.b : final.a) : null
  const semis = rondas.length >= 2 ? rondas[rondas.length - 2] : []
  const terceros = semis
    .filter(m => m.ganador && m.a && m.b)
    .map(m => (m.ganador === 'a' ? m.b : m.a))
    .filter((p): p is Jugador => !!p)

  return (
    <div className="rounded-2xl border border-[#E0BE63]/50 bg-[#E0BE63]/[0.08] p-4 mb-4">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl text-[#0A0A0F] font-black text-lg" style={{ background: '#E0BE63' }}>{campeon.nombre[0]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] font-bold" style={{ color: '#E0BE63' }}>🏆 Campeón</p>
          <p className="text-lg font-bold text-white truncate">{campeon.nombre} <span className="text-sm">{campeon.bandera}</span></p>
        </div>
        <Trophy size={24} className="text-[#E0BE63]" />
      </div>
      <div className="mt-3 space-y-1.5">
        {subcampeon && (
          <div className="flex items-center gap-2.5 rounded-xl bg-white/4 px-3 py-2">
            <span className="w-6 text-center text-sm font-bold text-[#B8C0CC] font-mono-num">2º</span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[#0A0A0F] font-black text-xs" style={{ background: juegoColor }}>{subcampeon.nombre[0]}</span>
            <span className="text-sm font-bold text-white">{subcampeon.nombre} <span className="text-[10px]">{subcampeon.bandera}</span></span>
          </div>
        )}
        {terceros.map(p => (
          <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-white/4 px-3 py-2">
            <span className="w-6 text-center text-sm font-bold text-[#C08A4B] font-mono-num">3º</span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[#0A0A0F] font-black text-xs" style={{ background: juegoColor }}>{p.nombre[0]}</span>
            <span className="text-sm font-bold text-white">{p.nombre} <span className="text-[10px]">{p.bandera}</span></span>
          </div>
        ))}
      </div>
      <button onClick={() => { if (!publicado) { onPublicar(); setPublicado(true) } }} disabled={publicado}
        className={`mt-3 w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${publicado ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border border-[#B6FF3A]/40' : 'bg-[#E0BE63] text-[#0A0A0F]'}`}>
        {publicado ? <><Check size={15} /> Resultados publicados</> : <><Megaphone size={15} /> Publicar resultados a los jugadores</>}
      </button>
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

