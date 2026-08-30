'use client'
import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Award, Lock, Users, Crown, LogOut, Pencil, X, UserPlus, UserMinus, ShieldCheck, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemoStore, type Crew } from '@/lib/stores/useDemoStore'
import {
  CREW_USUARIO, puntuacionCrew, nivelCrew, siguienteNivelCrew, ratingEnJuego,
  logrosDeCrew, CLAVE_NIVEL_CREW, esAdminCrew,
} from '@/lib/torneos/crews'
import { CrewEmblema, NIVELES_CREW, UMBRALES_NIVEL_CREW } from '@/components/todh/CrewEmblema'
import { GameIcon } from '@/components/todh/GameIcon'
import { RangoChip } from '@/components/todh/RangoChip'
import { BANNERS_PRESET, fondoBanner } from '@/components/todh/bannerPresets'
import { JUEGOS, plantillaDe } from '@/lib/torneos/sample'
import { ScoutingCrewSheet } from '@/components/todh/ScoutingSheet'
import { TierSheet, tieneAcceso } from '@/components/todh/TierSheet'
import { useT } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Vista de crew (F6): emblema grande con su nivel REAL (media de los miembros),
// nombre + #TAG + juego, puntuación y distancia al siguiente emblema, miembros
// con su rating y logros de la crew (mismo lenguaje visual que /perfil/logros).
// Administración (paquete Chat 30-08): si eres admin (creador o con rol
// concedido) tienes el botón Editar → nombre, descripción, banner y gestión de
// miembros (añadir de tus amigos, quitar a cualquiera MENOS al creador, y
// conceder «Hacer admin»; revocar el rol solo puede el creador).
// ─────────────────────────────────────────────────────────────────────────────

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

export default function CrewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t: tr, idioma } = useT()
  const crews = useDemoStore(s => s.crews)
  const salirCrew = useDemoStore(s => s.salirCrew)
  const tierUsuario = useDemoStore(s => s.tierUsuario)
  const [editar, setEditar] = useState(false)
  // Scouting v1: «Estudiar equipo» en crews AJENAS de juegos de equipo (Platino)
  const [scoutCrew, setScoutCrew] = useState(false)
  const [tierScout, setTierScout] = useState(false)
  const scoutPendiente = useRef(false)
  const crew = crews.find(c => c.id === id)

  if (!crew) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Users size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">{tr('crew.noEncontrada')}</p>
        <Link href="/amigos" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">← {tr('amigos.titulo')}</Link>
      </div>
    )
  }

  const juego = JUEGOS[crew.juego]
  const color = crew.color ?? juego?.color ?? '#B6FF3A'
  const media = puntuacionCrew(crew)
  const nivel = nivelCrew(crew)
  const colorNivel = NIVELES_CREW[nivel - 1].color
  const sig = siguienteNivelCrew(media)
  const minActual = UMBRALES_NIVEL_CREW[nivel - 1].min
  const pctNivel = sig ? Math.min(100, Math.round(((media - minActual) / (UMBRALES_NIVEL_CREW[sig.nivel - 1].min - minActual)) * 100)) : 100
  const soyMiembro = crew.miembros.includes(CREW_USUARIO)
  const soyAdmin = esAdminCrew(crew, CREW_USUARIO)
  const soyCreador = crew.creador === CREW_USUARIO
  const logros = logrosDeCrew(crew)
  const nLogros = logros.filter(l => l.desbloqueado).length
  // Solo tiene sentido estudiar a un EQUIPO rival: crew ajena + juego de equipo.
  const esEstudiable = !soyMiembro && plantillaDe(crew.juego).scouting === 'equipo'
  const estudiarEquipo = () => {
    if (tieneAcceso(tierUsuario, 'Platino')) setScoutCrew(true)
    else { scoutPendiente.current = true; setTierScout(true) }
  }

  const salir = () => {
    // Si eres el creador y quedan miembros, la crew PERSISTE: hereda el admin
    // más antiguo (salirCrew, useDemoStore); solo se disuelve si queda vacía.
    const aviso = soyCreador
      ? `${tr('crew.salir')} · ${crew.miembros.length > 1 ? tr('crew.salirHereda') : tr('crew.salirDisuelve')}`
      : `${tr('crew.salir')}: ${crew.nombre} #${crew.tag}`
    if (confirm(aviso)) { salirCrew(crew.id); router.push('/amigos') }
  }

  return (
    <div className="relative min-h-screen pb-12 max-w-lg mx-auto lg:max-w-none lg:mx-0">
      <div className="px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <div className="flex items-center gap-3 lg:max-w-5xl">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Crew</p>
            <p className="text-base font-bold text-white truncate">{crew.nombre} <span style={{ color }}>#{crew.tag}</span></p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5 lg:max-w-5xl lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0 lg:items-start">
        <div className="space-y-5">
          {/* Identidad: emblema grande con el nivel real. El banner elegido por
              los admins se pinta como fondo de la cabecera. */}
          <div className="card-premium p-6 flex flex-col items-center text-center relative overflow-hidden">
            {crew.banner && (
              <>
                <div aria-hidden className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: fondoBanner(crew.banner) }} />
                <div aria-hidden className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 15%, #12161F 100%)' }} />
              </>
            )}
            {/* Editar (solo admins): nombre, descripción, banner y miembros */}
            {soyAdmin && (
              <button onClick={() => setEditar(true)}
                className="absolute top-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl glass-strong border border-white/12 text-[12px] font-bold text-[#B8B8CC] hover:text-white transition-colors">
                <Pencil size={12} /> {tr('crew.editar')}
              </button>
            )}
            <div className="relative"><CrewEmblema nivel={nivel} variant="medallion" size={112} title={tr(CLAVE_NIVEL_CREW[nivel])} /></div>
            <h1 className="relative mt-4 text-2xl font-black text-white text-display">
              {crew.emoji && <span className="mr-1.5">{crew.emoji}</span>}{crew.nombre} <span style={{ color }}>#{crew.tag}</span>
            </h1>
            {crew.descripcion && <p className="relative mt-2 max-w-sm text-[13px] text-[#B8B8CC] leading-snug">{crew.descripcion}</p>}
            <div className="mt-2 flex items-center gap-2 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold"
                style={{ background: `${juego?.color ?? '#8B8BA8'}22`, color: juego?.color ?? '#B8B8CC', border: `1px solid ${juego?.color ?? '#8B8BA8'}55` }}>
                <GameIcon juegoId={crew.juego} size={13} /> {juego?.nombre ?? crew.juego}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-black"
                style={{ background: `${colorNivel}1F`, color: colorNivel, border: `1px solid ${colorNivel}55` }}>
                {tr(CLAVE_NIVEL_CREW[nivel])}
              </span>
              {crew.creadaPorMi && (
                <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold bg-[#E7CB86]/12 text-[#E7CB86] border border-[#E7CB86]/40">
                  <Crown size={11} /> {tr('crew.tuya')}
                </span>
              )}
            </div>

            {/* Puntuación media + a cuánto está del siguiente emblema */}
            <div className="mt-5 w-full">
              <div className="flex items-end justify-between">
                <p className="text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{tr('crew.media')}</p>
                <p className="text-3xl font-bold text-white font-mono-num leading-none" style={{ color: colorNivel }}>{media}</p>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pctNivel}%`, background: `linear-gradient(90deg, ${colorNivel}, ${sig ? NIVELES_CREW[sig.nivel - 1].color : colorNivel})` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-[#8B8BA8]">
                {tr('crew.mediaSub')} ·{' '}
                {sig
                  ? <span className="font-semibold" style={{ color: NIVELES_CREW[sig.nivel - 1].color }}>
                      {idioma === 'en' ? `${sig.faltan} pts to ${tr(CLAVE_NIVEL_CREW[sig.nivel])}` : `a ${sig.faltan} pts de ${tr(CLAVE_NIVEL_CREW[sig.nivel])}`}
                    </span>
                  : <span className="font-semibold text-[#B6FF3A]">{tr('crew.nivelMax')}</span>}
              </p>
            </div>
          </div>

          {/* Scouting v1: estudiar al equipo rival (Platino; sin tier → TierSheet) */}
          {esEstudiable && (
            <button onClick={estudiarEquipo}
              className="w-full h-11 rounded-xl border border-[#67E8F9]/35 bg-[#67E8F9]/[0.08] text-[#67E8F9] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#67E8F9]/[0.14] transition-colors">
              <Search size={15} /> {tr('sc.estudiarEquipo')}
            </button>
          )}

          {/* Miembros con su rating en el juego de la crew */}
          <div>
            <div className="flex items-center gap-2 mb-2"><Users size={15} className="text-[#7C5CFF]" /><p className="eyebrow eyebrow-muted">{tr('crew.miembros')} ({crew.miembros.length})</p></div>
            <div className="card-premium overflow-hidden divide-y divide-white/5">
              {crew.miembros.map(m => {
                const esUsuario = m === CREW_USUARIO
                const nombre = esUsuario ? tr('crew.tu') : m
                const rating = ratingEnJuego(m, crew.juego)
                const esCreador = m === crew.creador
                const esAdmin = !esCreador && esAdminCrew(crew, m)
                return (
                  <div key={m} className="flex items-center gap-3 px-4 py-3">
                    <span className="shrink-0 rounded-full flex items-center justify-center font-black text-[#0A0A0F]"
                      style={{ width: 36, height: 36, fontSize: 14, background: esUsuario ? '#B6FF3A' : avatarColor(m) }}>
                      {nombre[0].toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">
                      {nombre}
                      {/* Corona = creador (admin permanente); chip = rol Admin concedido */}
                      {esCreador && <Crown size={12} className="ml-1.5 inline text-[#E7CB86]" />}
                      {esAdmin && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 h-[18px] rounded-full align-middle text-[9px] font-black uppercase tracking-wide bg-[#7C5CFF]/15 text-[#B7A4FF] border border-[#7C5CFF]/40">
                          <ShieldCheck size={9} /> {tr('crew.admin')}
                        </span>
                      )}
                    </span>
                    <RangoChip rating={rating} />
                    <span className="text-sm font-bold text-white font-mono-num w-12 text-right">{rating}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Logros de la crew: mismos tiles que los logros del perfil */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award size={15} className="text-[#E0BE63]" /><p className="eyebrow eyebrow-muted">{tr('crew.logros')}</p>
              <span className="ml-auto text-[11px] font-bold text-[#8B8BA8] font-mono-num">{nLogros}/{logros.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {logros.map(({ logro, desbloqueado }, i) => {
                const Icon = logro.icon
                return desbloqueado ? (
                  <div key={logro.id} className="card-premium p-4 flex flex-col items-center text-center gap-2 stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${logro.color}1A`, border: `1px solid ${logro.color}40` }}>
                      <Icon size={22} style={{ color: logro.color }} />
                    </span>
                    <p className="text-[13px] font-bold text-white leading-tight">{tr(logro.titulo)}</p>
                    <p className="text-[11px] text-[#8B8BA8] leading-snug">{tr(logro.condicion)}</p>
                  </div>
                ) : (
                  <div key={logro.id} className="card-premium p-4 flex flex-col items-center text-center gap-2 opacity-80 stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>
                    <span className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10">
                      <Icon size={22} className="text-[#565670]" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1D2230] border border-white/15 flex items-center justify-center">
                        <Lock size={10} className="text-[#8B8BA8]" />
                      </span>
                    </span>
                    <p className="text-[13px] font-bold text-[#8B8BA8] leading-tight">{tr(logro.titulo)}</p>
                    <p className="text-[11px] text-[#6B6B85] leading-snug">{tr(logro.condicion)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {soyMiembro && (
            <button onClick={salir}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-[#FF6B6B]/25 text-[#FF8A8A] text-sm font-semibold hover:bg-[#FF6B6B]/10 transition-colors">
              <LogOut size={15} /> {tr('crew.salir')}
            </button>
          )}
        </div>
      </div>

      {editar && <EditarCrewSheet crew={crew} soyCreador={soyCreador} onClose={() => setEditar(false)} />}
      {scoutCrew && <ScoutingCrewSheet crew={crew} onClose={() => setScoutCrew(false)} />}
      {tierScout && (
        <TierSheet requerido="Platino" onClose={() => {
          setTierScout(false)
          const p = scoutPendiente.current
          scoutPendiente.current = false
          // Activó Platino desde el sheet → el scouting pendiente se abre ya.
          if (p && tieneAcceso(useDemoStore.getState().tierUsuario, 'Platino')) setScoutCrew(true)
        }} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hoja «Editar crew» (solo admins): nombre, descripción, banner (presets con
// la estética de la app) y gestión de miembros — añadir de TUS amigos, quitar
// a cualquiera MENOS al creador y conceder «Hacer admin». Revocar el rol solo
// puede el creador (soyCreador). Los invariantes duros los re-garantiza el
// store (quitarMiembroCrew/alternarAdminCrew nunca tocan al creador).
// ─────────────────────────────────────────────────────────────────────────────
function EditarCrewSheet({ crew, soyCreador, onClose }: { crew: Crew; soyCreador: boolean; onClose: () => void }) {
  const { t: tr } = useT()
  const amigos = useDemoStore(s => s.amigos)
  const editarCrew = useDemoStore(s => s.editarCrew)
  const agregarMiembro = useDemoStore(s => s.agregarMiembroCrew)
  const quitarMiembro = useDemoStore(s => s.quitarMiembroCrew)
  const alternarAdmin = useDemoStore(s => s.alternarAdminCrew)

  const [nombre, setNombre] = useState(crew.nombre)
  const [descripcion, setDescripcion] = useState(crew.descripcion ?? '')
  const [banner, setBanner] = useState<string | null>(crew.banner ?? null)

  const candidatos = amigos.filter(a => !crew.miembros.includes(a))

  const guardar = () => {
    editarCrew(crew.id, { nombre, descripcion, banner })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl bg-[#12161F] p-6 sm:rounded-3xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{tr('crew.editarTitulo')} <span className="text-[#8B8BA8] font-mono-num">#{crew.tag}</span></h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={40} placeholder={tr('crew.nombrePh')}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />

          {/* Descripción (campo nuevo del paquete Chat) */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-[#A0A0B8]">{tr('crew.descripcion')}</p>
              <span className="text-[11px] text-[#6B6B85] font-mono-num">{descripcion.length}/160</span>
            </div>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value.slice(0, 160))} maxLength={160} rows={3}
              placeholder={tr('crew.descripcionPh')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#B6FF3A]/60 resize-none placeholder:text-[#6B6B85]" />
          </div>

          {/* Banner: presets de gradiente (o ninguno) */}
          <div>
            <p className="mb-2 text-sm font-medium text-[#A0A0B8]">{tr('crew.bannerLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {BANNERS_PRESET.map(b => (
                <button key={b.id} onClick={() => setBanner(banner === b.css ? null : b.css)} aria-label={`${tr('crew.bannerLabel')} ${b.nombre}`}
                  className={cn('h-12 rounded-xl border transition-all', banner === b.css ? 'border-[#B6FF3A] ring-1 ring-[#B6FF3A]' : 'border-white/10 hover:border-white/25')}
                  style={{ background: b.css }} />
              ))}
            </div>
          </div>

          {/* Miembros: quitar (nunca al creador), conceder/revocar Admin */}
          <div>
            <p className="mb-2 text-sm font-medium text-[#A0A0B8]">{tr('crew.miembros')} ({crew.miembros.length})</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {crew.miembros.map(m => {
                const esCreador = m === crew.creador
                const esAdmin = !esCreador && esAdminCrew(crew, m)
                const nombreM = m === CREW_USUARIO ? tr('crew.tu') : m
                return (
                  <div key={m} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <span className="shrink-0 rounded-full flex items-center justify-center font-black text-[#0A0A0F]"
                      style={{ width: 30, height: 30, fontSize: 12, background: m === CREW_USUARIO ? '#B6FF3A' : avatarColor(m) }}>
                      {nombreM[0].toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm font-semibold text-white">
                      {nombreM}
                      {esCreador && <Crown size={11} className="ml-1.5 inline text-[#E7CB86]" />}
                      {esAdmin && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 h-[17px] rounded-full align-middle text-[9px] font-black uppercase tracking-wide bg-[#7C5CFF]/15 text-[#B7A4FF] border border-[#7C5CFF]/40">
                          <ShieldCheck size={9} /> {tr('crew.admin')}
                        </span>
                      )}
                    </span>
                    {/* Hacer admin (cualquier admin) · Quitar admin (solo el creador) */}
                    {!esCreador && m !== CREW_USUARIO && (
                      esAdmin
                        ? soyCreador && (
                            <button onClick={() => alternarAdmin(crew.id, m)} aria-label={`${tr('crew.quitarAdmin')}: ${nombreM}`}
                              className="shrink-0 h-7 px-2 rounded-lg border border-white/10 text-[10px] font-bold text-[#8B8BA8] hover:text-white">
                              {tr('crew.quitarAdmin')}
                            </button>
                          )
                        : (
                            <button onClick={() => alternarAdmin(crew.id, m)} aria-label={`${tr('crew.hacerAdmin')}: ${nombreM}`}
                              className="shrink-0 h-7 px-2 rounded-lg border border-[#7C5CFF]/40 text-[10px] font-bold text-[#B7A4FF] hover:bg-[#7C5CFF]/10">
                              {tr('crew.hacerAdmin')}
                            </button>
                          )
                    )}
                    {/* Al creador no se le puede quitar: solo puede salirse él mismo */}
                    {!esCreador && (
                      <button onClick={() => quitarMiembro(crew.id, m)} aria-label={`${tr('crew.quitarMiembro')} ${nombreM}`}
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[#6B6B85] hover:text-[#FF8A8A]">
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Añadir miembros: de tus amigos que aún no estén dentro */}
          {candidatos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-[#A0A0B8]">{tr('crew.anadirMiembros')}</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {candidatos.map(a => (
                  <div key={a} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <span className="shrink-0 rounded-full flex items-center justify-center font-black text-[#0A0A0F]"
                      style={{ width: 30, height: 30, fontSize: 12, background: avatarColor(a) }}>{a[0].toUpperCase()}</span>
                    <span className="flex-1 min-w-0 truncate text-sm text-white">{a}</span>
                    <button onClick={() => agregarMiembro(crew.id, a)}
                      className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-[10px] font-bold">
                      <UserPlus size={11} /> {tr('am.agregar')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={guardar} className="h-12 w-full rounded-xl bg-[#B6FF3A] font-semibold text-[#0A0A0F]">
            {tr('comun.guardar')}
          </button>
        </div>
      </div>
    </div>
  )
}
