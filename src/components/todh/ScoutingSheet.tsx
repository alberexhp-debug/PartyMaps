'use client'
import { useState } from 'react'
import Link from 'next/link'
import { X, Lock, Search, Swords, TrendingUp, Minus, Trophy, Play, CalendarClock, Users, Crown } from '@/components/todh/iconosTorneum'
import { TrendingDown, Film, Activity, BarChart3 } from 'lucide-react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { TierSheet, tieneAcceso } from '@/components/todh/TierSheet'
import { RangoChip } from '@/components/todh/RangoChip'
import { GameIcon } from '@/components/todh/GameIcon'
import { PersonajeIcon } from '@/components/todh/PersonajeChip'
import { JUEGOS, plantillaDe, etiquetaHace } from '@/lib/torneos/sample'
import { scoutingDe, headToHead, historialDe, vodsDe, scoutingCrew } from '@/lib/torneos/scouting'
import type { Crew } from '@/lib/torneos/crews'
import type { ModuloScouting } from '@/lib/torneos/plantillas'
import { useT, conParams } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// SCOUTING v1 (30-08): la vista de «🔍 Estudiar» a un rival. Solo stats
// medibles con datos Torneum (scouting.ts, deterministas) y el tamaño de
// muestra SIEMPRE a la vista. Muros por tier (TierSheet.tieneAcceso):
//   GRATIS  → rango + muestra + historial resumido (ya públicos en la app)
//   ORO     → mains con winrate, historial completo, VODs del rival, actividad
//   PLATINO → head-to-head contra ti, clutch/ajustados, tendencia, crews
// Sin tier, cada módulo se ve BORROSO con candado y CTA que abre el TierSheet
// (teaser). ScoutingPanel es embebible (pestaña Scouting de /jugador/[nombre]);
// ScoutingSheet lo envuelve en un modal grande (2 columnas en escritorio, el
// patrón MiniPerfil) para los accesos contextuales (Live, MiniPerfil).
// ScoutingCrewSheet es el scouting de una CREW rival en juegos de equipo.
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_TIER: Record<string, string> = { Oro: '#E0BE63', Platino: '#67E8F9' }
const V = '#2ED47A'   // tu color de victoria (racha)
const D = '#FF6B6B'   // tu color de derrota

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

// Muro por tier: sin acceso, el contenido se ve borroso (teaser honesto: son
// los datos reales desenfocados, no una maqueta) con candado y CTA al TierSheet.
function Muro({ requerido, libre, onPedir, children }: {
  requerido: 'Oro' | 'Platino'; libre?: boolean; onPedir: (t: 'Oro' | 'Platino') => void; children: React.ReactNode
}) {
  const { t: tr } = useT()
  const tier = useDemoStore(s => s.tierUsuario)
  if (libre || tieneAcceso(tier, requerido)) return <>{children}</>
  const color = COLOR_TIER[requerido]
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none blur-[7px] opacity-55" aria-hidden>{children}</div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0D0F15]/45 p-3 text-center">
        <span className="h-8 w-8 rounded-full border flex items-center justify-center" style={{ borderColor: `${color}66`, background: `${color}14` }}>
          <Lock size={14} style={{ color }} />
        </span>
        <button onClick={() => onPedir(requerido)}
          className="h-8 px-3 rounded-lg text-[12px] font-bold" style={{ background: color, color: '#0A0A0F' }}>
          {conParams(tr('sc.desbloqueaCon'), { tier: requerido })}
        </button>
      </div>
    </div>
  )
}

// Tarjeta compacta de módulo, con la muestra del dato («14 sets») a la derecha.
function Tarjeta({ icon, titulo, extra, children }: { icon: React.ReactNode; titulo: string; extra?: string; children: React.ReactNode }) {
  return (
    <div className="card-premium p-3.5 h-full">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold">{titulo}</p>
        {extra && <span className="ml-auto text-[10px] text-[#6B6B85] font-mono-num shrink-0">{extra}</span>}
      </div>
      {children}
    </div>
  )
}

// ── Panel de módulos (embebible): los datos + los muros ──────────────────────
export function ScoutingPanel({ nombre, juego, sinHistorial, propio }: {
  nombre: string; juego: string; sinHistorial?: boolean; propio?: boolean
}) {
  const { t: tr, idioma } = useT()
  const [pedirTier, setPedirTier] = useState<'Oro' | 'Platino' | null>(null)
  const plantilla = plantillaDe(juego)
  const s = scoutingDe(nombre, juego)
  const historial = historialDe(nombre, juego)

  // Con pocos datos, degradación con gracia: aviso + solo lo gratis (rango y
  // torneos ya están a la vista donde se abre esto). Sin módulos a medias.
  if (s.muestraPequena) {
    return (
      <div className="rounded-2xl border border-[#E0BE63]/35 bg-[#E0BE63]/[0.07] px-4 py-3.5 flex items-center gap-3">
        <span className="h-9 w-9 rounded-xl bg-[#E0BE63]/15 flex items-center justify-center shrink-0"><BarChart3 size={16} className="text-[#E0BE63]" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{tr('sc.pocaMuestra')}</p>
          <p className="text-[12px] text-[#D9C289]">{conParams(tr('sc.pocaMuestraSub'), { n: s.nSets })}</p>
        </div>
      </div>
    )
  }

  const h2h = headToHead(s.nombre, juego)
  const vods = vodsDe(s.nombre, juego)
  // Orden de pintado: las tarjetas altas emparejadas entre sí y las bajas igual,
  // para que la rejilla de 2 columnas no deje huecos (qué módulos APLICAN lo
  // decide la plantilla; esto solo ordena los que pasaron el filtro).
  const ORDEN_VISTA: ModuloScouting[] = ['mains', 'h2h', 'clutch', 'tendencia', 'actividad', 'vods', 'historial']
  const modulos = ORDEN_VISTA.filter(m =>
    plantilla.scoutingModulos.includes(m) && m !== 'crew' && !(m === 'historial' && sinHistorial))
  const pedir = (t: 'Oro' | 'Platino') => setPedirTier(t)

  const tarjeta = (m: ModuloScouting): React.ReactNode => {
    switch (m) {
      case 'mains': return (
        <Muro key={m} requerido="Oro" libre={propio} onPedir={pedir}>
          <Tarjeta icon={<Swords size={13} className="text-[#B6FF3A]" />} titulo={conParams(tr('sc.winratePor'), { label: plantilla.labelMain })}>
            <div className="space-y-2">
              {s.mains.map(mn => (
                <div key={mn.nombre} className="flex items-center gap-2">
                  <PersonajeIcon juegoId={juego} nombre={mn.nombre} px={20} />
                  <span className="text-[12px] font-semibold text-white truncate w-24 shrink-0">{mn.nombre}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full bg-[#B6FF3A]" style={{ width: `${mn.winrate}%` }} />
                  </div>
                  <span className="text-[12px] font-bold text-white font-mono-num shrink-0">{mn.winrate}%</span>
                  <span className="text-[10px] text-[#6B6B85] font-mono-num w-12 text-right shrink-0 whitespace-nowrap">{mn.sets} {tr('sc.sets')}</span>
                </div>
              ))}
            </div>
            {plantilla.preset === 'tcg' && <p className="mt-2 text-[10px] text-[#6B6B85]">{tr('sc.notaDecklist')}</p>}
          </Tarjeta>
        </Muro>
      )
      case 'h2h': return (
        <Muro key={m} requerido="Platino" libre={propio} onPedir={pedir}>
          <Tarjeta icon={<Swords size={13} className="text-[#67E8F9]" />} titulo={tr('sc.h2h')} extra={`${h2h.sets.length} ${tr('sc.sets')}`}>
            <p className="text-xl font-bold text-display leading-none mb-2" style={{ color: h2h.mias > h2h.suyas ? V : h2h.mias < h2h.suyas ? D : '#B8B8CC' }}>
              {h2h.mias}–{h2h.suyas}
              <span className="ml-2 text-[11px] font-semibold text-[#8B8BA8]">
                {h2h.mias > h2h.suyas ? tr('sc.aTuFavor') : h2h.mias < h2h.suyas ? tr('sc.enTuContra') : tr('sc.empatado')}
              </span>
            </p>
            <div className="space-y-1">
              {h2h.sets.map((x, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1 h-4 rounded-full shrink-0" style={{ background: x.ganeYo ? V : D }} />
                  <span className="text-[#B8B8CC] truncate flex-1">{x.ronda} · {x.torneo}</span>
                  <span className="text-[#6B6B85] shrink-0">{etiquetaHace(x.diasHace, idioma)}</span>
                  <span className="font-bold font-mono-num shrink-0" style={{ color: x.ganeYo ? V : D }}>{x.marcador}</span>
                </div>
              ))}
            </div>
          </Tarjeta>
        </Muro>
      )
      case 'clutch': return (
        <Muro key={m} requerido="Platino" libre={propio} onPedir={pedir}>
          <Tarjeta icon={<Activity size={13} className="text-[#FF8A5C]" />} titulo={tr('sc.ajustados')} extra={conParams(tr('sc.deAjustados'), { n: s.nAjustados })}>
            <p className="text-2xl font-bold text-white font-mono-num leading-none">{s.clutchPct}%</p>
            <p className="mt-1.5 text-[11px] text-[#8B8BA8]">{tr('sc.ajustadosSub')}</p>
          </Tarjeta>
        </Muro>
      )
      case 'tendencia': return (
        <Muro key={m} requerido="Platino" libre={propio} onPedir={pedir}>
          <Tarjeta icon={<TrendingUp size={13} className="text-[#4F8EF7]" />} titulo={tr('sc.tendencia')}>
            <p className="flex items-center gap-2 text-sm font-bold" style={{ color: s.tendencia > 0 ? V : s.tendencia < 0 ? D : '#B8B8CC' }}>
              {s.tendencia > 0 ? <TrendingUp size={16} /> : s.tendencia < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
              {s.tendencia > 0 ? tr('sc.sube') : s.tendencia < 0 ? tr('sc.baja') : tr('sc.estable')}
            </p>
            <p className="mt-1 text-[11px] text-[#8B8BA8] font-mono-num">
              {conParams(tr('sc.puestos30d'), { n: s.tendencia > 0 ? `+${s.tendencia}` : `${s.tendencia}` })}
            </p>
          </Tarjeta>
        </Muro>
      )
      case 'actividad': return (
        <Muro key={m} requerido="Oro" libre={propio} onPedir={pedir}>
          <Tarjeta icon={<CalendarClock size={13} className="text-[#9B82FF]" />} titulo={tr('sc.actividad')}>
            <p className="text-2xl font-bold text-white font-mono-num leading-none">{s.torneosMes} <span className="text-[11px] text-[#8B8BA8] font-semibold">{tr('sc.torneosMes')}</span></p>
            <div className="mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden flex">
              <div className="h-full bg-[#9B82FF]" style={{ width: `${s.presencialPct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-[#8B8BA8] font-mono-num">{s.presencialPct}% {tr('sc.presencial')} · {100 - s.presencialPct}% {tr('sc.online')}</p>
          </Tarjeta>
        </Muro>
      )
      case 'vods': return (
        <Muro key={m} requerido="Oro" libre={propio} onPedir={pedir}>
          <Tarjeta icon={<Film size={13} className="text-[#C9A6FF]" />} titulo={tr('sc.vods')}>
            {vods.length === 0 ? (
              <p className="text-[12px] text-[#6B6B85] py-1.5">{tr('sc.sinVideos')}</p>
            ) : (
              <div className="space-y-1.5">
                {vods.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2.5 rounded-xl bg-white/4 border border-white/8 px-3 py-2 hover:bg-white/[0.07] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white truncate">{v.ronda} {v.contraUsuario && <span className="text-[#8B8BA8] font-normal">· {tr('sc.contraTi')}</span>} <span className="font-bold font-mono-num">{v.marcador}</span></p>
                      <p className="text-[10px] text-[#8B8BA8] truncate">{v.torneo}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-[#B6FF3A]/12 border border-[#B6FF3A]/35 text-[#B6FF3A] text-[10px] font-bold">
                      <Play size={10} className="fill-[#B6FF3A]" /> {tr('sc.verSet')}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </Tarjeta>
        </Muro>
      )
      case 'historial': return (
        // Historial: el resumido (3) ya es público → gratis; el resto, Oro.
        <Tarjeta key={m} icon={<Trophy size={13} className="text-[#E0BE63]" />} titulo={tr('sc.historialTorneos')} extra={conParams(tr('sc.nTorneos'), { n: s.torneosJugados })}>
          <div className="space-y-1.5">
            {historial.slice(0, 3).map(e => <FilaHistorial key={e.torneoId + e.nombre} e={e} juego={juego} />)}
            {historial.length > 3 && (
              <Muro requerido="Oro" libre={propio} onPedir={pedir}>
                <div className="space-y-1.5">
                  {historial.slice(3).map(e => <FilaHistorial key={e.torneoId + e.nombre} e={e} juego={juego} />)}
                </div>
              </Muro>
            )}
          </div>
        </Tarjeta>
      )
      default: return null
    }
  }

  return (
    <div>
      {/* La muestra, SIEMPRE visible (regla de oro del spec) */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11px] font-bold bg-[#B6FF3A]/10 text-[#B6FF3A] border border-[#B6FF3A]/30">
          <BarChart3 size={11} /> {conParams(tr('sc.basadoEn'), { n: s.nSets })}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {modulos.map(m => tarjeta(m))}
      </div>
      {pedirTier && <TierSheet requerido={pedirTier} onClose={() => setPedirTier(null)} />}
    </div>
  )
}

function FilaHistorial({ e, juego }: { e: { torneoId: string; nombre: string; fechaLabel: string; puesto: string }; juego: string }) {
  const color = JUEGOS[juego]?.color ?? '#B6FF3A'
  return (
    <Link href={`/torneo/${e.torneoId}/resultados`} className="flex items-center gap-2.5 rounded-xl bg-white/4 border border-white/8 px-3 py-2 hover:bg-white/[0.07] transition-colors">
      <span className="w-1 self-stretch rounded-full" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white truncate">{e.nombre}</p>
        <p className="text-[10px] text-[#8B8BA8]">{e.fechaLabel}</p>
      </div>
      <span className="text-[11px] font-bold text-[#E0BE63] shrink-0">{e.puesto}</span>
    </Link>
  )
}

// ── Sheet modal de scouting de un JUGADOR (accesos contextuales) ─────────────
export function ScoutingSheet({ nombre, juego, onClose }: { nombre: string; juego: string; onClose: () => void }) {
  const { t: tr } = useT()
  const j = JUEGOS[juego]
  const s = scoutingDe(nombre, juego)
  const color = avatarColor(s.nombre)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md sm:max-w-2xl bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[90vh] overflow-y-auto">
        {/* Cabecera: jugador + juego + rango — lo gratis, sin muros */}
        <div className="sticky top-0 z-20 bg-[#141822]/95 backdrop-blur-md border-b border-white/6 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-2xl font-black text-[#0A0A0F] shrink-0" style={{ width: 44, height: 44, background: color, fontSize: 19 }}>{s.nombre[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#67E8F9] flex items-center gap-1"><Search size={10} /> {tr('sc.titulo')}</p>
              <p className="text-lg font-bold text-white text-display leading-tight truncate">{s.nombre}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold shrink-0"
              style={{ background: `${j?.color ?? '#8B8BA8'}1F`, color: j?.color ?? '#B8B8CC', border: `1px solid ${j?.color ?? '#8B8BA8'}44` }}>
              <GameIcon juegoId={juego} size={13} /> {j?.corto ?? juego}
            </span>
            <RangoChip rating={s.rating} size="md" />
            <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/6 flex items-center justify-center text-[#B8B8CC] hover:text-white shrink-0"><X size={15} /></button>
          </div>
        </div>
        <div className="px-5 py-4">
          <ScoutingPanel nombre={s.nombre} juego={juego} />
        </div>
      </div>
    </div>
  )
}

// ── Sheet de scouting de una CREW rival (juegos de equipo) ───────────────────
// Se abre ya tras el muro Platino (la puerta la pone la página de crew), así
// que el roster va destapado: miembro a miembro su mini-scouting (main/agente,
// winrate y muestra) y el agregado del equipo (media, más fuerte, más débil).
export function ScoutingCrewSheet({ crew, onClose }: { crew: Crew; onClose: () => void }) {
  const { t: tr } = useT()
  const j = JUEGOS[crew.juego]
  const sc = scoutingCrew(crew)
  const nombreDe = (m: { nombre: string; esUsuario: boolean }) => m.esUsuario ? tr('crew.tu') : m.nombre

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md sm:max-w-2xl bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#141822]/95 backdrop-blur-md border-b border-white/6 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-2xl font-black text-[#0A0A0F] shrink-0" style={{ width: 44, height: 44, background: crew.color ?? j?.color ?? '#B6FF3A', fontSize: 19 }}>{crew.emoji ?? crew.nombre[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#67E8F9] flex items-center gap-1"><Search size={10} /> {tr('sc.equipoTitulo')}</p>
              <p className="text-lg font-bold text-white text-display leading-tight truncate">{crew.nombre} <span style={{ color: crew.color ?? j?.color }}>#{crew.tag}</span></p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold shrink-0"
              style={{ background: `${j?.color ?? '#8B8BA8'}1F`, color: j?.color ?? '#B8B8CC', border: `1px solid ${j?.color ?? '#8B8BA8'}44` }}>
              <GameIcon juegoId={crew.juego} size={13} /> {j?.corto ?? crew.juego}
            </span>
            <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/6 flex items-center justify-center text-[#B8B8CC] hover:text-white shrink-0"><X size={15} /></button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Agregado: media + más fuerte/más débil */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card-premium px-2 py-3 flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('sc.mediaEquipo')}</span>
              <span className="text-xl font-bold text-white font-mono-num leading-none">{sc.media}</span>
              <RangoChip rating={sc.media} />
            </div>
            <div className="card-premium px-2 py-3 flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold flex items-center gap-1"><Crown size={10} className="text-[#E0BE63]" /> {tr('sc.masFuerte')}</span>
              <span className="text-sm font-bold text-white truncate max-w-full">{nombreDe(sc.masFuerte)}</span>
              <span className="text-[11px] text-[#8B8BA8] font-mono-num">{sc.masFuerte.rating}</span>
            </div>
            <div className="card-premium px-2 py-3 flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('sc.masDebil')}</span>
              <span className="text-sm font-bold text-white truncate max-w-full">{nombreDe(sc.masDebil)}</span>
              <span className="text-[11px] text-[#8B8BA8] font-mono-num">{sc.masDebil.rating}</span>
            </div>
          </div>

          {/* Roster: mini-scouting por miembro, con su muestra */}
          <div>
            <div className="flex items-center gap-2 mb-2"><Users size={13} className="text-[#7C5CFF]" /><p className="text-[10px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold">{tr('sc.roster')} ({sc.miembros.length})</p></div>
            <div className="card-premium overflow-hidden divide-y divide-white/5">
              {sc.miembros.map(m => {
                const fila = (
                  <>
                    <span className="shrink-0 rounded-full flex items-center justify-center font-black text-[#0A0A0F]"
                      style={{ width: 34, height: 34, fontSize: 13, background: m.esUsuario ? '#B6FF3A' : avatarColor(m.nombre) }}>
                      {nombreDe(m)[0].toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{nombreDe(m)}</p>
                      <p className="text-[10px] text-[#8B8BA8] flex items-center gap-1">
                        {m.main && <><PersonajeIcon juegoId={crew.juego} nombre={m.main} px={13} /> {m.main} ·</>} {m.winrate}% · {m.nSets} {tr('sc.sets')}
                      </p>
                    </div>
                    <RangoChip rating={m.rating} />
                    <span className="text-sm font-bold text-white font-mono-num w-12 text-right shrink-0">{m.rating}</span>
                  </>
                )
                return m.esUsuario ? (
                  <div key={m.nombre} className="flex items-center gap-3 px-4 py-2.5">{fila}</div>
                ) : (
                  <Link key={m.nombre} href={`/jugador/${encodeURIComponent(m.nombre)}?juego=${crew.juego}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors">{fila}</Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
