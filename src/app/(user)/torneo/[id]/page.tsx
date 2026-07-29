'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  getTorneo, getOrganizador, getLocal, JUEGOS, rankingPorJuego,
  precioEspectador, esperaDe,
} from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
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
import { useT } from '@/lib/i18n'
import type { Jugador } from '@/lib/torneos/sample'
import {
  ArrowLeft, Calendar, MapPin, Trophy, Users, Lock, Radio, Share2, ListTree, ShieldCheck,
  Check, Star, Coins, Wifi, X, MessageSquare,
} from 'lucide-react'

function plazasLibresLabel(n: number): string {
  const libres = Math.max(0, n)
  return libres === 1 ? '1 plaza libre' : `${libres} plazas libres`
}

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
  const promovidos = useDemoStore(s => s.promovidosEspera[id] ?? 0)
  const bajas = useDemoStore(s => s.gestion[id]?.bajas?.length ?? 0)
  const apuntarEspera = useDemoStore(s => s.apuntarEspera)
  const salirEspera = useDemoStore(s => s.salirEspera)
  const desinscribir = useDemoStore(s => s.desinscribir)
  const esEspectador = useDemoStore(s => s.entradasEspectador.includes(id))
  const inscribirEspectador = useDemoStore(s => s.inscribirEspectador)
  const [modoSheet, setModoSheet] = useState<'jugar' | 'ver'>('jugar')
  const [tierSheet, setTierSheet] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const tierUsuario = useDemoStore(s => s.tierUsuario)

  if (!t) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Trophy size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">Torneo no encontrado</p>
        <Link href="/explorar" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">Volver a Explorar</Link>
      </div>
    )
  }

  const juego = JUEGOS[t.juego]
  const org = t.organizadorId ? getOrganizador(t.organizadorId) : undefined
  const local = t.localId ? getLocal(t.localId) : undefined
  // Plazas ocupadas reales: inscritos de muestra − bajas del TO + promovidos de
  // la cola. El usuario suma aparte (inscritosVis).
  const ocupadas = t.inscritos - bajas + promovidos
  const completo = ocupadas >= t.plazas
  const inscritosVis = ocupadas + (inscrito ? 1 : 0)
  // Cola de espera pendiente (muestra) + el usuario si está apuntado
  const colaPendiente = Math.max(0, esperaDe(t).length - promovidos) + (enEspera ? 1 : 0)
  const puestoEspera = Math.max(0, esperaDe(t).length - promovidos) + 1
  const pct = Math.min(100, Math.round((inscritosVis / t.plazas) * 100))
  const com = comision(t.precio, t.inscritos)
  const totalJugador = t.precio + com.importe
  const pVer = precioEspectador(t)
  const participantes = rankingPorJuego(t.juego).slice(0, 6)
  // Tier dinámico del torneo (reunión 5-jul): lo fijan sus inscritos top
  const grupos = participantes.map(p => rangoDe(p.rating).grupo)
  const tierTorneo = grupos.filter(g => g === 'S' || g === 'A').length >= 3 ? 'Platino'
    : grupos.filter(g => g === 'S' || g === 'A' || g === 'B').length >= 3 ? 'Oro' : null
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
  function confirmarInscripcion() {
    if (completo) apuntarEspera(t!.id, t!.nombre, puestoEspera)
    else inscribir(t!.id, t!.nombre)
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
  const ctaEspectador = !cancelado && pVer !== null && !inscrito ? (
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

  const ctaBtn = cancelado ? (
    <div className="w-full h-14 rounded-2xl bg-[#FF6B6B]/12 border border-[#FF6B6B]/40 text-[#FF8A8A] font-bold flex items-center justify-center gap-2">Torneo cancelado · reembolso 100%</div>
  ) : inscrito ? (
    <div>
      <Link href="/entradas" className="w-full h-14 rounded-2xl bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 text-[#B6FF3A] font-bold flex items-center justify-center gap-2"><Check size={18} /> Inscrito · ver en mi cartera</Link>
      <button onClick={() => { if (window.confirm(`¿Cancelar tu inscripción en "${t!.nombre}"? Tu plaza pasará al primero de la lista de espera.`)) desinscribir(t!.id, t!.nombre) }}
        className="mt-1.5 w-full text-center text-[11px] text-[#8B8BA8] font-semibold hover:text-[#FF8A8A] transition-colors">{tr('espera.cancelarInsc')}</button>
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
      Apuntarme a la lista de espera{colaPendiente > 0 ? ` · ${colaPendiente} en cola` : ''}
    </button>
  ) : (
    <button onClick={() => abrirSheet('jugar')} className="w-full h-14 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform">
      {tr('torneo.inscribirme')} · {totalJugador === 0 ? tr('torneo.gratis') : `${totalJugador}€`}
    </button>
  )

  return (
    <div className="relative min-h-screen pb-28 lg:pb-12 max-w-xl lg:max-w-6xl mx-auto">
      {/* Banner: el del torneo si lo tiene; si no, el keyart del juego */}
      <div className="relative h-56 lg:h-80 overflow-hidden lg:rounded-b-3xl">
        {t.banner
          ? <img src={t.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
          : <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0" />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.18) 10%, rgba(8,8,15,0.05) 34%, rgba(11,13,19,0.62) 62%, #0D0F15 96%)' }} />
        <div className="relative flex items-center justify-between px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <div className="flex gap-2">
            {t.enDirecto && <Link href={`/torneo/${t.id}/directo`} className="inline-flex items-center gap-1 px-2.5 h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white"><Radio size={12} className="animate-pulse-heat" /> En directo</Link>}
            <button onClick={compartir} aria-label="Compartir" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white relative">
              <Share2 size={16} />
              {copiado && <span className="absolute -bottom-7 right-0 whitespace-nowrap text-[10px] font-semibold text-[#0A0A0F] bg-[#B6FF3A] px-2 py-0.5 rounded-md">Enlace copiado</span>}
            </button>
          </div>
        </div>
        <div className="absolute bottom-3 left-5 right-5 lg:left-6 lg:right-6">
          <div className="flex items-center gap-2 animate-slide-up-sm">
            {tierTorneo && (
              <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-black backdrop-blur-sm"
                style={{ background: `${TIER_TORNEO_COLOR[tierTorneo]}26`, color: TIER_TORNEO_COLOR[tierTorneo], border: `1px solid ${TIER_TORNEO_COLOR[tierTorneo]}66` }}>
                ★ Torneo {tierTorneo}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold backdrop-blur-sm" style={{ background: `${juego.color}30`, color: juego.color, border: `1px solid ${juego.color}55` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.nombre}
            </span>
            {t.online && <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#4F8EF7]/25 text-[#7FB0FF] border border-[#4F8EF7]/40 backdrop-blur-sm"><Wifi size={10} /> Online</span>}
            {t.vip && <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/40 text-[#E0BE63] border border-[#D4A84B]/40 backdrop-blur-sm"><Lock size={10} /> {t.vip}</span>}
          </div>
          <h1 className="mt-2.5 text-[26px] lg:text-4xl font-bold text-white text-display tracking-tight leading-[1.08] animate-slide-up-sm" style={{ textShadow: '0 2px 24px rgba(0,0,0,.5)' }}>{t.nombre}</h1>
        </div>
      </div>

      {/* Escritorio: 2 columnas (contenido + tarjeta de inscripción sticky). Móvil: una columna. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:px-6 lg:items-start lg:mt-6">
      <div className="px-5 lg:px-0 lg:min-w-0">
        {inscrito && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[11px] font-bold bg-[#B6FF3A]/15 text-[#B6FF3A] border border-[#B6FF3A]/40"><Check size={12} /> Inscrito</span>
          </div>
        )}

        {/* Tu combate (inscrito + en directo) */}
        {inscrito && t.enDirecto && (
          <div className="mt-4 rounded-2xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.08] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="dot-live" /><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B6FF3A]">Tu combate está listo</p>
            </div>
            <p className="text-sm text-white font-semibold">Cuartos vs <span className="text-white">Sora</span> · Mesa 3</p>
            <p className="text-xs text-[#A0A0B8] mt-0.5">Preséntate en tu mesa. Reporta el resultado al terminar.</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/torneo/${t.id}/mesa?n=3&vs=${encodeURIComponent('Cuartos vs Sora')}`} className="flex-1 h-10 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold flex items-center justify-center gap-1.5"><MapPin size={15} /> Ver mi mesa</Link>
              <Link href={`/torneo/${t.id}/directo`} className="flex-1 h-10 rounded-xl bg-white/8 text-white text-sm font-bold flex items-center justify-center gap-1.5"><MessageSquare size={15} /> Chat</Link>
            </div>
          </div>
        )}

        {t.descripcion && <p className="mt-3 text-sm text-[#B8B8CC] leading-relaxed">{t.descripcion}</p>}

        {/* Organizador */}
        {org && (
          <Link href={`/organizador/${org.id}`} className="mt-3 flex items-center gap-2.5 w-fit">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm text-[#0A0A0F]" style={{ background: org.color }}>{org.nombre[0]}</span>
            <span className="text-sm"><span className="text-[#8B8BA8]">Organiza · </span><span className="text-white font-semibold">{org.nombre}</span></span>
            {org.verificado && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#4F8EF7] text-white text-[10px] font-bold">✓</span>}
            <span className="inline-flex items-center gap-0.5 text-[11px] text-[#E0BE63] font-semibold"><Star size={11} className="fill-[#E0BE63]" /> {org.rating}</span>
          </Link>
        )}
        {/* Co-organizadores (colaboración entre TOs) */}
        {t.coOrganizadores && t.coOrganizadores.length > 0 && (
          <p className="mt-1.5 text-[12px] text-[#8B8BA8]">
            junto a {t.coOrganizadores.map((cid, i) => {
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
              {t.enDirecto && (
                <Link href={`/torneo/${t.id}/directo`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B6FF3A]">
                  <Radio size={12} /> Abrir directo con chat ›
                </Link>
              )}
            </div>
            <VideoEmbed url={t.videoUrl} titulo={t.nombre} className="rounded-2xl border border-white/10" />
            {t.enDirecto && t.viendo ? <p className="mt-1.5 text-[11px] text-[#8B8BA8] font-mono-num">{t.viendo} personas viendo ahora</p> : null}
          </div>
        ) : t.enDirecto && (
          <Link href={`/torneo/${t.id}/directo`} className="mt-4 block aspect-video w-full rounded-2xl border border-white/10 bg-black/40 relative overflow-hidden group">
            <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0 opacity-40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#8B8BA8]">
              <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Radio size={22} className="text-white" /></div>
              <p className="text-sm font-semibold text-white">Ver emisión en directo</p>
            </div>
            <span className="absolute top-2.5 left-2.5 badge-live">Live</span>
            {t.viendo && <span className="absolute top-2.5 right-2.5 text-[11px] font-mono-num text-white bg-black/50 px-2 py-0.5 rounded-md">{t.viendo} viendo</span>}
          </Link>
        )}

        {/* Info */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
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
          <InfoCard icon={<Coins size={15} className="text-[#E0BE63]" />} label={t.bote ? tr('torneo.bote') : tr('torneo.inscripcion')} value={t.bote ? `${t.bote}€` : t.precio === 0 ? 'Gratis' : `${t.precio}€`} />
        </div>

        {/* Inscritos */}
        <div className="mt-4 card-premium p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="inline-flex items-center gap-1.5 text-white font-semibold"><Users size={15} /> <span className="font-mono-num">{inscritosVis} / {t.plazas}</span> {tr('torneo.inscritos')}</span>
            <span className={completo && !inscrito ? 'text-[#FF8A5C] font-semibold text-sm' : 'text-[#B6FF3A] font-semibold text-sm'}>{completo && !inscrito ? 'Completo' : plazasLibresLabel(t.plazas - inscritosVis)}</span>
          </div>
          <FillBar pct={pct} color={completo ? '#FF8A5C' : `linear-gradient(90deg, ${juego.color}, #C8FF5C)`} trackClassName="h-2 w-full rounded-full bg-white/8 overflow-hidden" />
          {colaPendiente > 0 && (
            <p className="mt-2 text-[11px] text-[#FF8A5C] font-semibold">⏳ +{colaPendiente} {tr('espera.enCola')}{enEspera ? ` · tú vas el ${puestoEspera}º` : ''}</p>
          )}
        </div>

        {/* Premios */}
        {(t.bote ?? 0) > 0 && (
          <div className="mt-4">
            <p className="eyebrow eyebrow-muted mb-2">{tr('torneo.repartoBote')}</p>
            <div className="card-premium p-4 space-y-2.5">
              {repartoBote(t.bote!).map(r => (
                <div key={r.puesto} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-bold text-white font-mono-num">{r.puesto}</span>
                  <FillBar pct={r.pct} color={r.puesto === '1º' ? '#E0BE63' : r.puesto === '2º' ? '#B8C0CC' : '#C08A4B'} trackClassName="flex-1 h-2.5 rounded-full bg-white/8 overflow-hidden" />
                  <span className="w-16 text-right text-sm font-bold text-white font-mono-num"><CountUp value={r.importe} suffix="€" /></span>
                </div>
              ))}
              <p className="text-[11px] text-[#8B8BA8] pt-1">El bote crece con cada inscripción. Reparto editable por el organizador.</p>
            </div>
          </div>
        )}

        {/* Premios en producto + comentarios del TO */}
        {(t.premiosImgs?.length || t.comentarios) && (
          <div className="mt-4">
            <p className="eyebrow eyebrow-muted mb-2">{tr('torneo.delOrganizador')}</p>
            <div className="card-premium p-4 space-y-3">
              {t.comentarios && <p className="text-sm text-[#B8B8CC] leading-relaxed">{t.comentarios}</p>}
              {(t.premiosImgs?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[11px] text-[#8B8BA8] font-semibold uppercase tracking-wider mb-1.5">Premios en producto</p>
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

        {/* Participantes */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="eyebrow eyebrow-muted">{tr('torneo.participantes')}</p>
            <button onClick={() => setVerParts(true)} className="text-xs text-[#B6FF3A] font-semibold">{tr('torneo.verTodos')}</button>
          </div>
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
            {t.inscritos > 6 && <span className="ml-3 text-sm text-[#B8B8CC] font-medium">+{t.inscritos - 6} más</span>}
          </button>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {participantes.slice(0, 4).map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 pl-1.5 pr-2 h-7 rounded-full bg-white/[0.05] border border-white/10">
                <RangoChip rating={p.rating} />
                <span className="text-[11px] font-bold text-[#D4D4E4]">{p.nombre}</span>
              </span>
            ))}
          </div>
          {tierTorneo && (
            <p className="mt-2 text-[11px] font-semibold" style={{ color: TIER_TORNEO_COLOR[tierTorneo] }}>
              ★ Los inscritos de rango alto elevan este torneo a tier {tierTorneo}: reparte más puntos y destaca en el mapa.
            </p>
          )}
        </div>

        {/* Reglas */}
        <div className="mt-5">
          <p className="eyebrow eyebrow-muted mb-2">{tr('torneo.reglas')}</p>
          <ul className="space-y-2 text-sm text-[#B8B8CC]">
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> {t.bestOf || 'Best of 3'} · {t.formato}.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Check-in con QR y reporte de resultados por consenso.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Seeding por ranking; el organizador resuelve las disputas.</li>
            {t.online && <li className="flex gap-2"><ShieldCheck size={16} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Código de sala por el chat del combate.</li>}
          </ul>
        </div>

        {/* Sede */}
        {local && (
          <div className="mt-5">
            <p className="eyebrow eyebrow-muted mb-2">{tr('torneo.sede')}</p>
            <button onClick={() => setVerSede(true)} className="w-full card-premium card-int p-4 flex items-center gap-3 text-left">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#0A0A0F] font-black" style={{ background: local.color }}>{local.nombre[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{local.nombre}</p>
                <p className="text-xs text-[#8B8BA8]">{local.zona} · {local.setups} setups · <span className="text-[#E0BE63]">★ {local.rating}</span></p>
              </div>
              <span className="text-[#8B8BA8] text-lg">›</span>
            </button>
          </div>
        )}

        {/* Bracket / clasificación */}
        <Link href={`/torneo/${t.id}/bracket`} className="mt-5 flex items-center justify-between card-premium card-int p-4">
          <span className="inline-flex items-center gap-2 text-white font-semibold"><ListTree size={18} className="text-[#9B82FF]" /> {t.formato === 'Suizo' || t.formato === 'Round robin' ? tr('torneo.verClasificacion') : tr('torneo.verBracket')}</span>
          <span className="text-[#8B8BA8] text-lg">›</span>
        </Link>
      </div>{/* fin columna izquierda */}

        {/* Escritorio: tarjeta de inscripción sticky a la derecha */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 card-premium ring-grad p-5 space-y-4">
            <div>
              <p className="eyebrow eyebrow-muted mb-1">{tr('torneo.inscripcion')}</p>
              <p className="text-3xl font-bold text-white font-mono-num">{totalJugador === 0 ? 'Gratis' : `${totalJugador}€`}</p>
              {com.importe > 0 && <p className="text-[12px] text-[#8B8BA8] mt-0.5">{t.precio}€ + {com.pct}% comisión ({com.importe}€)</p>}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#B8B8CC]"><Calendar size={15} className="text-[#B6FF3A]" /> {t.fechaLabel}</div>
              <div className="flex items-center gap-2 text-[#B8B8CC]"><MapPin size={15} className="text-[#4F8EF7]" /> {t.online ? 'Online' : t.local}</div>
              <div className="flex items-center gap-2 text-[#B8B8CC]"><Users size={15} className="text-[#9B82FF]" /> <span className="font-mono-num">{inscritosVis}/{t.plazas}</span> · {completo && !inscrito ? 'completo' : `${Math.max(0, t.plazas - inscritosVis)} ${t.plazas - inscritosVis === 1 ? 'libre' : 'libres'}`}</div>
            </div>
            <FillBar pct={pct} color={completo ? '#FF8A5C' : `linear-gradient(90deg, ${juego.color}, #C8FF5C)`} trackClassName="h-2 w-full rounded-full bg-white/8 overflow-hidden" />
            {ctaBtn}
            {ctaEspectador}
            <button onClick={() => setChatAbierto(true)} className="w-full h-11 rounded-xl bg-white/6 border border-white/10 text-[#B8B8CC] text-sm font-semibold flex items-center justify-center gap-2 hover:text-white transition-colors">💬 {tr('chat.titulo')}</button>
            <button onClick={compartir} className="w-full h-11 rounded-xl bg-white/6 border border-white/10 text-[#B8B8CC] text-sm font-semibold flex items-center justify-center gap-2 hover:text-white transition-colors"><Share2 size={15} /> {tr('torneo.compartir')}</button>
          </div>
        </aside>
      </div>{/* fin grid escritorio */}

      {/* CTA fija (móvil/tablet) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-20 px-4 pb-3 pt-3 bg-gradient-to-t from-[#0D0F15] via-[#0D0F15] to-transparent">
        <div className="max-w-lg mx-auto">
          {ctaBtn}
              {ctaEspectador}
        </div>
      </div>

      {tierSheet && <TierSheet requerido={t.vip ?? undefined} onClose={() => setTierSheet(false)} />}
      {chatAbierto && <ChatTorneoSheet torneoId={t.id} torneoNombre={t.nombre} onClose={() => setChatAbierto(false)} />}

      {sheet && (
        <InscripcionSheet
          precioVer={pVer} modoInicial={modoSheet} onConfirmVer={confirmarEspectador}
          torneo={t} juego={juego} comisionPct={com.pct} comisionImporte={com.importe}
          total={totalJugador} completo={completo} puestoEspera={puestoEspera}
          onClose={() => setSheet(false)} onConfirm={confirmarInscripcion}
        />
      )}

      {/* Modal participantes con seeds */}
      {verParts && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setVerParts(false)} />
          <div className="relative w-full max-w-lg bg-[#141822] border-t border-white/10 rounded-t-3xl pb-6 animate-slide-up-sm max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141822] pt-3 pb-2 px-5 flex items-center justify-between z-10 border-b border-white/5">
              <span className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/15" />
              <p className="text-[15px] font-bold text-white mt-2">Participantes · seeding</p>
              <button onClick={() => setVerParts(false)} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] mt-1"><X size={16} /></button>
            </div>
            <div className="px-4 pt-3 space-y-1.5">
              {rankingPorJuego(t.juego).map((p, i) => (
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
            </div>
          </div>
        </div>
      )}

      {selJugador && <MiniPerfil jugador={selJugador} onClose={() => setSelJugador(null)} />}
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
