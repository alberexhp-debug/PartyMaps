'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getTorneo, getLocal, JUEGOS, plantillaDe, rankingPorJuego } from '@/lib/torneos/sample'
import { boDeRonda, normalizarDesde, paraGanar } from '@/lib/torneos/bracket'
import { PERSONAJES } from '@/lib/torneos/personajes'
import { PersonajeIcon, PersonajesDeLado } from '@/components/todh/PersonajeChip'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { MapaMesas, mesasDePiso, nombrePiso, pisosDe } from '@/components/todh/MapaMesas'
import { GameIcon } from '@/components/todh/GameIcon'
import { ArrowLeft, Check, ListTree, MapPin, Users, Swords, X } from '@/components/todh/iconosTorneum'
import { Vibrate, Hourglass } from 'lucide-react'

// Vista "te toca" del jugador: el plano del local con SU mesa resaltada y el móvil
// vibrando hasta que confirme que va de camino. Pensada para enterarse aunque tenga
// el móvil guardado y esté en la otra punta del local.
export default function MesaPage() {
  return (
    <Suspense fallback={null}>
      <MesaContent />
    </Suspense>
  )
}

const fmtSeg = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function MesaContent() {
  const { t: tr, idioma } = useT()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const params = useSearchParams()
  const n = parseInt(params.get('n') || '3', 10)
  const vs = params.get('vs') || tr('mesa.tuCombate')
  // mid = id del combate real en el bracket del TO → habilita el doble reporte
  const mid = params.get('mid')
  const nombres = useMemo(() => (vs.includes(' vs ') ? vs.split(' vs ') : null), [vs])

  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const gestion = useDemoStore(s => s.gestion[id])
  const disputas = useDemoStore(s => s.disputas)
  const reportesTorneo = useDemoStore(s => s.reportesMatch[id])
  const pjTorneo = useDemoStore(s => s.personajesPorMatch[id])
  const reportarResultado = useDemoStore(s => s.reportarResultado)
  const t = getTorneo(id) || creado
  const local = getLocal(t?.localId || 'gamba')
  const mesasOverride = useDemoStore(s => s.mesasSede[local?.id ?? ''])
  const mesas = mesasOverride ?? local?.mesas ?? []
  const mesa = mesas.find(m => m.n === n)
  const juego = t ? JUEGOS[t.juego] : undefined

  const [confirmado, setConfirmado] = useState(false)
  const vibrando = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Doble reporte REAL (R2): confirmar sentado → todo listo (ambos) →
  // cronómetro → GG → hoja de marcador + personajes → reportarResultado(A).
  // El RIVAL demo se simula (confirma y reporta solo); el CONSENSO no: lo
  // decide el store comparando ambos reportes (coincide → bracket; no → disputa).
  const puedeReportar = !!mid && !!nombres && !!gestion?.generado
  const repMatch = mid ? reportesTorneo?.[mid] : undefined
  const miReporte = repMatch?.A
  const rivalReporto = !!repMatch?.B
  const verificado = !!(mid && gestion?.winners?.[mid])
  const enDisputa = !!(mid && disputas.some(d => d.mid === mid))
  const pjMatch = mid ? pjTorneo?.[mid] : undefined
  const puntosMatch = mid ? gestion?.puntos?.[mid] : undefined
  // Flag por juego: solo los juegos con personajes (plantilla) ofrecen selector
  const conPersonajes = !!t && plantillaDe(t.juego).personajes && (PERSONAJES[t.juego]?.length ?? 0) > 0

  const [rivalListo, setRivalListo] = useState(false)
  const [inicio, setInicio] = useState<number | null>(null)
  const [seg, setSeg] = useState(0)
  const [hoja, setHoja] = useState(false)
  const [demoDistinto, setDemoDistinto] = useState(false)

  // Bo del combate (según ronda del mid y sets del torneo) → atajos de marcador
  const boN = useMemo(() => {
    const b = gestion?.bo ?? { base: 3, top: 5, desde: 'semis' as const }
    const nSeeds = Math.max(2, gestion?.seeds?.length ?? 8)
    const total = Math.ceil(Math.log2(nSeeds))
    const ri = parseInt(mid?.match(/^r(\d+)m/)?.[1] ?? '0', 10)
    return boDeRonda(ri, total, { ...b, desde: normalizarDesde(b.desde) })
  }, [gestion?.bo, gestion?.seeds, mid])

  // El rival demo confirma que está sentado a los ~2 s del «Voy» → todo listo.
  // El inicio se PUBLICA en el mundo (setsEnJuego): la bracket enseña el crono
  // del set en tiempo real y ambos jugadores comparten el mismo reloj.
  const iniciarSetEnJuego = useDemoStore(s => s.iniciarSetEnJuego)
  useEffect(() => {
    if (!confirmado || !puedeReportar || rivalListo || !!miReporte || verificado || enDisputa) return
    const timer = setTimeout(() => {
      setRivalListo(true)
      if (mid) {
        iniciarSetEnJuego(id, mid)
        setInicio(useDemoStore.getState().setsEnJuego[id]?.[mid] ?? Date.now())
      } else setInicio(Date.now())
    }, 1700)
    return () => clearTimeout(timer)
  }, [confirmado, puedeReportar, rivalListo, miReporte, verificado, enDisputa, mid, id, iniciarSetEnJuego])

  // Cronómetro del combate (desde el «todo listo» hasta que reportas)
  useEffect(() => {
    if (inicio == null || miReporte || verificado || enDisputa) return
    const iv = setInterval(() => setSeg(Math.floor((Date.now() - inicio) / 1000)), 500)
    return () => clearInterval(iv)
  }, [inicio, miReporte, verificado, enDisputa])

  // El rival demo reporta solo a los ~2,5 s del tuyo: mismo marcador y sus
  // personajes de seed (o, con el toggle demo, otro marcador → disputa real).
  const nombreA = nombres?.[0]
  const nombreB = nombres?.[1]
  const juegoId = t?.juego
  const nombreTorneo = t?.nombre
  useEffect(() => {
    if (!mid || !nombreA || !nombreB || !juegoId || !nombreTorneo) return
    if (!miReporte || rivalReporto || verificado || enDisputa) return
    const [ma, mb] = miReporte.marcador
    const timer = setTimeout(() => {
      const rival = rankingPorJuego(juegoId).find(p => p.nombre === nombreB)
      reportarResultado({
        torneoId: id, matchId: mid, lado: 'B',
        reporte: {
          marcador: demoDistinto ? [mb, ma] : [ma, mb],
          personajes: conPersonajes && rival?.main ? [rival.main] : undefined,
        },
        ctx: { nombreTorneo, mesa: n, a: nombreA, b: nombreB, juego: juegoId },
      })
    }, 2500)
    return () => clearTimeout(timer)
  }, [mid, nombreA, nombreB, juegoId, nombreTorneo, miReporte, rivalReporto, verificado, enDisputa, demoDistinto, conPersonajes, id, n, reportarResultado])

  // Enviar MI reporte (lado A): marcador en orden A/B + mis personajes (≤2)
  const enviarReporte = (ganador: string, gW: number, gL: number, personajes: string[]) => {
    if (!mid || !nombreA || !nombreB || !juegoId || !nombreTorneo) return
    reportarResultado({
      torneoId: id, matchId: mid, lado: 'A',
      reporte: {
        marcador: ganador === nombreA ? [gW, gL] : [gL, gW],
        personajes: personajes.length ? personajes : undefined,
        deUsuario: true,
      },
      ctx: { nombreTorneo, mesa: n, a: nombreA, b: nombreB, juego: juegoId },
    })
    setHoja(false)
  }

  // Vibración persistente hasta confirmar (en móviles compatibles; en escritorio
  // queda el pulso visual). Patrón insistente tipo alarma suave.
  useEffect(() => {
    if (confirmado) return
    const patron = [350, 180, 350, 180, 600]
    const vibrar = () => { try { navigator.vibrate?.(patron) } catch { /* sin soporte */ } }
    vibrar()
    vibrando.current = setInterval(vibrar, 2200)
    return () => {
      if (vibrando.current) clearInterval(vibrando.current)
      try { navigator.vibrate?.(0) } catch { /* sin soporte */ }
    }
  }, [confirmado])

  if (!t || !local) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-bold text-white">{tr('ges.torneoNoEncontrado')}</p>
        <Link href="/explorar" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">{tr('tf.volverExplorar')}</Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pb-32 lg:pb-12 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <div className="flex items-center gap-3 px-4 lg:px-6 pt-5 pb-3 safe-top">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold truncate">{t.nombre}</p>
          <p className="text-base font-bold text-white truncate">{vs}</p>
        </div>
        {juego && (
          <span className="inline-flex items-center gap-1.5 px-2 h-7 rounded-full text-[10px] font-bold shrink-0" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
            <GameIcon juegoId={t.juego} size={12} /> {juego.corto}
          </span>
        )}
      </div>

      {/* Escritorio: plano grande a la izquierda + aviso/datos/acción a la derecha */}
      <div className="px-4 lg:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:items-start lg:mt-2">
        {/* Aviso vibrante */}
        <div className="lg:col-start-2 lg:row-start-1">
        {!confirmado ? (
          <div className="rounded-2xl border border-[#B6FF3A]/50 bg-[#B6FF3A]/[0.10] p-4 flex items-center gap-3" style={{ animation: 'pulse-heat 1.4s ease-in-out infinite' }}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#B6FF3A]/20 text-[#B6FF3A] shrink-0"><Vibrate size={20} /></span>
            <div>
              <p className="text-[15px] font-bold text-white leading-tight">{tr('mesa.teToca')} <span className="text-[#B6FF3A]">{tr('mesa.mesa')} {n}</span></p>
              <p className="text-xs text-[#B8B8CC] mt-0.5">{tr('mesa.vibrara')}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.08] p-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] shrink-0"><Check size={20} /></span>
            <div>
              <p className="text-[15px] font-bold text-white leading-tight">{tr('mesa.confirmado')} {n}</p>
              <p className="text-xs text-[#B8B8CC] mt-0.5">{tr('mesa.toSabe')}</p>
            </div>
          </div>
        )}
        </div>

        {/* Plano con la mesa resaltada (se pinta el piso donde está tu mesa) */}
        <div className="mt-4 lg:mt-0 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          {(() => {
            const pisoMesa = mesas.find(m => m.n === n)?.piso ?? 0
            return (
              <>
                <MapaMesas mesas={mesasDePiso(mesas, pisoMesa)} destacada={n} />
                <p className="mt-2 text-[11px] text-[#8B8BA8] text-center">{tr('mesa.planoDe')} {local.nombre}{pisosDe(mesas) > 1 ? ` · ${nombrePiso(pisoMesa, idioma)}` : ''} · {tr('mesa.plano')}</p>
              </>
            )
          })()}
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
        {/* Datos de la mesa y la sede */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="card-premium p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1"><Users size={13} className="text-[#9B82FF]" /> {tr('adm.mesa')} {n}</div>
            <p className="text-sm font-bold text-white capitalize">{mesa ? `${mesa.tipo} · ${mesa.plazas} ${tr('adm.plazas').toLowerCase()}` : tr('mesa.porAsignar')}</p>
          </div>
          <div className="card-premium p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1"><MapPin size={13} className="text-[#4F8EF7]" /> {tr('mesa.sede')}</div>
            <p className="text-sm font-bold text-white truncate">{local.nombre} · {local.zona}</p>
          </div>
        </div>

        {/* Flujo del combate (cuando la mesa viene de un combate real del bracket):
            todo listo → cronómetro → GG → reporte → verificado o disputa */}
        {confirmado && puedeReportar && (
          <div className="mt-3 card-premium p-4">
            {verificado ? (
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] shrink-0"><Check size={18} /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{tr('rr.verificado')}</p>
                    <p className="text-[11px] text-[#8B8BA8]">{tr('rr.verificadoSub')}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-white/4 border border-white/8 px-3 py-2.5 flex items-center justify-between gap-2">
                  <span className="min-w-0 flex items-center gap-1.5 text-[13px] font-semibold text-white truncate">
                    {nombres![0]}{conPersonajes && <PersonajesDeLado juegoId={t.juego} nombres={pjMatch?.A} px={15} />}
                  </span>
                  <span className="text-[15px] font-bold text-score text-[#B6FF3A] shrink-0">
                    {puntosMatch ? `${puntosMatch.a}–${puntosMatch.b}` : ''}
                  </span>
                  <span className="min-w-0 flex items-center gap-1.5 text-[13px] font-semibold text-white truncate justify-end">
                    {conPersonajes && <PersonajesDeLado juegoId={t.juego} nombres={pjMatch?.B} px={15} />}{nombres![1]}
                  </span>
                </div>
              </div>
            ) : enDisputa ? (
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6076]/15 text-[#FF6076] shrink-0"><Hourglass size={17} /></span>
                <div>
                  <p className="text-sm font-bold text-white">{tr('mesa.disputaAbierta')}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{tr('rr.disputaSub')}</p>
                </div>
              </div>
            ) : miReporte ? (
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF8A5C]/15 text-[#FF8A5C] shrink-0"><Hourglass size={17} className="animate-pulse" /></span>
                <div>
                  <p className="text-sm font-bold text-white">{tr('rr.enviado')}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{tr('rr.enviadoSub')}</p>
                </div>
              </div>
            ) : rivalListo ? (
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A] shrink-0"><Swords size={17} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{tr('rr.todoListo')}</p>
                    <p className="text-[11px] text-[#8B8BA8]">{tr('rr.todoListoSub')}</p>
                  </div>
                  <span className="text-[21px] font-bold text-score text-[#B6FF3A] shrink-0">{fmtSeg(seg)}</span>
                </div>
                <button onClick={() => setHoja(true)} className="mt-3 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-[15px] font-bold">
                  {tr('rr.gg')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9B82FF]/15 text-[#B9A6FF] shrink-0"><Hourglass size={17} className="animate-pulse" /></span>
                <div>
                  <p className="text-sm font-bold text-white">{tr('rr.rivalConfirmando')}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{tr('rr.rivalConfirmandoSub')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <Link href={`/torneo/${t.id}/bracket`} className="mt-3 flex items-center justify-between card-premium card-int p-4">
          <span className="inline-flex items-center gap-2 text-white font-semibold text-sm"><ListTree size={17} className="text-[#9B82FF]" /> {tr('mesa.verBracket')}</span>
          <span className="text-[#8B8BA8] text-lg">›</span>
        </Link>

        {/* Acción (escritorio, en columna) */}
        <div className="hidden lg:block mt-4">
          {!confirmado ? (
            <button onClick={() => setConfirmado(true)}
              className="w-full h-13 py-3.5 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] flex items-center justify-center gap-2">
              <Check size={18} /> {tr('mesa.voy')}
            </button>
          ) : (
            <Link href={`/torneo/${t.id}/directo`}
              className="w-full h-13 py-3.5 rounded-2xl bg-white/8 border border-white/12 text-white font-bold text-[15px] flex items-center justify-center gap-2">
              {tr('mesa.abrirChat')}
            </Link>
          )}
        </div>
        </div>
      </div>

      {/* CTA fija (móvil/tablet) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-20 px-4 pb-3 pt-3 bg-gradient-to-t from-[#0D0F15] via-[#0D0F15] to-transparent">
        <div className="max-w-lg mx-auto">
          {!confirmado ? (
            <button onClick={() => setConfirmado(true)}
              className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform flex items-center justify-center gap-2">
              <Check size={18} /> {tr('mesa.voy')}
            </button>
          ) : (
            <Link href={`/torneo/${t.id}/directo`}
              className="w-full h-14 rounded-2xl bg-white/8 border border-white/12 text-white font-bold text-[15px] flex items-center justify-center gap-2">
              {tr('mesa.abrirChat')}
            </Link>
          )}
        </div>
      </div>

      {/* Hoja de reporte: marcador (atajos según el Bo de la ronda) + tus
          personajes (≤2, solo si el juego los lleva según su plantilla) */}
      {hoja && nombres && (
        <ReporteSheet
          nombres={nombres as [string, string]} boN={boN} juegoId={t.juego} conPersonajes={conPersonajes}
          demoDistinto={demoDistinto} setDemoDistinto={setDemoDistinto}
          onEnviar={enviarReporte} onCerrar={() => setHoja(false)}
        />
      )}
    </div>
  )
}

// Hoja del reporte del JUGADOR (equivalente móvil del ResultadoSheet del TO):
// quién gana + marcador con atajos del Bo + selector de personajes del catálogo.
function ReporteSheet({ nombres, boN, juegoId, conPersonajes, demoDistinto, setDemoDistinto, onEnviar, onCerrar }: {
  nombres: [string, string]
  boN: number
  juegoId: string
  conPersonajes: boolean
  demoDistinto: boolean
  setDemoDistinto: (v: boolean) => void
  onEnviar: (ganador: string, gW: number, gL: number, personajes: string[]) => void
  onCerrar: () => void
}) {
  const { t: tr } = useT()
  const [ganador, setGanador] = useState<string | null>(null)
  const gana = paraGanar(boN)
  const opciones = Array.from({ length: gana }, (_, l) => [gana, l] as const)
  const [marcador, setMarcador] = useState<readonly [number, number]>(opciones[0])
  const [pers, setPers] = useState<string[]>([])
  const [filtro, setFiltro] = useState('')
  const pool = PERSONAJES[juegoId] ?? []
  const lista = filtro ? pool.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase())) : pool

  const togglePers = (nombre: string) => setPers(prev =>
    prev.includes(nombre) ? prev.filter(x => x !== nombre) : prev.length >= 2 ? prev : [...prev, nombre])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onCerrar} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5 max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-white text-display">{tr('rr.titulo')}</p>
            <p className="mt-0.5 text-[12px] text-[#8B8BA8]">{tr('rr.tituloSub')}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] shrink-0"><X size={15} /></button>
        </div>

        <p className="mt-4 mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold"><Swords size={13} className="text-[#B6FF3A]" /> {tr('mesa.quienGana')}</p>
        <div className="grid grid-cols-2 gap-2">
          {nombres.map(nm => (
            <button key={nm} onClick={() => setGanador(nm)}
              className={`h-11 rounded-xl text-sm font-bold border transition-all truncate px-2 ${ganador === nm ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>
              {nm}
            </button>
          ))}
        </div>

        <p className="mt-3.5 mb-2 text-[11px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold">{tr('rr.marcador')} <span className="normal-case tracking-normal font-semibold text-[#6B6B85]">· Bo{boN}</span></p>
        <div className="flex items-center gap-2 flex-wrap">
          {opciones.map(([w, l]) => (
            <button key={`${w}-${l}`} onClick={() => setMarcador([w, l])}
              className={`px-3.5 h-10 rounded-xl text-[13px] font-bold border text-score transition-all ${marcador[0] === w && marcador[1] === l ? 'bg-[#9B82FF]/15 text-[#B9A6FF] border-[#9B82FF]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>
              {w}–{l}
            </button>
          ))}
        </div>

        {conPersonajes && (
          <div className="mt-3.5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold">
              {tr('rr.tusPersonajes')} <span className="normal-case tracking-normal font-semibold text-[#6B6B85]">· {tr('rr.hasta2')}</span>
            </p>
            {pool.length > 15 && (
              <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder={tr('rr.buscarPersonaje')}
                className="mb-2 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
            )}
            <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {lista.length === 0 && <p className="col-span-full text-center text-xs text-[#8B8BA8] py-4">{tr('adm.sinResultados')} «{filtro}».</p>}
              {lista.map(p => {
                const on = pers.includes(p.nombre)
                return (
                  <button key={p.nombre} onClick={() => togglePers(p.nombre)} title={p.nombre}
                    className="flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-all"
                    style={on
                      ? { background: `${p.color}1A`, borderColor: `${p.color}77` }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <PersonajeIcon juegoId={juegoId} nombre={p.nombre} px={26} />
                    <span className={`text-[10px] font-bold leading-tight text-center truncate w-full ${on ? 'text-white' : 'text-[#B8B8CC]'}`}>{p.nombre}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <button onClick={() => ganador && onEnviar(ganador, marcador[0], marcador[1], pers)} disabled={!ganador}
          className="mt-4 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">
          {tr('rr.enviar')}
        </button>
        {/* Camino determinista para DEMOSTRAR la disputa (solo demo) */}
        <label className="mt-2.5 flex items-center gap-2 text-[10px] text-[#6B6B85] select-none cursor-pointer">
          <input type="checkbox" checked={demoDistinto} onChange={e => setDemoDistinto(e.target.checked)} className="h-3 w-3 accent-[#FF6076]" />
          {tr('rr.demoDistinto')}
        </label>
      </div>
    </div>
  )
}
