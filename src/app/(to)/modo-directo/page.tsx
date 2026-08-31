'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { getTorneo, getLocal, rankingPorJuego, plantillaDe, TORNEOS_SAMPLE, type Jugador, type Mesa } from '@/lib/torneos/sample'
import { PersonajesDeLado } from '@/components/todh/PersonajeChip'
import { CrewTag } from '@/components/todh/CrewTag'
import { construirRondas, nombreRonda, normalizarDesde, opcionesDesde, etiquetaDesde, type MatchB } from '@/lib/torneos/bracket'
import { useDemoStore, useOrgId, resolverSeeds } from '@/lib/stores/useDemoStore'
import { useT, conParams, type ClaveI18n } from '@/lib/i18n'
import { CronoSet } from '@/components/todh/CronoSet'
import { MapaMesas, LeyendaMesas, ESTADO_MESA, PisoTabs, pisosDe, mesasDePiso, type EstadoMesa } from '@/components/todh/MapaMesas'
import { ArrowLeft, Radio, Play, AlertTriangle, Clock, Check, RotateCcw, ListTree, CalendarClock, Plus, X } from '@/components/todh/iconosTorneum'
import { Pause, Tv, Flag, Map as MapIcon, List, ClipboardList, Undo2 } from 'lucide-react'

type Estado = 'ocupado' | 'libre' | 'caido'
// `tipo` es una CLAVE i18n (F9): se pinta con tr() en el idioma activo.
type Setup = { n: number; tipo: ClaveI18n; stream?: boolean; estado: Estado; a?: string; b?: string; seg?: number; mid?: string }
type ColaItem = { id: string; a: string; b: string; ronda: string }

// El TO puede gestionar VARIOS torneos: los que están en directo y los próximos
// (para dejar ajustes hechos con antelación). Se cambia con el selector superior.

const SETUPS0: Setup[] = [
  { n: 1, tipo: 'sede.tipoConsola', estado: 'ocupado', a: 'Kaze', b: 'Volt', seg: 7 * 60 },
  { n: 2, tipo: 'sede.tipoConsola', estado: 'libre' },
  { n: 3, tipo: 'sede.tipoStream', stream: true, estado: 'ocupado', a: 'Sora', b: 'Rei', seg: 12 * 60 },
  { n: 4, tipo: 'sede.tipoConsola', estado: 'caido' },
  { n: 5, tipo: 'sede.tipoPc', estado: 'ocupado', a: 'Lux', b: 'Nyx', seg: 3 * 60 },
  { n: 6, tipo: 'sede.tipoPc', estado: 'libre' },
]
const COLA0: ColaItem[] = [
  { id: 'c1', a: 'Drako', b: 'Kira', ronda: 'Winners R2' },
  { id: 'c2', a: 'Faze', b: 'Aqua', ronda: 'Losers R3' },
  { id: 'c3', a: 'Mist', b: 'Pyra', ronda: 'Winners R2' },
  { id: 'c4', a: 'Vega', b: 'Onyx', ronda: 'Losers R3' },
]
const COLORS: Record<Estado, { dot: string; clave: ClaveI18n; text: string }> = {
  ocupado: { dot: '#B6FF3A', clave: 'em.ocupada', text: '#B6FF3A' },
  libre: { dot: '#4F8EF7', clave: 'em.libre', text: '#6FB0FF' },
  caido: { dot: '#FF6076', clave: 'md.caido', text: '#FF6076' },
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
// Etiqueta de setup según el tipo de mesa del plano (al añadirla al torneo).
const TIPO_MESA: Record<Mesa['tipo'], ClaveI18n> = { consola: 'sede.tipoConsola', pc: 'sede.tipoPc', stream: 'sede.tipoStream', arcade: 'sede.tipoArcade', mesa: 'sede.tipoMesa' }

// ── Preparación de sala ANTES del directo (decisión 30-08) ──
// Las marcas del TO viven en el store (prepMesas) para sobrevivir a recargas:
// 'caido' (la mesa arranca caída), 'fuera' (quitada del torneo) y 'dentro'
// (mesa del plano añadida al torneo fuera de los setups base).
type PrepMesa = Record<number, 'caido' | 'fuera' | 'dentro'>
const PREP0: PrepMesa = {}
// Fusiona la preparación sobre los setups base: quitadas fuera, caídas caídas,
// añadidas dentro. Es el estado con el que ARRANCA el directo (y el que se
// restaura al montar la página, se haya empezado ya o no).
function fusionarPrep(mesas: Mesa[], prep: PrepMesa): Setup[] {
  const base = SETUPS0.filter(s => prep[s.n] !== 'fuera')
    .map(s => prep[s.n] === 'caido' ? { ...s, estado: 'caido' as Estado, a: undefined, b: undefined, seg: undefined, mid: undefined } : s)
  const extra = mesas
    .filter(m => !SETUPS0.some(s => s.n === m.n) && prep[m.n] && prep[m.n] !== 'fuera')
    .map(m => ({ n: m.n, tipo: TIPO_MESA[m.tipo], stream: m.tipo === 'stream', estado: (prep[m.n] === 'caido' ? 'caido' : 'libre') as Estado }))
  return [...base, ...extra].sort((a, b) => a.n - b.n)
}
const esSetupBase = (n: number) => SETUPS0.some(s => s.n === n)

export default function ModoDirectoPage() {
  const { t: tr, idioma } = useT()
  const router = useRouter()
  const [cola, setCola] = useState<ColaItem[]>(COLA0)
  const [usados, setUsados] = useState<string[]>([])
  const [pausada, setPausada] = useState(false)

  // Torneos del organizador QUE ENTRA (identidad por cuenta, nada de asumir
  // «lima»): en directo primero, después los próximos.
  const orgId = useOrgId()
  const creados = useDemoStore(s => s.creados)
  const cancelados = useDemoStore(s => s.cancelados)
  const misTorneos = useMemo(() => {
    const todos = [...creados, ...TORNEOS_SAMPLE].filter(t => t.organizadorId === orgId && !cancelados.includes(t.id))
    return [...todos.filter(t => t.enDirecto), ...todos.filter(t => !t.enDirecto)]
  }, [creados, cancelados, orgId])
  const [torneoIdSel, setTorneoId] = useState('t1')
  // El torneo activo SIEMPRE es de esta cuenta (derivado, sin efecto): si el
  // seleccionado no lo es (p. ej. una sede entra por primera vez), cae al
  // primero propio.
  const torneoId = misTorneos.some(t => t.id === torneoIdSel) ? torneoIdSel : (misTorneos[0]?.id ?? torneoIdSel)
  const [vistaMesas, setVistaMesas] = useState<'plano' | 'lista'>('plano')
  const [mesaSel, setMesaSel] = useState<number | null>(null)
  const [pisoVista, setPisoVista] = useState(0)

  // Torneo activo, su local y la PREPARACIÓN persistida de su sala: se derivan
  // antes que los setups porque el estado de sala arranca fusionando la prep.
  const torneo = getTorneo(torneoId) ?? creados.find(c => c.id === torneoId)
  const enDirecto = !!torneo?.enDirecto
  // Sets en juego del torneo activo (mundo): el crono que arrancan los
  // jugadores desde su mesa se ve también aquí, en el bracket en directo.
  const setsVivos = useDemoStore(s => s.setsEnJuego[torneoId])
  // Plano de mesas del local que acoge el torneo (el que edita la sede en su panel).
  const local = getLocal(torneo?.localId ?? 'gamba')
  const mesasOverride = useDemoStore(s => s.mesasSede[local?.id ?? ''])
  const mesas = mesasOverride ?? local?.mesas ?? []
  const prep = useDemoStore(s => s.prepMesas[torneoId]) ?? PREP0
  const prepararMesa = useDemoStore(s => s.prepararMesa)

  // Estado de sala del directo: arranca con la preparación fusionada (una mesa
  // marcada caída ANTES del torneo empieza caída en el directo).
  const [setups, setSetups] = useState<Setup[]>(() => fusionarPrep(mesas, prep))

  // Al cambiar de torneo se resetea el estado de sala (setups/cola/disputa demo).
  // Patrón «ajustar estado durante el render» (sin efecto): React descarta el
  // render en curso y repinta ya con la sala limpia (con SU preparación).
  const [torneoPrevio, setTorneoPrevio] = useState(torneoId)
  if (torneoPrevio !== torneoId) {
    setTorneoPrevio(torneoId)
    setSetups(fusionarPrep(mesas, prep))
    setCola(COLA0)
    setUsados([])
    setPausada(false)
    setMesaSel(null)
  }
  // Si el torneo pasa a directo con la página abierta, la sala arranca con la
  // preparación tal cual quedó (mismo patrón de ajuste durante el render).
  const [direPrevio, setDirePrevio] = useState(enDirecto)
  if (direPrevio !== enDirecto) {
    setDirePrevio(enDirecto)
    setSetups(fusionarPrep(mesas, prep))
  }

  // Si el TO generó bracket en /gestionar, la cola Y el bracket en directo
  // salen de los combates reales; si no, datos de muestra.
  const gestion = useDemoStore(s => s.gestion[torneoId])
  const setGestion = useDemoStore(s => s.setGestion)
  const override = useDemoStore(s => s.editados[torneoId])
  const pushNoti = useDemoStore(s => s.pushNoti)
  // Resultado manual al liberar una mesa: si los jugadores no reportan, el TO
  // fija el marcador aquí y se aplica al bracket en vivo.
  const [reportando, setReportando] = useState<{ n: number; a: string; b: string; mid?: string; disputaId?: string } | null>(null)
  // Liberar con partida activa: primero se decide qué pasa con la partida
  // (establecer resultado o cancelarla) y solo después se abre el marcador.
  const [confirmLiberar, setConfirmLiberar] = useState<{ n: number; a: string; b: string; mid?: string } | null>(null)
  // 'final' guardado por versiones previas se lee como 'semis' (sin migración).
  const boGuardado = gestion?.bo
  const bo = useMemo(() => {
    const b = boGuardado ?? { base: 3, top: 5, desde: 'semis' as const }
    return { ...b, desde: normalizarDesde(b.desde) }
  }, [boGuardado])
  // Un torneo que aún no ha empezado no tiene combates: nada de nombres ni
  // cronos de muestra. Solo cuentan las marcas de PREPARACIÓN del TO (caídas,
  // quitadas, añadidas); el resto de mesas se ve libre hasta que arranque.
  const setupsVista = enDirecto
    ? setups
    : fusionarPrep(mesas, prep).map(s => ({ ...s, estado: (prep[s.n] === 'caido' ? 'caido' : 'libre') as Estado, a: undefined, b: undefined, seg: undefined, mid: undefined }))
  const nombreTorneo = override?.nombre ?? torneo?.nombre ?? 'Torneo en directo'
  // Rondas VIVAS del bracket real: la misma estructura alimenta la cola de
  // combates y el bracket en directo. Se recalculan con cada reporte (consenso
  // de jugadores, marcador manual del TO o disputa resuelta). Deps granulares
  // (primitivas y slices del store) para que React Compiler pueda optimizar.
  const juegoTorneo = torneo?.juego
  const generadoLive = !!gestion?.generado
  const seedsLive = gestion?.seeds
  const perfilesCuentas = useDemoStore(s => s.perfilesCuentas)
  const winnersLive = gestion?.winners
  const rondasVivas = useMemo<MatchB[][]>(() => {
    if (!juegoTorneo || !generadoLive || !seedsLive) return []
    const seeds = resolverSeeds(seedsLive, rankingPorJuego(juegoTorneo), juegoTorneo, perfilesCuentas)
    return construirRondas(seeds, winnersLive ?? {})
  }, [juegoTorneo, generadoLive, seedsLive, winnersLive, perfilesCuentas])
  const colaBracket = useMemo<ColaItem[]>(() =>
    rondasVivas.flatMap(matches =>
      matches.filter(m => m.a && m.b && !m.ganador)
        .map(m => ({ id: m.id, a: m.a!.nombre, b: m.b!.nombre, ronda: nombreRonda(matches.length, idioma) })))
  , [rondasVivas, idioma])
  const bracketReal = !!gestion?.generado
  // Tamaño real del cuadro (plazas del bracket generado; si no, las del torneo):
  // decide qué profundidades de Bo tienen sentido (top16 solo con ≥16, etc.).
  const tamCuadro = bracketReal ? Math.pow(2, rondasVivas.length) : (torneo?.plazas ?? 8)
  // La cola de muestra solo anima los torneos YA en directo de la demo; con
  // bracket real sale del cuadro, y sin empezar no hay enfrentamientos aún.
  const colaViva = bracketReal ? colaBracket.filter(m => !usados.includes(m.id)) : enDirecto ? cola : []
  // Personajes declarados por combate (doble reporte de los jugadores): se
  // pintan junto a los resultados jugados, solo en juegos que llevan personajes.
  const pjTorneo = useDemoStore(s => s.personajesPorMatch[torneoId])
  const pjVivo = juegoTorneo && plantillaDe(juegoTorneo).personajes ? pjTorneo : undefined
  // Disputas del STORE: las abre el jugador desde su mesa cuando no hay consenso
  const disputasStore = useDemoStore(s => s.disputas)
  const resolverDisputaStore = useDemoStore(s => s.resolverDisputa)
  const disputasTorneo = disputasStore.filter(d => d.torneoId === torneoId)
  const disputa = disputasTorneo[0] ?? null
  const [toast, setToast] = useState<string | null>(null)
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Timers en vivo
  useEffect(() => {
    const iv = setInterval(() => {
      setSetups(prev => prev.map(s => s.estado === 'ocupado' ? { ...s, seg: (s.seg ?? 0) + 1 } : s))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  function flash(msg: string) {
    setToast(msg)
    if (toastT.current) clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToast(null), 2200)
  }

  function asignar(n: number) {
    // La cola no existe antes del directo: asignar exige torneo empezado.
    if (!enDirecto) { flash(tr('md.asignarSoloDirecto')); return }
    if (pausada) { flash(tr('md.colaEstaPausada')); return }
    const next = colaViva[0]
    if (!next) { flash(tr('md.sinCombatesCola')); return }
    if (bracketReal) setUsados(u => [...u, next.id])
    else setCola(c => c.slice(1))
    setSetups(prev => prev.map(s => s.n === n ? { ...s, estado: 'ocupado', a: next.a, b: next.b, seg: 0, mid: next.id } : s))
    flash(`${next.a} vs ${next.b} → ${tr('adm.mesa')} ${n}`)
    // Aviso "te toca" al jugador: abre su vista de mesa (resaltada + vibración).
    pushNoti({
      tipo: 'combate', titulo: `Te toca · Mesa ${n}`,
      cuerpo: `${next.a} vs ${next.b} (${next.ronda}). Preséntate en la mesa ${n}.`,
      tituloKey: 'ntf.teTocaT', cuerpoKey: 'ntf.teTocaC', params: { mesa: n, a: next.a, b: next.b, ronda: next.ronda },
      href: `/torneo/${torneoId}/mesa?n=${n}&vs=${encodeURIComponent(`${next.a} vs ${next.b}`)}${bracketReal ? `&mid=${next.id}` : ''}`,
    })
  }
  // Liberar una mesa ocupada: primero el TO decide qué pasa con la partida en
  // curso — establecer el resultado (abre el marcador) o cancelarla (el combate
  // vuelve a la cola como si nunca se hubiera jugado).
  function liberar(n: number) {
    const s = setups.find(x => x.n === n)
    if (s?.estado === 'ocupado' && s.a && s.b) {
      setConfirmLiberar({ n, a: s.a, b: s.b, mid: s.mid })
      return
    }
    liberarSinResultado(n)
  }
  function liberarSinResultado(n: number) {
    setSetups(prev => prev.map(s => s.n === n ? { ...s, estado: 'libre', a: undefined, b: undefined, seg: undefined, mid: undefined } : s))
    flash(conParams(tr('md.mesaNLiberada'), { n }))
  }
  // Cancelar la partida en curso: sin winners ni puntos, el combate se
  // reinyecta en la cola como pendiente y la mesa vuelve a libre.
  function cancelarPartida(x: { n: number; a: string; b: string; mid?: string }) {
    if (x.mid) setUsados(u => u.filter(id => id !== x.mid))
    else setCola(c => [{ id: `r${x.n}${Date.now()}`, a: x.a, b: x.b, ronda: 'Reasignar' }, ...c])
    setSetups(prev => prev.map(s => s.n === x.n ? { ...s, estado: 'libre', a: undefined, b: undefined, seg: undefined, mid: undefined } : s))
    setConfirmLiberar(null)
    flash(tr('md.partidaCancelada'))
  }
  // Quitar una mesa del torneo (libre o caída): su Setup desaparece y la mesa
  // del plano queda «fuera del torneo». Reversible con «Añadir al torneo».
  // ANTES del directo la marca se persiste (prepMesas) y sobrevive a recargas.
  function quitarDelTorneo(n: number) {
    if (!enDirecto) {
      prepararMesa(torneoId, n, esSetupBase(n) ? 'fuera' : null)
      flash(tr('md.mesaQuitada'))
      return
    }
    setSetups(prev => prev.filter(s => s.n !== n))
    flash(tr('md.mesaQuitada'))
  }
  function anadirAlTorneo(m: Mesa) {
    if (!enDirecto) {
      prepararMesa(torneoId, m.n, esSetupBase(m.n) ? null : 'dentro')
      flash(tr('md.mesaAnadida'))
      return
    }
    setSetups(prev => prev.some(s => s.n === m.n) ? prev
      : [...prev, { n: m.n, tipo: TIPO_MESA[m.tipo], stream: m.tipo === 'stream', estado: 'libre' as Estado }].sort((a, b) => a.n - b.n))
    flash(tr('md.mesaAnadida'))
  }
  // El TO fija el marcador del combate: se escribe en el bracket en vivo (si el
  // combate es del bracket real) y se avisa a los jugadores. Si venía de una
  // DISPUTA, la resuelve con ese marcador exacto (nada de «gana X» a secas).
  function guardarResultado(r: { n: number; a: string; b: string; mid?: string; disputaId?: string }, sa: number, sb: number) {
    const lado: 'a' | 'b' = sa >= sb ? 'a' : 'b'
    const ganador = lado === 'a' ? r.a : r.b
    if (r.disputaId) {
      resolverDisputaStore(r.disputaId, lado, { a: sa, b: sb })
      liberarSinResultado(r.n)
      setReportando(null)
      flash(conParams(tr('md.disputaResueltaFlash'), { ganador, marcador: `${Math.max(sa, sb)}–${Math.min(sa, sb)}` }))
      return
    }
    if (r.mid) {
      setGestion(torneoId, {
        winners: { ...(gestion?.winners ?? {}), [r.mid]: lado },
        puntos: { ...(gestion?.puntos ?? {}), [r.mid]: { a: sa, b: sb } },
      })
    }
    pushNoti({
      tipo: 'combate', titulo: `Resultado · Mesa ${r.n}`,
      cuerpo: `${r.a} ${sa}–${sb} ${r.b}. Gana ${ganador}${r.mid ? ' · el bracket avanza' : ''} (reportado por el organizador).`,
      tituloKey: 'ntf.resultadoMesaT', cuerpoKey: r.mid ? 'ntf.resultadoMesaAvanzaC' : 'ntf.resultadoMesaC',
      params: { mesa: r.n, a: r.a, b: r.b, sa, sb, ganador },
      href: `/torneo/${torneoId}/bracket`,
    })
    liberarSinResultado(r.n)
    setReportando(null)
    flash(conParams(tr('md.ganaLiberada'), { ganador, marcador: `${Math.max(sa, sb)}–${Math.min(sa, sb)}`, n: r.n }))
  }
  function toggleCaido(n: number) {
    // Preparación (torneo sin empezar): la marca va al store y esa mesa
    // arrancará caída (o reactivada) cuando empiece el directo.
    if (!enDirecto) {
      if (prep[n] === 'caido') prepararMesa(torneoId, n, esSetupBase(n) ? null : 'dentro')
      else prepararMesa(torneoId, n, 'caido')
      return
    }
    setSetups(prev => prev.map(s => {
      if (s.n !== n) return s
      if (s.estado === 'caido') return { ...s, estado: 'libre' }
      // si estaba ocupado, su combate vuelve a la cola
      if (s.estado === 'ocupado' && s.a && s.b) {
        if (s.mid) setUsados(u => u.filter(x => x !== s.mid))
        else setCola(c => [{ id: `r${n}${Date.now()}`, a: s.a!, b: s.b!, ronda: 'Reasignar' }, ...c])
      }
      return { ...s, estado: 'caido', a: undefined, b: undefined, seg: undefined, mid: undefined }
    }))
  }
  // Resolver una disputa = fijar TÚ el marcador (se abre la hoja de resultado).
  function resolverConMarcador(d: typeof disputasTorneo[number]) {
    setReportando({ n: d.mesa, a: d.a, b: d.b, mid: d.mid, disputaId: d.id })
  }

  const enJuego = setups.filter(s => s.estado === 'ocupado').length
  const libres = setups.filter(s => s.estado === 'libre').length
  // Mesa seleccionada en el plano: su setup (si está en el torneo), la mesa del
  // local y el estado a pintar en el panel contextual.
  const sSel = mesaSel != null ? setupsVista.find(x => x.n === mesaSel) : undefined
  const mSel = mesaSel != null ? mesas.find(x => x.n === mesaSel) : undefined
  const estadoSel: EstadoMesa | null = sSel
    ? (disputa?.mesa === sSel.n ? 'disputa' : sSel.estado === 'ocupado' ? 'ocupada' : sSel.estado === 'caido' ? 'caida' : 'libre')
    : null

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('md.titulo')}</p>
          <p className="text-base font-bold text-white truncate">{nombreTorneo}</p>
        </div>
        {enDirecto
          ? <span className="inline-flex items-center gap-1 px-2.5 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white shrink-0"><Radio size={12} className="animate-pulse-heat" /> {tr('md.directo')}</span>
          : <span className="inline-flex items-center gap-1 px-2.5 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#4F8EF7]/20 text-[#7FB0FF] border border-[#4F8EF7]/40 shrink-0"><CalendarClock size={12} /> {tr('md.proximo')}</span>}
        <button onClick={() => { setPausada(p => !p); flash(pausada ? tr('md.colaReanudada') : tr('md.colaPausadaFlash')) }} aria-label="Pausar cola"
          className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', pausada ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'glass-strong text-white')}>
          {pausada ? <Play size={15} /> : <Pause size={15} />}
        </button>
      </div>

      {/* Selector: torneos en directo y PRÓXIMOS (para preparar con antelación) */}
      <div className="px-4 pt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {misTorneos.map(mt => {
          const on = mt.id === torneoId
          return (
            <button key={mt.id} onClick={() => setTorneoId(mt.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border transition-all ${on ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10 hover:text-white'}`}>
              {mt.enDirecto ? <span className="dot-live" /> : <CalendarClock size={12} className="opacity-70" />}
              <span className="max-w-40 truncate">{mt.nombre}</span>
            </button>
          )
        })}
      </div>

      {/* Torneo próximo: vista de PREPARACIÓN (aún no en directo) */}
      {!enDirecto && torneo && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-3 rounded-2xl border border-[#4F8EF7]/35 bg-[#4F8EF7]/[0.08] px-4 py-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#4F8EF7]/20 text-[#7FB0FF] shrink-0"><CalendarClock size={17} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{tr('md.empieza')} {torneo.fechaLabel}</p>
              <p className="text-xs text-[#9FC2FF]">{tr('md.prepTexto')}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="card-premium p-3"><p className="text-lg font-bold text-white font-mono-num leading-none">{torneo.inscritos}/{torneo.plazas}</p><p className="text-[10px] uppercase tracking-[0.1em] text-[#8B8BA8] font-semibold mt-1">{tr('to.inscritos')}</p></div>
            <div className="card-premium p-3"><p className="text-lg font-bold text-white font-mono-num leading-none">{gestion?.checkin?.length ?? 0}</p><p className="text-[10px] uppercase tracking-[0.1em] text-[#8B8BA8] font-semibold mt-1">{tr('ges.checkinBtn')}</p></div>
            <div className="card-premium p-3"><p className="text-lg font-bold text-white font-mono-num leading-none">{gestion?.generado ? tr('comun.si') : tr('comun.no')}</p><p className="text-[10px] uppercase tracking-[0.1em] text-[#8B8BA8] font-semibold mt-1">{tr('md.bracketListo')}</p></div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Link href={`/gestionar/${torneo.id}`} className="h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold flex items-center justify-center gap-2">{tr('ct.gestionarBracket')}</Link>
            <Link href={`/torneo/${torneo.id}`} className="h-11 rounded-xl bg-white/6 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2">{tr('ges.fichaPublica')}</Link>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 space-y-5">
        {/* Disputas pendientes (las abren los jugadores cuando no hay consenso) */}
        {disputasTorneo.map(d => (
          <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-[#FF6076]/40 bg-[#FF6076]/10 px-4 py-3 animate-slide-up-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6076]/20 text-[#FF6076] shrink-0"><AlertTriangle size={18} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{tr('md.disputaEn')} {d.mesa}</p>
              <p className="text-xs text-[#FFB3BD]">{conParams(tr('md.reclaman'), { a: d.a, b: d.b })}{d.mid ? tr('md.combateDelBracket') : ''}{tr('md.tuMarcador')}</p>
            </div>
            <button onClick={() => resolverConMarcador(d)} className="h-10 px-3.5 rounded-xl bg-[#FF6076] text-white text-[13px] font-bold shrink-0">
              {tr('md.ponerResultado')}
            </button>
          </div>
        ))}

        {/* Escritorio: plano de mesas a la izquierda + cola de combates a la derecha */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start space-y-5 lg:space-y-0">
        {/* Mesas del local */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <p className="eyebrow eyebrow-muted">{tr('md.mesas')} · {local?.nombre}</p>
              <div className="flex rounded-lg border border-white/10 bg-white/4 p-0.5">
                {([['plano', MapIcon], ['lista', List]] as const).map(([k, Ic]) => (
                  <button key={k} onClick={() => setVistaMesas(k)} aria-label={`Vista ${k}`}
                    className={cn('h-6 w-7 rounded-md flex items-center justify-center transition-colors', vistaMesas === k ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8]')}>
                    <Ic size={12} />
                  </button>
                ))}
              </div>
            </div>
            {enDirecto
              ? <p className="text-xs text-[#8B8BA8]"><span className="text-[#B6FF3A] font-bold font-mono-num">{enJuego}</span> {tr('md.enJuego')} · <span className="text-[#6FB0FF] font-bold font-mono-num">{libres}</span> {tr('md.libres')}</p>
              : <p className="text-xs text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{mesas.length}</span> {tr('md.mesasDelLocal')}</p>}
          </div>

          {vistaMesas === 'plano' && (
            <div>
              {/* El plano lo define la sede; los estados salen de los setups del torneo */}
              {pisosDe(mesas) > 1 && <div className="mb-2"><PisoTabs total={pisosDe(mesas)} activo={pisoVista} onPiso={setPisoVista} /></div>}
              <MapaMesas
                mesas={mesasDePiso(mesas, pisoVista)}
                estados={Object.fromEntries(setupsVista.map(s => [s.n, disputa?.mesa === s.n ? 'disputa' : s.estado === 'ocupado' ? 'ocupada' : s.estado === 'caido' ? 'caida' : 'libre'])) as Record<number, EstadoMesa>}
                ocupantes={enDirecto ? Object.fromEntries(setupsVista.filter(s => s.a && s.b).map(s => [s.n, `${s.a} vs ${s.b}`])) : undefined}
                seleccionada={mesaSel ?? undefined}
                onPick={m => setMesaSel(sel => sel === m.n ? null : m.n)}
              />
              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <LeyendaMesas conNeutra />
              </div>
              {mSel && (
                  <div className="mt-2.5 card-premium p-3.5 animate-slide-up-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-white">{tr('adm.mesa')} {mSel.n} <span className="text-[#8B8BA8] font-semibold">· {tr(TIPO_MESA[mSel.tipo])} · {mSel.plazas} {tr('adm.plazas').toLowerCase()}</span></p>
                      {estadoSel
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: ESTADO_MESA[estadoSel].color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_MESA[estadoSel].color }} /> {tr(ESTADO_MESA[estadoSel].clave)}
                          </span>
                        : <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8BA8]">{tr('em.fuera')}</span>}
                    </div>
                    {sSel?.estado === 'ocupado' && <p className="text-sm text-white font-semibold mb-2">{sSel.a} <span className="text-[#6B6B85]">vs</span> {sSel.b} · <span className="text-[#B6FF3A] font-mono-num text-[12px]">{fmt(sSel.seg ?? 0)}</span></p>}
                    {sSel ? (
                      <div className="flex flex-col gap-2">
                        {sSel.estado === 'libre' && <>
                          {/* Asignar exige directo; preparar la sala (caída/quitar), no */}
                          {enDirecto && <button onClick={() => { asignar(sSel.n); setMesaSel(null) }} className="w-full h-9 rounded-lg bg-[#4F8EF7]/15 text-[#6FB0FF] text-xs font-bold">{tr('md.asignar')}</button>}
                          <div className="flex gap-2">
                            <button onClick={() => toggleCaido(sSel.n)} className="flex-1 h-9 rounded-lg bg-white/6 text-[#FF6076] text-xs font-bold inline-flex items-center justify-center gap-1"><Flag size={12} /> {tr('md.marcarCaida')}</button>
                            <button onClick={() => quitarDelTorneo(sSel.n)} className="flex-1 h-9 rounded-lg bg-white/6 text-[#8B8BA8] hover:text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors"><X size={12} /> {tr('md.quitarTorneo')}</button>
                          </div>
                        </>}
                        {sSel.estado === 'ocupado' && (
                          <div className="flex gap-2">
                            <button onClick={() => { liberar(sSel.n); setMesaSel(null) }} className="flex-1 h-9 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-xs font-bold inline-flex items-center justify-center gap-1"><Check size={13} /> {tr('md.liberar')}</button>
                            <button onClick={() => { toggleCaido(sSel.n); setMesaSel(null) }} className="h-9 px-3 rounded-lg bg-white/6 text-[#FF6076] text-xs font-bold inline-flex items-center justify-center gap-1"><Flag size={12} /> {tr('em.caida')}</button>
                          </div>
                        )}
                        {sSel.estado === 'caido' && (
                          <div className="flex gap-2">
                            <button onClick={() => toggleCaido(sSel.n)} className="flex-1 h-9 rounded-lg bg-white/6 text-[#FF6076] text-xs font-bold inline-flex items-center justify-center gap-1"><RotateCcw size={12} /> {tr('adm.reactivar')}</button>
                            <button onClick={() => quitarDelTorneo(sSel.n)} className="flex-1 h-9 rounded-lg bg-white/6 text-[#8B8BA8] hover:text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors"><X size={12} /> {tr('md.quitarTorneo')}</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => anadirAlTorneo(mSel)} className="w-full h-9 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-xs font-bold inline-flex items-center justify-center gap-1"><Plus size={13} /> {tr('md.anadirTorneo')}</button>
                    )}
                  </div>
              )}
            </div>
          )}

          <div className={cn('grid grid-cols-2 gap-2.5', vistaMesas !== 'lista' && 'hidden')}>
            {setupsVista.map(s => {
              const c = COLORS[s.estado]
              return (
                <div key={s.n} className="card-premium p-3" style={{ borderColor: s.estado === 'caido' ? 'rgba(255,96,118,0.3)' : undefined }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">{tr('adm.mesa')} {s.n}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} /> {tr(c.clave)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] text-[#8B8BA8]">
                    {s.stream ? <span className="inline-flex items-center gap-1 text-[#9B82FF] font-semibold"><Tv size={11} /> Stream</span> : <span>{tr(s.tipo)}</span>}
                  </div>
                  {s.estado === 'ocupado' ? (
                    <div>
                      <p className="text-sm text-white font-semibold truncate">{s.a} <span className="text-[#6B6B85]">vs</span> {s.b}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#B6FF3A] font-mono-num"><Clock size={10} /> {fmt(s.seg ?? 0)}</p>
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={() => liberar(s.n)} className="flex-1 h-8 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-[11px] font-bold inline-flex items-center justify-center gap-1"><Check size={12} /> {tr('md.liberar')}</button>
                        <button onClick={() => toggleCaido(s.n)} aria-label="Marcar caído" className="h-8 w-8 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><Flag size={13} /></button>
                      </div>
                    </div>
                  ) : s.estado === 'libre' ? (
                    <div className="flex gap-1.5">
                      {/* Asignar exige directo; caída/quitar preparan la sala también antes */}
                      {enDirecto
                        ? <button onClick={() => asignar(s.n)} className="flex-1 h-8 rounded-lg bg-[#4F8EF7]/15 text-[#6FB0FF] text-[12px] font-bold hover:bg-[#4F8EF7]/25 transition-colors">{tr('md.asignar')}</button>
                        : <button onClick={() => toggleCaido(s.n)} aria-label={tr('md.marcarCaida')} title={tr('md.marcarCaida')} className="flex-1 h-8 rounded-lg bg-white/6 text-[#FF6076] text-[12px] font-bold inline-flex items-center justify-center gap-1"><Flag size={12} /> {tr('md.marcarCaida')}</button>}
                      {enDirecto && <button onClick={() => toggleCaido(s.n)} aria-label={tr('md.marcarCaida')} title={tr('md.marcarCaida')} className="h-8 w-8 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><Flag size={13} /></button>}
                      <button onClick={() => quitarDelTorneo(s.n)} aria-label={tr('md.quitarTorneo')} title={tr('md.quitarTorneo')} className="h-8 w-8 rounded-lg bg-white/6 text-[#8B8BA8] hover:text-white inline-flex items-center justify-center transition-colors"><X size={13} /></button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleCaido(s.n)} className="flex-1 h-8 rounded-lg bg-white/6 text-[#FF6076] text-[12px] font-bold inline-flex items-center justify-center gap-1"><RotateCcw size={12} /> {tr('adm.reactivar')}</button>
                      <button onClick={() => quitarDelTorneo(s.n)} aria-label={tr('md.quitarTorneo')} title={tr('md.quitarTorneo')} className="h-8 w-8 rounded-lg bg-white/6 text-[#8B8BA8] hover:text-white inline-flex items-center justify-center transition-colors"><X size={13} /></button>
                    </div>
                  )}
                </div>
              )
            })}
            {/* Mesas del local FUERA del torneo: re-incorporables con un toque
                (también ANTES del directo, para dejar la sala preparada) */}
            {mesas.filter(m => !setupsVista.some(s => s.n === m.n)).map(m => (
              <div key={`fuera-${m.n}`} className="card-premium p-3 opacity-75">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white">{tr('adm.mesa')} {m.n}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8B8BA8]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/25" /> {tr('em.fuera')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-[#8B8BA8]"><span>{tr(TIPO_MESA[m.tipo])}</span></div>
                <button onClick={() => anadirAlTorneo(m)} className="w-full h-8 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-[12px] font-bold inline-flex items-center justify-center gap-1 hover:bg-[#B6FF3A]/25 transition-colors"><Plus size={12} /> {tr('md.anadirTorneo')}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Cola */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="eyebrow eyebrow-muted inline-flex items-center gap-1.5">{enDirecto ? tr('md.cola') : tr('md.colaPrevista')}
              {bracketReal && <span className="inline-flex items-center gap-1 normal-case tracking-normal px-1.5 h-5 rounded-md bg-[#B6FF3A]/12 text-[#B6FF3A] text-[10px] font-bold"><ListTree size={10} /> {tr('md.bracketRealTag')}</span>}
            </p>
            <p className="text-xs text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{colaViva.length}</span> {tr('md.listos')} {pausada && <span className="text-[#FF8A5C]">{tr('md.pausadaTag')}</span>}</p>
          </div>

          {/* Sets del torneo, editables EN VIVO por el TO (Bo1/Bo3/Bo5 y desde
              qué ronda sube): gobiernan lo que valen los marcadores. */}
          <div className="mb-3 card-premium p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('md.setsMejorDe')}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border border-white/10 bg-white/4 p-0.5">
                {[1, 3, 5].map(n => (
                  <button key={n} onClick={() => setGestion(torneoId, { bo: { ...bo, base: n } })}
                    className={cn('h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors', bo.base === n ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8]')}>Bo{n}</button>
                ))}
              </div>
              <span className="text-[10px] text-[#8B8BA8]">→</span>
              <div className="flex rounded-lg border border-white/10 bg-white/4 p-0.5">
                {[3, 5, 7].map(n => (
                  <button key={n} onClick={() => setGestion(torneoId, { bo: { ...bo, top: n } })}
                    className={cn('h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors', bo.top === n ? 'bg-[#E0BE63] text-[#0A0A0F]' : 'text-[#8B8BA8]')}>Bo{n}</button>
                ))}
              </div>
              <div className="flex rounded-lg border border-white/10 bg-white/4 p-0.5">
                {opcionesDesde(tamCuadro).map(k => (
                  <button key={k} onClick={() => setGestion(torneoId, { bo: { ...bo, desde: k } })}
                    className={cn('h-7 px-2 rounded-md text-[10px] font-bold transition-colors', bo.desde === k ? 'bg-white/15 text-white' : 'text-[#8B8BA8]')}>{k === 'semis' ? 'Semis' : `Top ${k.slice(3)}`}</button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-[#8B8BA8]">Bo{bo.base} {tr('md.alPrincipio')} Bo{bo.top} {tr('ges.desdeRonda')} {etiquetaDesde(bo.desde)}. {tr('md.aplicaMomento')}</p>
          </div>
          <div className="space-y-2">
            {colaViva.length === 0 && (
              <p className="text-sm text-[#8B8BA8] text-center py-4">
                {bracketReal ? tr('md.colaVaciaReporta')
                  : enDirecto ? tr('md.colaVaciaAvanzar')
                  : tr('md.sinCombatesGenera')}
              </p>
            )}
            {colaViva.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white/4 border border-white/8 px-3.5 py-2.5 stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 8) * 40}ms` }}>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 text-[#8B8BA8] text-xs font-bold shrink-0 font-mono-num">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{m.a} <span className="text-[#6B6B85]">vs</span> {m.b}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{m.ronda === 'Reasignar' ? tr('md.reasignar') : m.ronda}</p>
                </div>
                <span className={cn('text-[11px] font-semibold shrink-0', i === 0 ? 'text-[#B6FF3A]' : 'text-[#8B8BA8]')}>{i === 0 ? tr('md.siguiente') : tr('md.listo')}</span>
              </div>
            ))}
          </div>
        </div>
        </div>{/* fin grid escritorio */}

        {/* BRACKET EN DIRECTO: el cuadro real, marcando qué combate se juega en
            qué mesa AHORA. Avanza solo con los reportes por consenso de los
            jugadores, tus marcadores manuales al liberar mesa y las disputas. */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="eyebrow eyebrow-muted inline-flex items-center gap-1.5">{tr('md.bracketDirecto')}
              {bracketReal && <span className="dot-live" />}
            </p>
            {bracketReal && <p className="text-xs text-[#8B8BA8]">{tr('md.seActualiza')}</p>}
          </div>
          {!bracketReal ? (
            <div className="card-premium p-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#9B82FF]/15 text-[#B9A6FF] shrink-0"><ListTree size={18} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{tr('md.sinBracketGenerado')}</p>
                <p className="text-xs text-[#8B8BA8]">{tr('md.generaCuadro')}</p>
              </div>
              {torneo && <Link href={`/gestionar/${torneo.id}`} className="h-9 px-3.5 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold flex items-center shrink-0">{tr('ges.generarBracket')}</Link>}
            </div>
          ) : (
            <BracketVivo rondas={rondasVivas} puntos={gestion?.puntos ?? {}} setups={setups} enJuego={setsVivos}
              disputaMids={disputasTorneo.map(d => d.mid).filter(Boolean) as string[]}
              pj={pjVivo} juegoId={juegoTorneo} />
          )}
        </div>
      </div>

      {/* Liberar con partida activa: el TO decide primero — establecer el
          resultado (abre el marcador) o cancelar la partida (vuelve a la cola). */}
      {confirmLiberar && (
        <LiberarSheet r={confirmLiberar}
          onResultado={() => { setReportando(confirmLiberar); setConfirmLiberar(null) }}
          onCancelarPartida={() => cancelarPartida(confirmLiberar)}
          onCerrar={() => setConfirmLiberar(null)} />
      )}

      {/* Resultado manual del TO al liberar una mesa: marcador set a set que
          se escribe en el bracket en vivo (2-1, 3-1, lo que sea). */}
      {reportando && (
        <ResultadoSheet r={reportando} boMax={bo.top}
          onGuardar={(sa, sb) => guardarResultado(reportando, sa, sb)}
          onCerrar={() => setReportando(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#1D2230] border border-white/12 text-white text-sm font-semibold shadow-xl animate-slide-up-sm flex items-center gap-2">
          <Check size={15} className="text-[#B6FF3A]" /> {toast}
        </div>
      )}
    </div>
  )
}

// Hoja de decisión al liberar una mesa con partida activa: establecer el
// resultado (flujo normal, abre el marcador) o cancelar la partida — como si
// nunca se hubiera jugado: el combate vuelve a la cola y la mesa queda libre.
function LiberarSheet({ r, onResultado, onCancelarPartida, onCerrar }: {
  r: { n: number; a: string; b: string; mid?: string }
  onResultado: () => void
  onCancelarPartida: () => void
  onCerrar: () => void
}) {
  const { t: tr } = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onCerrar} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
        <p className="text-lg font-bold text-white text-display">{tr('md.liberar')} · {tr('adm.mesa')} {r.n}</p>
        <p className="mt-0.5 text-[12px] text-[#8B8BA8]"><span className="text-white font-semibold">{r.a}</span> vs <span className="text-white font-semibold">{r.b}</span> · {tr('md.liberarPregunta')}</p>
        <div className="mt-4 space-y-2.5">
          <button onClick={onResultado} className="w-full rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] p-4 text-left flex items-center gap-3">
            <ClipboardList size={20} className="shrink-0" />
            <span className="min-w-0">
              <span className="block font-bold text-[15px]">{tr('md.establecerResultado')}</span>
              <span className="block text-[12px] opacity-75">{tr('md.establecerResultadoSub')}</span>
            </span>
          </button>
          <button onClick={onCancelarPartida} className="w-full rounded-2xl bg-white/6 border border-white/12 text-white p-4 text-left flex items-center gap-3 hover:bg-white/10 transition-colors">
            <Undo2 size={20} className="shrink-0 text-[#FF8A5C]" />
            <span className="min-w-0">
              <span className="block font-bold text-[15px]">{tr('md.cancelarPartida')}</span>
              <span className="block text-[12px] text-[#8B8BA8]">{tr('md.cancelarPartidaSub')}</span>
            </span>
          </button>
        </div>
        <button onClick={onCerrar} className="mt-3 w-full h-10 rounded-xl bg-white/6 text-[#8B8BA8] text-[13px] font-semibold">{tr('adm.cancelar')}</button>
      </div>
    </div>
  )
}

// Hoja de resultado manual: el TO pone el marcador (juegos ganados por lado) y
// el ganador sale del marcador. En una DISPUTA se resuelve fijando el tanteo.
function ResultadoSheet({ r, boMax, onGuardar, onCerrar }: {
  r: { n: number; a: string; b: string; mid?: string; disputaId?: string }
  boMax: number
  onGuardar: (sa: number, sb: number) => void
  onCerrar: () => void
}) {
  const { t: tr } = useT()
  const [sa, setSa] = useState(0)
  const [sb, setSb] = useState(0)
  const tope = Math.ceil(boMax / 2) + 1  // margen por si el TO usa otro Bo
  const valido = sa !== sb
  const ganador = sa > sb ? r.a : r.b

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onCerrar} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
        <p className="text-lg font-bold text-white text-display">{r.disputaId ? `${tr('em.disputa')} · ${tr('adm.mesa')} ${r.n}` : `${tr('md.resultado')} · ${tr('adm.mesa')} ${r.n}`}</p>
        <p className="mt-0.5 text-[12px] text-[#8B8BA8]">{r.disputaId
          ? tr('md.disputaExplica')
          : `${tr('md.fijaMarcador')}${r.mid ? '' : tr('md.noBracketReal')}`}</p>

        <div className="mt-4 flex items-stretch gap-3">
          <MarcadorLado nombre={r.a} v={sa} ganando={valido && sa > sb} tope={tope} set={setSa} />
          <span className="self-center text-[#6B6B85] font-bold">vs</span>
          <MarcadorLado nombre={r.b} v={sb} ganando={valido && sb > sa} tope={tope} set={setSb} />
        </div>

        {/* Atajos de marcador típicos según los sets configurados */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {[[2, 0], [2, 1], [3, 0], [3, 1], [3, 2]].map(([x, y]) => (
            <button key={`${x}-${y}`} onClick={() => { setSa(x); setSb(y) }}
              className="px-2.5 h-8 rounded-lg bg-white/5 border border-white/10 text-[12px] font-bold text-[#B8B8CC] hover:text-white font-mono-num">{x}–{y}</button>
          ))}
          <button onClick={() => { setSa(sb); setSb(sa) }} className="px-2.5 h-8 rounded-lg bg-white/5 border border-white/10 text-[12px] font-bold text-[#B8B8CC] hover:text-white">{tr('md.invertir')}</button>
        </div>

        <button onClick={() => valido && onGuardar(sa, sb)} disabled={!valido}
          className="mt-4 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">
          {!valido ? tr('md.ponMarcador')
            : r.disputaId ? conParams(tr('md.resolverGana'), { ganador, marcador: `${Math.max(sa, sb)}–${Math.min(sa, sb)}` })
            : conParams(tr('md.guardarGana'), { ganador, marcador: `${Math.max(sa, sb)}–${Math.min(sa, sb)}` })}
        </button>
        <button onClick={onCerrar} className="mt-2 w-full h-10 rounded-xl bg-white/6 text-[#8B8BA8] text-[13px] font-semibold">{tr('adm.cancelar')}</button>
      </div>
    </div>
  )
}

// Bracket EN DIRECTO del modo directo: columnas por ronda; cada combate marca
// su estado real — jugándose en una mesa (con nº), en disputa, jugado (con
// marcador y ganador), listo para asignar o esperando rival de la ronda previa.
function BracketVivo({ rondas, puntos, setups, disputaMids, pj, juegoId, enJuego }: {
  rondas: MatchB[][]
  puntos: Record<string, { a: number; b: number }>
  setups: Setup[]
  disputaMids: string[]
  // Sets arrancados desde la MESA por los jugadores (mundo): crono en vivo
  enJuego?: Record<string, number>
  pj?: Record<string, { A: string[]; B: string[] }>
  juegoId?: string
}) {
  const { t: tr, idioma } = useT()
  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-4 min-w-max items-start">
        {rondas.map((matches, ri) => (
          <div key={ri} className="w-60 shrink-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold mb-2">{nombreRonda(matches.length, idioma)}</p>
            <div className="space-y-2" style={{ paddingTop: ri > 0 ? ri * 14 : 0 }}>
              {matches.map(m => {
                const enMesa = setups.find(s => s.mid === m.id && s.estado === 'ocupado')
                const p = puntos[m.id]
                const disputado = disputaMids.includes(m.id)
                const jugado = !!m.ganador
                const iniSet = !jugado && !disputado && !enMesa ? enJuego?.[m.id] : undefined
                const listo = !!m.a && !!m.b && !jugado
                return (
                  <div key={m.id}
                    className={`rounded-xl border px-3 py-2 ${disputado ? 'border-[#FF6076]/60 bg-[#FF6076]/[0.08]' : enMesa ? 'border-[#B6FF3A]/60 bg-[#B6FF3A]/[0.07]' : jugado ? 'border-white/10 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]'}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {disputado ? <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#FF6076]"><AlertTriangle size={9} /> {tr('em.disputa')}</span>
                        : enMesa ? <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#B6FF3A]"><span className="dot-live" /> {tr('md.jugandose')} {enMesa.n}</span>
                        : iniSet ? <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#B6FF3A]"><span className="dot-live" /> {tr('md.jugandose')}</span>
                        : jugado ? <span className="text-[9px] font-black uppercase tracking-wider text-[#8B8BA8]">{tr('md.jugado')}</span>
                        : listo ? <span className="text-[9px] font-black uppercase tracking-wider text-[#6FB0FF]">{tr('md.enColaTag')}</span>
                        : <span className="text-[9px] font-black uppercase tracking-wider text-[#6B6B85]">{tr('md.esperandoRival')}</span>}
                      {enMesa?.seg != null ? <span className="text-[10px] font-mono-num text-[#B6FF3A]">{fmt(enMesa.seg)}</span> : iniSet ? <CronoSet inicio={iniSet} /> : null}
                    </div>
                    {(['a', 'b'] as const).map(lado => {
                      const jug = m[lado]
                      const gana = m.ganador === lado
                      const pers = jugado && juegoId ? pj?.[m.id]?.[lado === 'a' ? 'A' : 'B'] : undefined
                      return (
                        <div key={lado} className="flex items-center justify-between gap-2">
                          <span className={`min-w-0 flex items-center gap-1 text-[13px] ${gana ? 'font-bold text-[#B6FF3A]' : jug ? 'text-white font-semibold' : 'text-[#6B6B85]'}`}>
                            <span className="truncate">{jug?.nombre ?? '—'}</span>
                            {/* Tag de crew (F6): solo en torneo y ranking */}
                            <CrewTag nombre={jug?.nombre} juego={juegoId} />
                            {juegoId && <PersonajesDeLado juegoId={juegoId} nombres={pers} px={14} />}
                          </span>
                          <span className={`text-[13px] font-bold font-mono-num shrink-0 ${gana ? 'text-[#B6FF3A]' : 'text-[#8B8BA8]'}`}>
                            {p ? p[lado] : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Marcador de un lado del combate (componente de módulo, no se crea en render)
function MarcadorLado({ nombre, v, ganando, tope, set }: {
  nombre: string; v: number; ganando: boolean; tope: number; set: (f: (x: number) => number) => void
}) {
  return (
    <div className={`flex-1 rounded-2xl border p-3.5 text-center transition-colors ${ganando ? 'border-[#B6FF3A]/60 bg-[#B6FF3A]/8' : 'border-white/10 bg-white/4'}`}>
      <p className="text-sm font-bold text-white truncate">{nombre}</p>
      <p className="mt-1 text-4xl font-bold text-white font-mono-num leading-none">{v}</p>
      <div className="mt-2.5 flex items-center justify-center gap-2">
        <button onClick={() => set(x => Math.max(0, x - 1))} aria-label={`Menos juegos de ${nombre}`} className="h-9 w-9 rounded-lg bg-white/8 text-white font-bold">−</button>
        <button onClick={() => set(x => Math.min(tope, x + 1))} aria-label={`Más juegos de ${nombre}`} className="h-9 w-9 rounded-lg bg-white/8 text-white font-bold">+</button>
      </div>
    </div>
  )
}
