'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  getTorneo, getOrganizador, getLocal, JUEGOS, rankingPorJuego,
  precioEspectador, esperaDe, plantillaDe,
} from '@/lib/torneos/sample'
import { CREW_USUARIO, puntuacionCrew, nivelCrew } from '@/lib/torneos/crews'
import { CrewEmblema } from '@/components/todh/CrewEmblema'
import { useDemoStore, nombreCuentaDemo, tagCuentaDemo } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { MiniPerfilCuenta, AvatarCuenta } from '@/components/todh/MiniPerfilCuenta'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { GameIcon } from '@/components/todh/GameIcon'
import { FillBar, CountUp } from '@/components/ui/CountUp'
import { InscripcionSheet } from '@/components/todh/InscripcionSheet'
import { RangoChip } from '@/components/todh/RangoChip'
import { rangoDe } from '@/lib/torneos/rangos'
import { TierSheet, tieneAcceso } from '@/components/todh/TierSheet'
import { ChatTorneoSheet } from '@/components/todh/ChatTorneo'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { MiniLocal } from '@/components/todh/MiniLocal'
import { PersonajeChip } from '@/components/todh/PersonajeChip'
import { VideoEmbed } from '@/components/todh/VideoEmbed'
import { ReglasTorneo } from '@/components/todh/ReglasTorneo'
import { topePuntos, puntosPorPuesto, CATEGORIAS } from '@/lib/torneos/puntos'
import { puedeCancelarConDevolucion } from '@/lib/torneos/cancelacion'
import { useT, conParams } from '@/lib/i18n'
import type { Jugador } from '@/lib/torneos/sample'
import {
  ArrowLeft, Calendar, MapPin, Trophy, Users, Lock, Radio, Share2, ListTree,
  Check, Star, Coins, Wifi, X,
} from 'lucide-react'

// Comisión de plataforma por tramo (la paga el jugador encima del precio)
// Comisión variable de la reunión 5-jul: crece con el tamaño (más difícil de
// organizar y más aporta la app). Gratis: 0.
function comision(precio: number, inscritos: number): { pct: number; importe: number } {
  if (precio === 0) return { pct: 0, importe: 0 }
  const pct = inscritos <= 32 ? 6 : inscritos <= 128 ? 8 : 10
  return { pct, importe: +(precio * pct / 100).toFixed(2) }
}

// Reparto del bote por puesto (preset por defecto)
function repartoBote(bote: number): { puesto: string; pct: number; importe: number }[] {
  const presets = [
    { puesto: '1º', pct: 70 }, { puesto: '2º', pct: 20 }, { puesto: '3º', pct: 10 },
  ]
  return presets.map(p => ({ ...p, importe: Math.round(bote * p.pct / 100) }))
}

export default function TorneoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [sheet, setSheet] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [verParts, setVerParts] = useState(false)
  const [selJugador, setSelJugador] = useState<Jugador | null>(null)
  const [verSede, setVerSede] = useState(false)

  const { t: tr, idioma } = useT()
  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const override = useDemoStore(s => s.editados[id])
  const cancelado = useDemoStore(s => s.cancelados.includes(id))
  const base = getTorneo(id) || creado
  const t = base ? { ...base, ...(override || {}) } : undefined
  const inscrito = useDemoStore(s => s.inscritos.includes(id))
  const inscribir = useDemoStore(s => s.inscribir)
  const enEspera = useDemoStore(s => s.listaEspera.includes(id))
  const promovidos = useDemoStore(s => s.entradosEspera[id]?.length ?? 0)
  const bajas = useDemoStore(s => s.gestion[id]?.bajas?.length ?? 0)
  // Mundo compartido (30-08): cuentas demo inscritas a ESTE torneo (por email,
  // sin la propia — la propia ya cuenta como `inscrito`). Suman en el contador,
  // en el «lleno» y salen como participantes con su perfil público.
  const inscCuentasRaw = useDemoStore(s => s.inscripcionesCuentas[id])
  const perfilesCuentas = useDemoStore(s => s.perfilesCuentas)
  const miEmail = useSesionStore(s => s.sesion?.email?.toLowerCase() ?? null)
  const cuentasInscritas = (inscCuentasRaw ?? []).filter(e => e !== miEmail)
  const [selCuenta, setSelCuenta] = useState<string | null>(null)
  const apuntarEspera = useDemoStore(s => s.apuntarEspera)
  const salirEspera = useDemoStore(s => s.salirEspera)
  const desinscribir = useDemoStore(s => s.desinscribir)
  const esEspectador = useDemoStore(s => s.entradasEspectador.includes(id))
  const inscribirEspectador = useDemoStore(s => s.inscribirEspectador)
  const [modoSheet, setModoSheet] = useState<'jugar' | 'ver'>('jugar')
  const [cancelarOpen, setCancelarOpen] = useState(false)
  // ── Crews (F6): inscripción por equipos ──
  const crews = useDemoStore(s => s.crews)
  const cupo = useDemoStore(s => s.crewTorneo[id])
  const abrirInscripcionCrew = useDemoStore(s => s.abrirInscripcionCrew)
  const confirmarPlazaCrew = useDemoStore(s => s.confirmarPlazaCrew)
  const [eligeCrew, setEligeCrew] = useState(false)
  // ?crew={id} llega desde la convocatoria del grupo de chat (sin useSearchParams
  // para no exigir un límite de Suspense: se lee del navegador tras montar).
  const [crewParam, setCrewParam] = useState<string | null>(null)
  useEffect(() => {
    setCrewParam(new URLSearchParams(window.location.search).get('crew'))
  }, [id])
  // Los 1-2 miembros seed pagan su plaza solos a los pocos segundos de abrirse
  // el cupo (patrón del rival demo de F5): el estado X/N avanza en vivo.
  const cupoCrew = cupo ? crews.find(c => c.id === cupo.crewId) : undefined
  useEffect(() => {
    if (!cupo || !cupoCrew) return
    const seeds = cupo.inscritos.filter(m => m !== CREW_USUARIO)
    if (seeds.length >= 2) return
    const siguiente = cupoCrew.miembros.find(m => m !== CREW_USUARIO && !cupo.inscritos.includes(m))
    if (!siguiente) return
    const timer = setTimeout(() => confirmarPlazaCrew(id, siguiente), seeds.length === 0 ? 2600 : 5200)
    return () => clearTimeout(timer)
  }, [cupo, cupoCrew, id, confirmarPlazaCrew])
  const [tierSheet, setTierSheet] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const tierUsuario = useDemoStore(s => s.tierUsuario)
  // Una sede entra a la ficha como ANFITRIÓN: nunca se inscribe ni compra
  // entrada, así que no ve el CTA ni la ventana de inscripción (solo jugadores).
  const esSede = useSesionStore(s => s.sesion?.rol === 'local')

  if (!t) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Trophy size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">{tr('ges.torneoNoEncontrado')}</p>
        <Link href="/explorar" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">{tr('tf.volverExplorar')}</Link>
      </div>
    )
  }

  const juego = JUEGOS[t.juego]
  const org = t.organizadorId ? getOrganizador(t.organizadorId) : undefined
  const local = t.localId ? getLocal(t.localId) : undefined
  // Plazas ocupadas reales: inscritos de muestra − bajas del TO + promovidos de
  // la cola (esto alimenta los participantes del pool); las cuentas demo
  // inscritas suman en el EFECTIVO (contador, % y «lleno») y el usuario aparte.
  const ocupadas = t.inscritos - bajas + promovidos
  const ocupadasEf = ocupadas + cuentasInscritas.length
  const completo = ocupadasEf >= t.plazas
  const inscritosVis = ocupadasEf + (inscrito ? 1 : 0)
  // Torneo EN DIRECTO (efectivo: de muestra o iniciado por el TO): las
  // inscripciones están CERRADAS — solo queda la entrada de espectador.
  const enVivo = !!t.enDirecto && !cancelado
  // Cola de espera pendiente (muestra) + el usuario si está apuntado
  const colaPendiente = Math.max(0, esperaDe(t).length - promovidos) + (enEspera ? 1 : 0)
  const puestoEspera = Math.max(0, esperaDe(t).length - promovidos) + 1
  const pct = Math.min(100, Math.round((inscritosVis / t.plazas) * 100))
  const com = comision(t.precio, t.inscritos)
  const totalJugador = t.precio + com.importe
  const pVer = precioEspectador(t)
  // ── Crews (F6): un torneo de un juego con plantilla 'equipos' ofrece la
  // inscripción desde una crew del usuario de ESE juego. El cupo son las
  // plazas del equipo (tamGrupo de la plantilla).
  const esEquipos = plantillaDe(t.juego).modo === 'equipos'
  const misCrewsJuego = crews.filter(c => c.juego === t.juego && c.miembros.includes(CREW_USUARIO))
  const plazasCupo = plantillaDe(t.juego).tamGrupo
  // Crew con la que va la inscripción del usuario: la del cupo abierto o la del
  // enlace de la convocatoria (?crew=), siempre que sea suya y de este juego.
  const crewSheet = (cupoCrew && cupoCrew.miembros.includes(CREW_USUARIO) ? cupoCrew : undefined)
    ?? misCrewsJuego.find(c => c.id === crewParam)
  // Solo tantos participantes como inscritos reales (un torneo recién creado
  // con 0 inscritos no puede enseñar gente ni presumir de tier)
  const participantes = rankingPorJuego(t.juego).slice(0, Math.min(6, ocupadas))
  // Tier dinámico del torneo (reunión 5-jul): lo fijan sus inscritos top
  const grupos = participantes.map(p => rangoDe(p.rating).grupo)
  const tierTorneo = participantes.length >= 3 && grupos.filter(g => g === 'S' || g === 'A').length >= 3 ? 'Platino'
    : participantes.length >= 3 && grupos.filter(g => g === 'S' || g === 'A' || g === 'B').length >= 3 ? 'Oro' : null
  const TIER_TORNEO_COLOR: Record<string, string> = { Oro: '#E0BE63', Platino: '#67E8F9' }

  async function compartir() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) await navigator.share({ title: t!.nombre, url })
      else { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1800) }
    } catch { /* cancelado */ }
  }

  // Torneo lleno → a la cola de espera (no a inscritos): la incoherencia que
  // había era que "lista de espera" te daba plaza y QR como a un inscrito.
  // En directo NO se confirma nada: las inscripciones están cerradas.
  function confirmarInscripcion() {
    if (enVivo) { setSheet(false); return }
    if (completo) apuntarEspera(t!.id, t!.nombre, puestoEspera)
    else inscribir(t!.id, t!.nombre, crewSheet?.id)
    setSheet(false)
  }
  function confirmarEspectador() {
    inscribirEspectador(t!.id, t!.nombre)
    setSheet(false)
  }
  function abrirSheet(modo: 'jugar' | 'ver') {
    setModoSheet(modo)
    setSheet(true)
  }

  // Botón de inscripción, reutilizado en la barra fija (móvil) y en la columna
  // lateral sticky (escritorio).
  const ctaEspectador = esSede ? null : !cancelado && pVer !== null && !inscrito ? (
    esEspectador ? (
      <Link href="/entradas" className="mt-2 w-full h-10 rounded-xl bg-white/6 border border-white/12 text-[#B8B8CC] text-[13px] font-semibold flex items-center justify-center gap-1.5">
        <Check size={14} className="text-[#B6FF3A]" /> {tr('esp.enCartera')}
      </Link>
    ) : (
      <button onClick={() => abrirSheet('ver')}
        className="mt-2 w-full h-10 rounded-xl bg-white/6 border border-white/12 text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors">
        👀 {tr('esp.soloVerlo')} · {pVer === 0 ? tr('torneo.gratis') : `${pVer}€`}
      </button>
    )
  ) : null

  const ctaBtn = esSede ? null : cancelado ? (
    <div className="w-full h-14 rounded-2xl bg-[#FF6B6B]/12 border border-[#FF6B6B]/40 text-[#FF8A8A] font-bold flex items-center justify-center gap-2">{tr('tf.canceladoReembolso')}</div>
  ) : inscrito ? (
    <div>
      <Link href="/entradas" className="w-full h-14 rounded-2xl bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 text-[#B6FF3A] font-bold flex items-center justify-center gap-2"><Check size={18} /> {tr('tf.inscritoCartera')}</Link>
      <button onClick={() => setCancelarOpen(true)}
        className="mt-1.5 w-full text-center text-[11px] text-[#8B8BA8] font-semibold hover:text-[#FF8A8A] transition-colors">{tr('espera.cancelarInsc')}</button>
    </div>
  ) : enVivo ? (
    // Regla (30-08): un torneo EN DIRECTO no admite inscripciones nuevas. El
    // CTA queda deshabilitado con el motivo claro; ver de espectador sí sigue.
    <div className="w-full h-14 rounded-2xl bg-[#E63E54]/10 border border-[#E63E54]/40 text-[#FF8A8A] font-bold text-[14px] flex items-center justify-center gap-2">
      <span className="badge-live shrink-0">Live</span> {tr('mc.liveCerrado')}
    </div>
  ) : enEspera ? (
    <div className="w-full rounded-2xl bg-[#FF8A5C]/10 border border-[#FF8A5C]/40 p-3.5">
      <p className="text-[#FF8A5C] font-bold text-sm flex items-center gap-1.5">⏳ {tr('espera.enLista')} · {tr('espera.puesto')} {puestoEspera}</p>
      <p className="mt-1 text-[11px] text-[#B8B8CC] leading-relaxed">{tr('espera.aviso')}</p>
      <button onClick={() => salirEspera(t!.id)} className="mt-2 text-[11px] text-[#8B8BA8] font-semibold hover:text-white transition-colors">{tr('espera.salir')}</button>
    </div>
  ) : t.vip && !tieneAcceso(tierUsuario, t.vip) ? (
    <button onClick={() => setTierSheet(true)} className="w-full h-14 rounded-2xl bg-white/8 border border-[#D4A84B]/40 text-[#E0BE63] font-bold flex items-center justify-center gap-2 hover:bg-white/12 transition-colors">
      <Lock size={16} /> {tr('tier.desbloquea')} {t.vip} · {tr('tier.desbloquealo')}
    </button>
  ) : completo ? (
    <button onClick={() => abrirSheet('jugar')} className="w-full h-14 rounded-2xl bg-[#FF8A5C]/15 border border-[#FF8A5C]/40 text-[#FF8A5C] font-bold">
      {tr('tf.apuntarmeEspera')}{colaPendiente > 0 ? ` · ${colaPendiente} ${tr('tf.enCola')}` : ''}
    </button>
  ) : (
    <button onClick={() => abrirSheet('jugar')} className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform">
      {tr('torneo.inscribirme')} · {totalJugador === 0 ? tr('torneo.gratis') : `${totalJugador}€`}
    </button>
  )

  // Norma general de cancelaciones (F7), visible junto al CTA/estado de inscrito
  const politicaCancel = !esSede && !cancelado && t.precio > 0 ? (
    <p className="mt-2 text-[10px] text-[#8B8BA8] text-center leading-snug">{tr('canc.politica')}</p>
  ) : null

  // CTA/estado de la inscripción POR EQUIPOS (F6): si el juego se juega en
  // equipos y tienes crew de ese juego, puedes abrir el cupo (avisa al grupo de
  // chat de la crew); abierto, la ficha enseña el cupo avanzando en vivo.
  const ctaCrew = esSede || cancelado || !esEquipos || enVivo ? null : cupo && cupoCrew ? (
    <div className="mt-2 w-full rounded-2xl border p-3.5" style={{ borderColor: `${cupoCrew.color ?? '#B6FF3A'}45`, background: `${cupoCrew.color ?? '#B6FF3A'}0D` }}>
      <div className="flex items-center gap-2.5">
        <CrewEmblema nivel={nivelCrew(cupoCrew)} variant="tile" size={34} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white truncate">
            {cupoCrew.emoji && <span className="mr-1">{cupoCrew.emoji}</span>}{cupoCrew.nombre} <span style={{ color: cupoCrew.color ?? '#B6FF3A' }}>#{cupoCrew.tag}</span>
          </p>
          <p className="text-[11px] text-[#B8B8CC] font-mono-num">{cupo.inscritos.length}/{plazasCupo} <span className="font-sans">{tr('crew.plazasConf')}</span></p>
        </div>
      </div>
      {cupo.inscritos.length > 0 && (
        <p className="mt-1.5 text-[11px] text-[#8B8BA8] truncate">
          ✅ {cupo.inscritos.map(m => m === CREW_USUARIO ? tr('crew.tu') : m).join(' · ')}
        </p>
      )}
      {cupoCrew.miembros.includes(CREW_USUARIO) && (
        inscrito || cupo.inscritos.includes(CREW_USUARIO)
          ? <p className="mt-2 text-[12px] font-bold text-[#B6FF3A]">✓ {tr('crew.tuPlazaOk')}</p>
          : (
            <button onClick={() => abrirSheet('jugar')}
              className="mt-2 w-full h-10 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-[13px] font-bold">
              {tr('crew.pagarPlaza')} · {totalJugador === 0 ? tr('torneo.gratis') : `${totalJugador}€`}
            </button>
          )
      )}
    </div>
  ) : !inscrito && misCrewsJuego.length > 0 ? (
    <button onClick={() => setEligeCrew(true)}
      className="mt-2 w-full h-11 rounded-xl bg-white/6 border border-white/12 text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors">
      ⚔️ {tr('crew.inscribir')}
    </button>
  ) : null

  return (
    // Escritorio ANCHO (menos pasillos muertos a los lados) y con más aire
    // entre secciones: la ficha respira en vez de apilarlo todo.
    <div className="relative min-h-screen pb-28 lg:pb-12 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* Banner: el del torneo si lo tiene; si no, el keyart del juego */}
      <div className="relative h-56 lg:h-80 overflow-hidden lg:rounded-b-3xl">
        {t.banner
          ? <img src={t.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
          : <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0" />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.18) 10%, rgba(8,8,15,0.05) 34%, rgba(11,13,19,0.62) 62%, #0D0F15 96%)' }} />
        <div className="relative flex items-center justify-between px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <div className="flex gap-2">
            {t.enDirecto && (esSede
              ? <span className="inline-flex items-center gap-1 px-2.5 h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white"><Radio size={12} className="animate-pulse-heat" /> {tr('tf.enDirecto')}</span>
              : <Link href={`/torneo/${t.id}/directo`} className="inline-flex items-center gap-1 px-2.5 h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white"><Radio size={12} className="animate-pulse-heat" /> {tr('tf.enDirecto')}</Link>)}
            <button onClick={compartir} aria-label="Compartir" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white relative">
              <Share2 size={16} />
              {copiado && <span className="absolute -bottom-7 right-0 whitespace-nowrap text-[10px] font-semibold text-[#0A0A0F] bg-[#B6FF3A] px-2 py-0.5 rounded-md">{tr('tf.enlaceCopiado')}</span>}
            </button>
          </div>
        </div>
        <div className="absolute bottom-3 left-5 right-5 lg:left-6 lg:right-6">
          <div className="flex items-center gap-2 animate-slide-up-sm">
            {tierTorneo && (
              <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-black backdrop-blur-sm"
                style={{ background: `${TIER_TORNEO_COLOR[tierTorneo]}26`, color: TIER_TORNEO_COLOR[tierTorneo], border: `1px solid ${TIER_TORNEO_COLOR[tierTorneo]}66` }}>
                {conParams(tr('tf.tierBadge'), { tier: tierTorneo })}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold backdrop-blur-sm" style={{ background: `${juego.color}30`, color: juego.color, border: `1px solid ${juego.color}55` }}>
              <GameIcon juegoId={t.juego} size={14} /> {juego.nombre}
            </span>
            {t.categoria && t.categoria !== 'comunidad' && (
              <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm"
                style={{ background: `${CATEGORIAS[t.categoria].color}22`, color: CATEGORIAS[t.categoria].color, border: `1px solid ${CATEGORIAS[t.categoria].color}55` }}>
                ✦ {CATEGORIAS[t.categoria].corto}
              </span>
            )}
            {t.online && <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#4F8EF7]/25 text-[#7FB0FF] border border-[#4F8EF7]/40 backdrop-blur-sm"><Wifi size={10} /> Online</span>}
            {t.vip && <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/40 text-[#E0BE63] border border-[#D4A84B]/40 backdrop-blur-sm"><Lock size={10} /> {t.vip}</span>}
            {/* VODs N1: solo con el VOD definitivo del TO (videoUrl puede ser un directo muerto) */}
            {t.vodUrlFinal && <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#9B5DE5]/25 text-[#C9A6FF] border border-[#9B5DE5]/40 backdrop-blur-sm">🎬 {tr('vod.conVod')}</span>}
          </div>
          <h1 className="mt-2.5 text-[26px] lg:text-4xl font-bold text-white text-display tracking-tight leading-[1.08] animate-slide-up-sm" style={{ textShadow: '0 2px 24px rgba(0,0,0,.5)' }}>{t.nombre}</h1>
        </div>
      </div>

      {/* Escritorio: 2 columnas (contenido + tarjeta de inscripción sticky). Móvil: una columna. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12 lg:px-8 lg:items-start lg:mt-8">
      <div className="px-5 lg:px-0 lg:min-w-0">
        {/* «Inscrito» y «ver mi mesa» son estado DEL JUGADOR, no de la ficha:
            el aviso de mesa vive ahora en AvisoMiMesa (flotante, toda la app). */}
        {inscrito && !esSede && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-bold bg-[#B6FF3A]/15 text-[#B6FF3A] border border-[#B6FF3A]/40"><Check size={12} /> {tr('tf.inscritoChip')}</span>
          </div>
        )}

        {t.descripcion && <p className="mt-4 text-sm lg:text-[15px] text-[#B8B8CC] leading-relaxed max-w-prose">{t.descripcion}</p>}

        {/* Organizador */}
        {org && (
          <Link href={`/organizador/${org.id}`} className="mt-3 flex items-center gap-2.5 w-fit">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm text-[#0A0A0F]" style={{ background: org.color }}>{org.nombre[0]}</span>
            <span className="text-sm"><span className="text-[#8B8BA8]">{tr('tf.organiza')} </span><span className="text-white font-semibold">{org.nombre}</span></span>
            {org.verificado && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#4F8EF7] text-white text-[10px] font-bold">✓</span>}
            <span className="inline-flex items-center gap-0.5 text-[11px] text-[#E0BE63] font-semibold"><Star size={11} className="fill-[#E0BE63]" /> {org.rating}</span>
          </Link>
        )}
        {/* Co-organizadores (colaboración entre TOs) */}
        {t.coOrganizadores && t.coOrganizadores.length > 0 && (
          <p className="mt-1.5 text-[12px] text-[#8B8BA8]">
            {tr('tf.juntoA')} {t.coOrganizadores.map((cid, i) => {
              const co = getOrganizador(cid)
              return co ? <span key={cid}><Link href={`/organizador/${co.id}`} className="text-white font-semibold hover:text-[#B6FF3A]">{co.nombre}</Link>{i < t.coOrganizadores!.length - 1 ? ' × ' : ''}</span> : null
            })}
          </p>
        )}

        {/* Vídeo/directo del torneo: si el TO pegó una URL, va incrustado aquí */}
        {t.videoUrl ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="eyebrow eyebrow-muted">{t.enDirecto ? tr('torneo.emisionDirecto') : tr('torneo.videoTorneo')}</p>
              {t.enDirecto && !esSede && (
                <Link href={`/torneo/${t.id}/directo`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B6FF3A]">
                  <Radio size={12} /> {tr('tf.abrirDirecto')}
                </Link>
              )}
            </div>
            <VideoEmbed url={t.videoUrl} titulo={t.nombre} className="rounded-2xl border border-white/10" />
            {t.enDirecto && t.viendo ? <p className="mt-1.5 text-[11px] text-[#8B8BA8] font-mono-num">{t.viendo} {tr('tf.personasViendo')}</p> : null}
          </div>
        ) : t.enDirecto && !esSede && (
          <Link href={`/torneo/${t.id}/directo`} className="mt-4 block aspect-video w-full rounded-2xl border border-white/10 bg-black/40 relative overflow-hidden group">
            <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0 opacity-40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#8B8BA8]">
              <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Radio size={22} className="text-white" /></div>
              <p className="text-sm font-semibold text-white">{tr('tf.verEmision')}</p>
            </div>
            <span className="absolute top-2.5 left-2.5 badge-live">Live</span>
            {t.viendo && <span className="absolute top-2.5 right-2.5 text-[11px] font-mono-num text-white bg-black/50 px-2 py-0.5 rounded-md">{t.viendo} {tr('directo.viendo')}</span>}
          </Link>
        )}

        {/* Info: en escritorio, una sola fila de 4 tarjetas (menos apilado) */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
          <InfoCard icon={<Calendar size={15} className="text-[#B6FF3A]" />} label={tr('torneo.cuando')} value={t.fechaLabel} />
          {local ? (
            <button onClick={() => setVerSede(true)} className="card-premium card-int p-3.5 text-left">
              <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1"><MapPin size={15} className="text-[#4F8EF7]" />{tr('torneo.donde')}</div>
              <p className="text-sm font-bold text-white">{t.local}{t.distanciaKm > 0 ? ` · ${t.distanciaKm} km` : ''} <span className="text-[#8B8BA8] font-semibold">›</span></p>
            </button>
          ) : (
            <InfoCard icon={<MapPin size={15} className="text-[#4F8EF7]" />} label={tr('torneo.donde')} value={t.online ? 'Online' : t.local} />
          )}
          <InfoCard icon={<Trophy size={15} className="text-[#9B82FF]" />} label={tr('torneo.formato')} value={t.formato} />
          <InfoCard icon={<Coins size={15} className="text-[#E0BE63]" />} label={t.bote ? tr('torneo.bote') : tr('torneo.inscripcion')} value={t.bote ? `${t.bote}€` : t.precio === 0 ? tr('torneo.gratis') : `${t.precio}€`} />
        </div>

        {/* Inscritos */}
        <div className="mt-6 card-premium p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="inline-flex items-center gap-1.5 text-white font-semibold"><Users size={15} /> <span className="font-mono-num">{inscritosVis} / {t.plazas}</span> {tr('torneo.inscritos')}</span>
            <span className={completo && !inscrito ? 'text-[#FF8A5C] font-semibold text-sm' : 'text-[#B6FF3A] font-semibold text-sm'}>{completo && !inscrito ? tr('torneo.completo') : `${Math.max(0, t.plazas - inscritosVis)} ${t.plazas - inscritosVis === 1 ? tr('tf.plazaLibre') : tr('tf.plazasLibres')}`}</span>
          </div>
          <FillBar pct={pct} color={completo ? '#FF8A5C' : `linear-gradient(90deg, ${juego.color}, #C8FF5C)`} trackClassName="h-2 w-full rounded-full bg-white/8 overflow-hidden" />
          {colaPendiente > 0 && (
            <p className="mt-2 text-[11px] text-[#FF8A5C] font-semibold">⏳ +{colaPendiente} {tr('espera.enCola')}{enEspera ? ` · ${conParams(tr('tf.tuVas'), { p: puestoEspera })}` : ''}</p>
          )}
        </div>

        {/* Premios y puntos: en escritorio, lado a lado (menos scroll, menos carga) */}
        <div className={`mt-6 grid gap-5 ${(t.bote ?? 0) > 0 ? 'lg:grid-cols-2' : ''}`}>
        {(t.bote ?? 0) > 0 && (
          <div>
            <p className="eyebrow eyebrow-muted mb-2">{tr('torneo.repartoBote')}</p>
            <div className="card-premium p-4 space-y-2.5">
              {repartoBote(t.bote ?? 0).map(r => (
                <div key={r.puesto} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-bold text-white font-mono-num">{r.puesto}</span>
                  <FillBar pct={r.pct} color={r.puesto === '1º' ? '#E0BE63' : r.puesto === '2º' ? '#B8C0CC' : '#C08A4B'} trackClassName="flex-1 h-2.5 rounded-full bg-white/8 overflow-hidden" />
                  <span className="w-16 text-right text-sm font-bold text-white font-mono-num"><CountUp value={r.importe} suffix="€" /></span>
                </div>
              ))}
              <p className="text-[11px] text-[#8B8BA8] pt-1">{tr('tf.boteCrece')}</p>
            </div>
          </div>
        )}

        {/* Puntos para el ranking Torneum: cada torneo tiene su tope según lo
            que hay en juego (categoría, inscripción, bote, aforo, modalidad). */}
        {(() => {
          const tope = topePuntos(t)
          const cat = CATEGORIAS[t.categoria ?? 'comunidad']
          return (
            <div>
              <p className="eyebrow eyebrow-muted mb-2">{tr('tf.puntosRanking')}</p>
              <div className="card-premium p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: `${cat.color}1A`, color: cat.color }}><Trophy size={18} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{tr('tf.reparteHasta')} <span className="font-mono-num" style={{ color: cat.color }}>{tope} pts</span></p>
                    <p className="text-[11px] text-[#8B8BA8]">{cat.label} · {t.online ? tr('tf.rankingOnline') : tr('tf.rankingPresencial')} {tr('tf.dePaisMundial')}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-mono-num">
                  {[[1, '1º'], [2, '2º'], [4, '4º'], [8, 'Top 8']].map(([n, l]) => (
                    <span key={l} className="flex-1 rounded-lg bg-white/4 border border-white/8 px-2 py-1.5 text-center">
                      <span className="block text-[9px] uppercase tracking-wider text-[#8B8BA8] font-sans font-semibold">{l}</span>
                      <span className="text-white font-bold">{puntosPorPuesto(tope, n as number)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
        </div>{/* fin grid premios+puntos */}

        {/* Premios en producto + comentarios del TO */}
        {(t.premiosImgs?.length || t.comentarios) && (
          <div className="mt-6">
            <p className="eyebrow eyebrow-muted mb-2">{tr('torneo.delOrganizador')}</p>
            <div className="card-premium p-4 space-y-3">
              {t.comentarios && <p className="text-sm text-[#B8B8CC] leading-relaxed">{t.comentarios}</p>}
              {(t.premiosImgs?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[11px] text-[#8B8BA8] font-semibold uppercase tracking-wider mb-1.5">{tr('tf.premiosProducto')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {t.premiosImgs!.map(url => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt="Premio en producto" className="aspect-square w-full rounded-xl object-cover border border-white/10" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Participantes (solo si hay inscritos de verdad) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="eyebrow eyebrow-muted">{tr('torneo.participantes')}</p>
            {participantes.length > 0 && <button onClick={() => setVerParts(true)} className="text-xs text-[#B6FF3A] font-semibold">{tr('torneo.verTodos')}</button>}
          </div>
          {participantes.length === 0 && cuentasInscritas.length === 0 ? (
            <div className="card-premium p-4 flex items-center gap-3">
              <Users size={18} className="text-[#8B8BA8] shrink-0" />
              <p className="text-sm text-[#8B8BA8]">{tr('tf.sinInscritos')} {cancelado ? '' : tr('tf.sePrimero')}</p>
            </div>
          ) : (
            <>
              <button onClick={() => setVerParts(true)} className="flex items-center">
                {participantes.map((p, i) => {
                  const cols = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
                  return (
                    <span key={p.id} className="inline-flex items-center justify-center rounded-full text-[#0A0A0F] font-black border-2 border-[#10131B]"
                      style={{ width: 38, height: 38, marginLeft: i ? -10 : 0, background: cols[i % cols.length], zIndex: 10 - i }}>
                      {p.nombre[0]}
                    </span>
                  )
                })}
                {/* Cuentas demo inscritas: su avatar público se suma a la pila */}
                {cuentasInscritas.slice(0, 6).map((email, i) => (
                  <span key={email} className="rounded-full border-2 border-[#10131B] overflow-hidden inline-flex"
                    style={{ marginLeft: participantes.length + i > 0 ? -10 : 0, zIndex: 10 - participantes.length - i }}>
                    <AvatarCuenta email={email} size={34} />
                  </span>
                ))}
                {ocupadas > 6 && <span className="ml-3 text-sm text-[#B8B8CC] font-medium">+{ocupadas - 6} {tr('tf.mas')}</span>}
              </button>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {participantes.slice(0, 4).map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 pl-1.5 pr-2 h-7 rounded-full bg-white/[0.05] border border-white/10">
                    <RangoChip rating={p.rating} />
                    <span className="text-[11px] font-bold text-[#D4D4E4]">{p.nombre}</span>
                  </span>
                ))}
                {/* Chips de cuenta: clicables → mini-perfil público (sin stats falsas) */}
                {cuentasInscritas.slice(0, 4).map(email => (
                  <button key={email} onClick={() => setSelCuenta(email)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2 h-7 rounded-full bg-[#B6FF3A]/[0.06] border border-[#B6FF3A]/25 hover:bg-[#B6FF3A]/[0.12] transition-colors">
                    <AvatarCuenta email={email} size={20} />
                    <span className="text-[11px] font-bold text-[#D4D4E4]">{nombreCuentaDemo(email, perfilesCuentas)}</span>
                  </button>
                ))}
              </div>
              {tierTorneo && (
                <p className="mt-2 text-[11px] font-semibold" style={{ color: TIER_TORNEO_COLOR[tierTorneo] }}>
                  {conParams(tr('tf.tierExplica'), { tier: tierTorneo })}
                </p>
              )}
            </>
          )}
        </div>

        {/* Reglas: desplegable — el reglamento lo escribe el TO al crear el
            torneo (t.reglas) y debajo van las estándar de Torneum. */}
        <div className="mt-6">
          <ReglasTorneo t={t} />
        </div>

        {/* Bracket / clasificación + sala Live (si estás inscrito) */}
        <div className="mt-6 grid gap-2.5 lg:grid-cols-2">
          <Link href={`/torneo/${t.id}/bracket`} className="flex items-center justify-between card-premium card-int p-4">
            <span className="inline-flex items-center gap-2 text-white font-semibold"><ListTree size={18} className="text-[#9B82FF]" /> {t.formato === 'Suizo' || t.formato === 'Round robin' ? tr('torneo.verClasificacion') : tr('torneo.verBracket')}</span>
            <span className="text-[#8B8BA8] text-lg">›</span>
          </Link>
          {inscrito && (
            <Link href={`/live/${t.id}`} className="flex items-center justify-between card-premium card-int p-4 border border-[#E63E54]/30">
              <span className="inline-flex items-center gap-2 text-white font-semibold"><Radio size={18} className="text-[#E63E54]" /> {tr('tf.salaLive')}</span>
              <span className="text-[#8B8BA8] text-lg">›</span>
            </Link>
          )}
        </div>
      </div>{/* fin columna izquierda */}

        {/* Escritorio: tarjeta de inscripción sticky a la derecha */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 card-premium ring-grad p-5 space-y-4">
            {!esSede && (
              <div>
                <p className="eyebrow eyebrow-muted mb-1">{tr('torneo.inscripcion')}</p>
                <p className="text-3xl font-bold text-white font-mono-num">{totalJugador === 0 ? tr('torneo.gratis') : `${totalJugador}€`}</p>
                {com.importe > 0 && <p className="text-[12px] text-[#8B8BA8] mt-0.5">{conParams(tr('tf.comisionLinea'), { p: t.precio, pct: com.pct, imp: com.importe })}</p>}
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#B8B8CC]"><Calendar size={15} className="text-[#B6FF3A]" /> {t.fechaLabel}</div>
              <div className="flex items-center gap-2 text-[#B8B8CC]"><MapPin size={15} className="text-[#4F8EF7]" /> {t.online ? 'Online' : t.local}</div>
              <div className="flex items-center gap-2 text-[#B8B8CC]"><Users size={15} className="text-[#9B82FF]" /> <span className="font-mono-num">{inscritosVis}/{t.plazas}</span> · {completo && !inscrito ? tr('torneo.completo').toLowerCase() : `${Math.max(0, t.plazas - inscritosVis)} ${t.plazas - inscritosVis === 1 ? tr('tf.libre') : tr('tf.libres')}`}</div>
            </div>
            <FillBar pct={pct} color={completo ? '#FF8A5C' : `linear-gradient(90deg, ${juego.color}, #C8FF5C)`} trackClassName="h-2 w-full rounded-full bg-white/8 overflow-hidden" />
            {ctaBtn}
            {ctaCrew}
            {politicaCancel}
            {ctaEspectador}
            <button onClick={() => setChatAbierto(true)} className="w-full h-11 rounded-xl bg-white/6 border border-white/10 text-[#B8B8CC] text-sm font-semibold flex items-center justify-center gap-2 hover:text-white transition-colors">💬 {tr('chat.titulo')}</button>
            <button onClick={compartir} className="w-full h-11 rounded-xl bg-white/6 border border-white/10 text-[#B8B8CC] text-sm font-semibold flex items-center justify-center gap-2 hover:text-white transition-colors"><Share2 size={15} /> {tr('torneo.compartir')}</button>
          </div>
        </aside>
      </div>{/* fin grid escritorio */}

      {/* CTA fija (móvil/tablet) — solo para jugadores; la sede no se inscribe */}
      {!esSede && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-20 px-4 pb-3 pt-3 bg-gradient-to-t from-[#0D0F15] via-[#0D0F15] to-transparent">
          <div className="max-w-lg mx-auto">
            {ctaBtn}
            {ctaCrew}
            {politicaCancel}
            {ctaEspectador}
          </div>
        </div>
      )}

      {/* Hoja de cancelación (F7): las reglas claras ANTES de confirmar. Caso
          dentro de plazo (>24 h) → devolución 100%; fuera (hoy/en directo) →
          pierde la inscripción; gratis → texto neutro sin dinero. */}
      {cancelarOpen && (() => {
        const conDev = puedeCancelarConDevolucion(t)
        const gratis = t.precio === 0
        return (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setCancelarOpen(false)} />
            <div className="relative w-full max-w-lg bg-[#141822] border-t lg:border border-white/10 rounded-t-3xl lg:rounded-3xl pb-6 animate-slide-up-sm">
              <div className="pt-3 pb-2 px-5 flex items-center justify-between">
                <span className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/15 lg:hidden" />
                <p className="text-[15px] font-bold text-white mt-2">{tr('canc.titulo')}</p>
                <button onClick={() => setCancelarOpen(false)} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] mt-1"><X size={16} /></button>
              </div>
              <div className="px-5">
                <p className="text-sm font-semibold text-[#B8B8CC]">{t.nombre} · <span className="text-[#8B8BA8]">{t.fechaLabel}</span></p>
                {gratis ? (
                  <p className="mt-3 text-sm text-[#B8B8CC] leading-relaxed">{tr('canc.gratis')}</p>
                ) : conDev ? (
                  <div className="mt-3 rounded-2xl border border-[#B6FF3A]/35 bg-[#B6FF3A]/[0.07] p-3.5">
                    <p className="text-sm text-white leading-relaxed">✅ {tr('canc.dentroA')} <span className="font-bold text-[#B6FF3A]">({t.precio}€)</span>: {tr('canc.dentroB')}</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-[#FF6B6B]/40 bg-[#FF6B6B]/[0.08] p-3.5">
                    <p className="text-sm text-white leading-relaxed">⚠️ {tr('canc.fueraA')} <span className="font-bold text-[#FF8A8A]">({t.precio}€)</span>.</p>
                  </div>
                )}
                {!gratis && <p className="mt-2 text-[11px] text-[#8B8BA8]">{tr('canc.politica')}</p>}
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={() => { desinscribir(t!.id, t!.nombre); setCancelarOpen(false) }}
                    className={`w-full h-12 rounded-xl text-sm font-bold transition-colors ${!gratis && !conDev
                      ? 'bg-[#FF6B6B]/15 border border-[#FF6B6B]/40 text-[#FF8A8A] hover:bg-[#FF6B6B]/25'
                      : 'bg-white/8 border border-white/15 text-white hover:bg-white/12'}`}>
                    {tr('canc.confirmar')}
                  </button>
                  <button onClick={() => setCancelarOpen(false)} className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">{tr('canc.mantener')}</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {tierSheet && <TierSheet requerido={t.vip ?? undefined} onClose={() => setTierSheet(false)} />}
      {chatAbierto && <ChatTorneoSheet torneoId={t.id} torneoNombre={t.nombre} onClose={() => setChatAbierto(false)} />}

      {sheet && !esSede && (
        <InscripcionSheet
          precioVer={pVer} modoInicial={modoSheet} onConfirmVer={confirmarEspectador}
          torneo={t} juego={juego} comisionPct={com.pct} comisionImporte={com.importe}
          total={totalJugador} completo={completo} puestoEspera={puestoEspera}
          crew={crewSheet}
          onClose={() => setSheet(false)} onConfirm={confirmarInscripcion}
        />
      )}

      {/* Inscripción por equipos (F6): elegir crew → abrir el cupo y avisar al
          grupo de chat. Cada miembro entra por el enlace y paga su plaza. */}
      {eligeCrew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setEligeCrew(false)} />
          <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-white text-display">⚔️ {tr('crew.eligeTitulo')}</p>
              <button onClick={() => setEligeCrew(false)} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={15} /></button>
            </div>
            <p className="mt-1 text-[12px] text-[#8B8BA8]">{tr('crew.eligeTexto')}</p>
            <div className="mt-3 space-y-2">
              {misCrewsJuego.map(c => (
                <button key={c.id}
                  onClick={() => { abrirInscripcionCrew(t!.id, t!.nombre, c.id); setEligeCrew(false) }}
                  className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left hover:bg-white/[0.08] transition-colors">
                  <CrewEmblema nivel={nivelCrew(c)} variant="tile" size={40} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-white truncate">
                      {c.emoji && <span className="mr-1">{c.emoji}</span>}{c.nombre} <span style={{ color: c.color ?? '#B6FF3A' }}>#{c.tag}</span>
                    </span>
                    <span className="block text-[11px] text-[#8B8BA8] font-mono-num">{puntuacionCrew(c)} pts · {c.miembros.length} {tr('crew.miembrosMin')} · {tr('tf.cupoDe')} {plazasCupo}</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#B6FF3A] shrink-0">{tr('crew.abrirAviso')} ›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal participantes con seeds */}
      {verParts && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setVerParts(false)} />
          <div className="relative w-full max-w-lg bg-[#141822] border-t border-white/10 rounded-t-3xl pb-6 animate-slide-up-sm max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141822] pt-3 pb-2 px-5 flex items-center justify-between z-10 border-b border-white/5">
              <span className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/15" />
              <p className="text-[15px] font-bold text-white mt-2">{tr('tf.participantesSeeding')}</p>
              <button onClick={() => setVerParts(false)} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] mt-1"><X size={16} /></button>
            </div>
            <div className="px-4 pt-3 space-y-1.5">
              {rankingPorJuego(t.juego).slice(0, Math.max(1, Math.min(16, ocupadas))).map((p, i) => (
                <button key={p.id} onClick={() => { setSelJugador(p); setVerParts(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/[0.07] transition-colors text-left">
                  <span className="w-7 text-center text-xs font-bold text-[#8B8BA8] font-mono-num">#{i + 1}</span>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#0A0A0F] font-black shrink-0" style={{ background: juego.color }}>{p.nombre[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.nombre} <span className="text-xs">{p.bandera}</span></p>
                    <p className="text-[11px] text-[#8B8BA8] font-mono-num flex items-center gap-1">{p.rating} · {p.tier} · <PersonajeChip juegoId={p.juego} nombre={p.main} /></p>
                  </div>
                  <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wide">Seed {i + 1}</span>
                </button>
              ))}
              {/* Cuentas demo inscritas, con su perfil público */}
              {cuentasInscritas.map(email => (
                <button key={email} onClick={() => { setSelCuenta(email); setVerParts(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#B6FF3A]/[0.05] border border-[#B6FF3A]/20 hover:bg-[#B6FF3A]/[0.1] transition-colors text-left">
                  <span className="w-7" />
                  <AvatarCuenta email={email} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{nombreCuentaDemo(email, perfilesCuentas)} <span className="text-[11px] font-bold text-[#8B8BA8] font-mono-num">#{tagCuentaDemo(email, perfilesCuentas)}</span></p>
                    <p className="text-[11px] text-[#B6FF3A] font-semibold">{tr('mc.cuentaTorneum')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selJugador && <MiniPerfil jugador={selJugador} onClose={() => setSelJugador(null)} />}
      {selCuenta && <MiniPerfilCuenta email={selCuenta} onClose={() => setSelCuenta(null)} />}
      {verSede && local && <MiniLocal local={local} onClose={() => setVerSede(false)} />}
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-premium p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold mb-1">{icon}{label}</div>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  )
}
