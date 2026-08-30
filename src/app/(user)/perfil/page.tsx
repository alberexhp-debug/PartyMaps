'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useSesionStore, useEsCuentaFresca } from '@/lib/stores/useSesionStore'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  Star, Bell, Shield, LogOut, ChevronRight,
  Users, Trophy, Edit3, Camera, Award, Medal, Globe2, Lock, Swords,
  Ticket, Copy, Check,
} from 'lucide-react'
import { CREW_USUARIO, nivelCrew, puntuacionCrew } from '@/lib/torneos/crews'
import { CrewEmblema } from '@/components/todh/CrewEmblema'
import { EditarPerfilSheet } from '@/components/todh/EditarPerfilSheet'
import { fondoBanner } from '@/components/todh/bannerPresets'
import { CompetitiveCard } from '@/components/todh/CompetitiveCard'
import { ReferidosCard } from '@/components/todh/ReferidosCard'
import { PerfilDualCard } from '@/components/todh/PerfilDualCard'
import { TierSheet } from '@/components/todh/TierSheet'
import { GameIcon } from '@/components/todh/GameIcon'
import { useT } from '@/lib/i18n'
import { CountUp } from '@/components/ui/CountUp'
import { JUEGOS, HISTORIAL_USUARIO, etiquetaHace, resumenValoraciones } from '@/lib/torneos/sample'
import { LOGROS_USUARIO, LOGROS_DESBLOQUEADOS, LOGROS_BLOQUEADOS } from '@/lib/torneos/logros'

// Color del chip de suscripción (solo se pinta si el tier está activo)
const TIER_CHIP: Record<string, string> = { Oro: '#E0BE63', Platino: '#67E8F9', Diamante: '#A78BFA' }

export default function PerfilPage() {
  const router = useRouter()
  const toast = useToast()
  const { usuario, setUsuario } = useAuthStore()
  const demo = !usuario
  const [loggingOut, setLoggingOut] = useState(false)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(usuario?.nombre || '')
  const [stats, setStats] = useState({ entradas: 0 })

  const { t: tr } = useT()
  const idioma = useDemoStore(s => s.idioma)
  const setIdioma = useDemoStore(s => s.setIdioma)
  const inscritos = useDemoStore(s => s.inscritos)
  const tierUsuario = useDemoStore(s => s.tierUsuario)
  const [tierSheet, setTierSheet] = useState(false)
  const seguidos = useDemoStore(s => s.seguidos)
  const avatarEmoji = useDemoStore(s => s.avatarEmoji)
  const setAvatarEmoji = useDemoStore(s => s.setAvatarEmoji)
  const [avatarPicker, setAvatarPicker] = useState(false)
  const AVATARS = ['🎮', '⚔️', '🃏', '🏆', '👾', '🔥', '⚡', '🦾', '🐉', '🌟', '🎯', '🕹️']
  // ── Paquete Chat: identidad editable (foto/banner/bio) + tag #XABCD ──
  const fotoPerfil = useDemoStore(s => s.fotoPerfil)
  const bannerPerfil = useDemoStore(s => s.bannerPerfil)
  const bioPerfil = useDemoStore(s => s.bioPerfil)
  const userTag = useDemoStore(s => s.userTag)
  const asegurarUserTag = useDemoStore(s => s.asegurarUserTag)
  const [editarPerfil, setEditarPerfil] = useState(false)
  const [tagCopiado, setTagCopiado] = useState(false)
  // El tag se genera al PRIMER uso y queda persistido (regenerable 1 vez).
  useEffect(() => { if (!userTag) asegurarUserTag() }, [userTag, asegurarUserTag])
  const copiarTag = () => {
    navigator.clipboard?.writeText(`${nombre}#${userTag ?? ''}`).catch(() => {})
    setTagCopiado(true)
    setTimeout(() => setTagCopiado(false), 1600)
  }

  useEffect(() => {
    // El Invitado del AuthProvider (uuid a ceros) es el modo demo: no hay
    // backend al que preguntar — evita la llamada al Supabase muerto (QA 30-08).
    if (!usuario || usuario.id.startsWith('00000000-')) return
    ;(async () => {
      const { count: e } = await supabase.from('entradas').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id)
      setStats({ entradas: e ?? 0 })
    })()
  }, [usuario])

  // Cuenta VACÍA (fresca): fuera el escaparate fijo de Álex — contadores
  // reales del store, sin historial/valoraciones/logros de muestra.
  const fresca = useEsCuentaFresca()
  const amigosLista = useDemoStore(s => s.amigos)
  const { media: valMedia, total: valTotal } = fresca ? { media: 0, total: 0 } : resumenValoraciones()
  const historial = fresca ? [] : HISTORIAL_USUARIO
  const logrosDesbloqueados = fresca ? [] : LOGROS_DESBLOQUEADOS
  const logrosBloqueados = fresca ? LOGROS_USUARIO : LOGROS_BLOQUEADOS
  const crews = useDemoStore(s => s.crews)
  const misCrews = crews.filter(c => c.miembros.includes(CREW_USUARIO))
  const sesion = useSesionStore(s => s.sesion)
  const logoutSesion = useSesionStore(s => s.logout)
  // Con login demo, manda el nombre de la sesión (el AuthProvider navega como
  // Invitado porque el Supabase de Rumbo ya no existe).
  const nombre = sesion?.nombre || usuario?.nombre || 'Invitado'
  // Identidad de showcase (no hay aún tabla competitiva real): poblada solo
  // para las cuentas legacy; una cuenta nueva cuenta lo suyo de verdad.
  const torneosJugados = fresca ? inscritos.length : 23 + Math.max(inscritos.length, stats.entradas)
  const amistades = fresca ? amigosLista.length : 12
  const sigoTOs = fresca ? seguidos.length : 3 + seguidos.length

  const logout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    setUsuario(null)
    router.push('/explorar')
  }
  const guardarNombre = async () => {
    if (!usuario) { setEditandoNombre(false); return }
    if (nuevoNombre.trim().length < 2) { toast.error(tr('pfl.nombreCorto')); return }
    const { error } = await supabase.from('usuarios').update({ nombre: nuevoNombre.trim() }).eq('id', usuario.id)
    if (error) { toast.error(tr('pfl.errorGuardar')); return }
    setUsuario({ ...usuario, nombre: nuevoNombre.trim() })
    setEditandoNombre(false)
    toast.success(tr('pfl.nombreOk'))
  }

  return (
    <div className="relative min-h-screen pb-28 overflow-hidden">
      <div className="hero-halo-rose" />
      <div className="hero-halo-violet" />

      <div className="relative px-5 pt-6 pb-2 safe-top lg:max-w-none">
        <p className="eyebrow eyebrow-muted mb-2">{tr('perfil.eyebrow')}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">{tr('perfil.titulo')}</h1>
      </div>

      {/* Escritorio: identidad a la izquierda, actividad/ajustes a la derecha */}
      <div className="relative px-4 mt-4 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start lg:max-w-none">
        <div className="space-y-5">
        {/* Tarjeta usuario. La cabecera pinta el banner elegido en Editar perfil
            como fondo (desvanecido hacia el cuerpo de la tarjeta). */}
        <div className={cn('card-premium p-5 stagger-item relative overflow-hidden', avatarPicker && 'z-30')} style={{ ['--delay' as string]: '40ms' }}>
          {bannerPerfil && (
            <>
              <div aria-hidden className="absolute inset-x-0 top-0 h-24 pointer-events-none" style={{ background: fondoBanner(bannerPerfil) }} />
              <div aria-hidden className="absolute inset-x-0 top-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 20%, #12161F 100%)' }} />
            </>
          )}
          {/* Editar perfil (paquete Chat): foto propia, banner y bio */}
          <button onClick={() => setEditarPerfil(true)}
            className="absolute top-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 h-8 px-3 rounded-xl glass-strong border border-white/12 text-[12px] font-bold text-[#B8B8CC] hover:text-white transition-colors">
            <Edit3 size={12} /> {tr('pfl.editarPerfil')}
          </button>
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-[0_10px_28px_-10px_rgba(0,0,0,0.7)] ring-1 ring-white/12">
                {fotoPerfil ? (
                  // La foto propia (Editar perfil) manda sobre el emoji/inicial
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoPerfil} alt="" className="w-full h-full object-cover" />
                ) : usuario?.foto_perfil_url && !avatarEmoji ? (
                  <img src={usuario.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#B6FF3A] to-[#7C5CFF]">
                    {avatarEmoji
                      ? <span className="text-5xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{avatarEmoji}</span>
                      : <span className="text-display text-4xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{(nombre[0] || '?').toUpperCase()}</span>}
                  </div>
                )}
              </div>
              <button onClick={() => setAvatarPicker(v => !v)} aria-label="Cambiar avatar" className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#B6FF3A] rounded-full flex items-center justify-center shadow-[0_6px_14px_rgba(182,255,58,0.6)] border-2 border-[#0F1219]">
                <Camera size={13} className="text-[#0A0A0F]" />
              </button>
              {avatarPicker && (
                <div className="absolute z-20 top-full mt-2 left-0 w-64 p-2.5 rounded-2xl bg-[#1D2230] border border-white/12 shadow-xl animate-slide-up-sm">
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVATARS.map(e => (
                      <button key={e} onClick={() => { setAvatarEmoji(e); setAvatarPicker(false) }}
                        className={cn('h-9 rounded-lg text-xl flex items-center justify-center transition-colors', avatarEmoji === e ? 'bg-[#B6FF3A]/20 ring-1 ring-[#B6FF3A]' : 'hover:bg-white/8')}>{e}</button>
                    ))}
                  </div>
                  {avatarEmoji && <button onClick={() => { setAvatarEmoji(null); setAvatarPicker(false) }} className="mt-2 w-full h-8 rounded-lg bg-white/6 text-[#B8B8CC] text-xs font-semibold">{tr('sede.quitar')}</button>}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editandoNombre ? (
                <div className="space-y-2">
                  <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} autoFocus
                    className="w-full px-3 py-2 bg-white/5 border border-[#B6FF3A]/60 rounded-xl text-white text-base outline-none focus:ring-2 focus:ring-[#B6FF3A]/30"
                    onKeyDown={e => { if (e.key === 'Enter') guardarNombre() }} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={guardarNombre}>{tr('comun.guardar')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditandoNombre(false)}>{tr('adm.cancelar')}</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-white text-display truncate">
                      {nombre} <span className="text-[15px] font-bold text-[#8B8BA8] font-mono-num align-middle">#{userTag ?? '·····'}</span>
                    </h2>
                    {/* Copiar nombre#tag para compartirlo (búsqueda exacta de amigos) */}
                    <button onClick={copiarTag} aria-label={tr('pfl.copiarTag')} title={tr('pfl.copiarTag')}
                      className={cn('transition-colors', tagCopiado ? 'text-[#B6FF3A]' : 'text-[#6B6B85] hover:text-white')}>
                      {tagCopiado ? <Check size={14} /> : <Copy size={13} />}
                    </button>
                    {tagCopiado && <span className="text-[11px] font-bold text-[#B6FF3A]">{tr('pfl.tagCopiado')}</span>}
                    {!demo && <button onClick={() => setEditandoNombre(true)} className="text-[#6B6B85] hover:text-white transition-colors"><Edit3 size={14} /></button>}
                  </div>
                  {bioPerfil && <p className="mt-1 text-[13px] text-[#B8B8CC] leading-snug">{bioPerfil}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    {tierUsuario && (
                      <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-bold border"
                        style={{ color: TIER_CHIP[tierUsuario] ?? '#E0BE63', borderColor: `${TIER_CHIP[tierUsuario] ?? '#E0BE63'}66`, background: `${TIER_CHIP[tierUsuario] ?? '#E0BE63'}1F` }}>
                        {tierUsuario}
                      </span>
                    )}
                    <span className="text-sm text-[#A0A0B8]">Madrid 🇪🇸</span>
                  </div>
                  {/* Estrellas clicables → todas las valoraciones recibidas */}
                  <Link href="/perfil/valoraciones" className="flex items-center gap-1.5 mt-1.5 group w-fit" aria-label={tr('val.titulo')}>
                    <Star size={13} className={fresca ? 'text-[#6B6B85]' : 'text-[#F39C12] fill-current'} />
                    {fresca ? (
                      <>
                        <span className="text-sm text-[#8B8BA8] font-bold font-mono-num">—</span>
                        <span className="text-xs text-[#6B6B85] group-hover:text-[#A0A0B8] transition-colors">· {tr('pfl.sinValoraciones')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-[#F39C12] font-bold font-mono-num">{valMedia.toFixed(1)}</span>
                        <span className="text-xs text-[#6B6B85] group-hover:text-[#A0A0B8] transition-colors">· {valTotal} {tr('pf.valoraciones')}</span>
                      </>
                    )}
                    <ChevronRight size={12} className="text-[#6B6B85] group-hover:text-white transition-colors" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Identidad competitiva */}
        <div className="stagger-item" style={{ ['--delay' as string]: '90ms' }}>
          <PerfilDualCard />
          <div className="mt-3" />
          <CompetitiveCard />
        </div>

        {/* Invita y gana (programa de referidos del lanzamiento) */}
        <div className="px-4 mt-4">
          <ReferidosCard />
        </div>

        {/* KPIs torneos */}
        <div className="grid grid-cols-3 gap-3 stagger-item" style={{ ['--delay' as string]: '120ms' }}>
          <KPITile icon={Trophy} label={tr('rk2.torneosCap')} value={torneosJugados} color="#B6FF3A" onClick={() => router.push('/entradas')} />
          <KPITile icon={Users} label={tr('amigos.titulo')} value={amistades} color="#7C5CFF" onClick={() => router.push('/amigos')} />
          <KPITile icon={Bell} label={tr('pfl.sigo')} value={sigoTOs} color="#4F8EF7" onClick={() => router.push('/suscritos')} />
        </div>

        {/* Tus crews (F6): bloque compacto — mini-emblema real, #TAG y juego;
            clic → vista de crew. Vive junto a la identidad/KPIs. */}
        {misCrews.length > 0 && (
          <div className="stagger-item" style={{ ['--delay' as string]: '140ms' }}>
            <div className="flex items-center gap-2 mb-2"><Swords size={15} className="text-[#B6FF3A]" /><p className="eyebrow eyebrow-muted">{tr('crew.tus')}</p></div>
            <div className="card-premium overflow-hidden divide-y divide-white/5">
              {misCrews.map(c => (
                <Link key={c.id} href={`/crew/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <CrewEmblema nivel={nivelCrew(c)} variant="tile" size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {c.emoji && <span className="mr-1">{c.emoji}</span>}{c.nombre} <span className="font-black" style={{ color: c.color ?? '#8B8BA8' }}>#{c.tag}</span>
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-[#8B8BA8] font-mono-num">
                      <GameIcon juegoId={c.juego} size={12} /> {JUEGOS[c.juego]?.corto ?? c.juego} · {puntuacionCrew(c)} pts
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
        </div>{/* fin columna izquierda */}

        <div className="space-y-5">
        {/* Logros: la tira entera lleva a /perfil/logros (desbloqueados + bloqueados) */}
        <div className="stagger-item" style={{ ['--delay' as string]: '160ms' }}>
          <div className="flex items-center gap-2 mb-2">
            <Award size={15} className="text-[#E0BE63]" /><p className="eyebrow eyebrow-muted">{tr('perfil.logros')}</p>
            <Link href="/perfil/logros" className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#8B8BA8] hover:text-white transition-colors">
              {tr('perfil.verTodos')} <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {logrosDesbloqueados.map(({ id, icon: Icon, color, titulo }) => (
              <Link key={id} href="/perfil/logros" className="shrink-0 flex flex-col items-center gap-1.5 w-20 card-premium card-int py-3 px-1" title={tr(titulo)}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}1A`, border: `1px solid ${color}40` }}>
                  <Icon size={17} style={{ color }} />
                </span>
                <span className="text-[10px] text-[#B8B8CC] text-center leading-tight font-medium">{tr(titulo)}</span>
              </Link>
            ))}
            {/* Cuenta nueva: 0/11 — todos bloqueados, en gris con candado */}
            {fresca && logrosBloqueados.map(({ id, icon: Icon, titulo }) => (
              <Link key={id} href="/perfil/logros" className="shrink-0 flex flex-col items-center gap-1.5 w-20 card-premium card-int py-3 px-1 opacity-75" title={tr(titulo)}>
                <span className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
                  <Icon size={17} className="text-[#565670]" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#1D2230] border border-white/15 flex items-center justify-center">
                    <Lock size={8} className="text-[#8B8BA8]" />
                  </span>
                </span>
                <span className="text-[10px] text-[#8B8BA8] text-center leading-tight font-medium">{tr(titulo)}</span>
              </Link>
            ))}
            {!fresca && (
              <Link href="/perfil/logros" className="shrink-0 flex flex-col items-center justify-center gap-1.5 w-20 card-premium card-int py-3 px-1" title={tr('logros.bloqueados')}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
                  <Lock size={15} className="text-[#6B6B85]" />
                </span>
                <span className="text-[10px] text-[#8B8BA8] text-center leading-tight font-semibold">+{LOGROS_BLOQUEADOS.length}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Historial reciente (4 últimos, con icono de juego) + Ver todos */}
        <div className="stagger-item" style={{ ['--delay' as string]: '200ms' }}>
          <div className="flex items-center gap-2 mb-2"><Medal size={15} className="text-[#9B82FF]" /><p className="eyebrow eyebrow-muted">{tr('perfil.historial')}</p></div>
          {historial.length === 0 ? (
            // Cuenta nueva: sin torneos jugados → CTA a explorar
            <div className="card-premium p-6 text-center">
              <Trophy size={26} className="mx-auto text-[#8B8BA8]" />
              <p className="mt-2 text-sm font-bold text-white">{tr('pfl.historialVacio')}</p>
              <p className="mt-1 text-[12px] text-[#8B8BA8]">{tr('pfl.historialVacioSub')}</p>
              <Link href="/explorar" className="mt-4 inline-flex h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold items-center">{tr('inicio.explorar')}</Link>
            </div>
          ) : (
            <div className="card-premium overflow-hidden divide-y divide-white/5">
              {historial.slice(0, 4).map(h => (
                <Link key={h.nombre} href={`/torneo/${h.torneoId}/resultados`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <GameIcon juegoId={h.juego} size={34} variant="tile" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{h.nombre}</p>
                    <p className="text-[11px] text-[#8B8BA8]">{JUEGOS[h.juego]?.corto ?? h.juego} · {etiquetaHace(h.diasHace, idioma)}</p>
                  </div>
                  <span className="text-sm font-bold text-[#E0BE63] shrink-0">{h.puesto}</span>
                  <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
                </Link>
              ))}
              <Link href="/perfil/historial" className="flex items-center justify-center gap-1 px-4 py-3 text-[12px] font-bold text-[#B6FF3A] hover:bg-white/[0.03] transition-colors">
                {tr('perfil.verTodos')} ({historial.length}) <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="card-premium overflow-hidden divide-y divide-white/5 stagger-item" style={{ ['--delay' as string]: '360ms' }}>
          {/* Paquete Chat: la fila «Amigos y grupos» era redundante con el nav
              (Chat) — su hueco lo ocupa Entradas, que salió del nav. El badge
              cuenta tus inscripciones activas. */}
          <OpcionPerfil icon={Ticket} label={tr('nav.entradas')} badge={inscritos.length > 0 ? inscritos.length : undefined} onClick={() => router.push('/entradas')} />
          <OpcionPerfil icon={Bell} label={tr('perfil.notis')} onClick={() => router.push('/notificaciones')} />
          <button onClick={() => setTierSheet(true)} className="w-full flex items-center gap-3 px-4 py-4 text-left card-int">
            <div className="w-9 h-9 rounded-xl bg-[#E0BE63]/12 border border-[#E0BE63]/30 flex items-center justify-center">👑</div>
            <span className="flex-1 text-sm text-white font-medium">{tr('tier.titulo')}</span>
            <span className="text-xs font-bold" style={{ color: tierUsuario ? '#B6FF3A' : '#8B8BA8' }}>{tierUsuario ? `${tierUsuario} ${tr('pfl.tierActivo')}` : tr('pfl.desdePrecio')}</span>
          </button>
          <div className="w-full flex items-center gap-3 px-4 py-4">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center"><Globe2 size={16} className="text-[#A0A0B8]" /></div>
            <span className="flex-1 text-sm text-white font-medium text-left">{tr('perfil.idioma')}</span>
            <div className="flex rounded-lg border border-white/10 bg-white/4 p-0.5">
              {(['es', 'en', 'ja'] as const).map(l => (
                <button key={l} onClick={() => setIdioma(l)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-black uppercase transition-colors ${idioma === l ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8]'}`}>{l === 'ja' ? '日本語' : l}</button>
              ))}
            </div>
          </div>
          <OpcionPerfil icon={Shield} label={tr('perfil.privacidad')} onClick={() => router.push(demo ? '/privacidad' : '/perfil/privacidad')} />
        </div>

        {/* Sesión: con login demo, cerrar sesión limpia la sesión y vuelve al login */}
        {sesion ? (
          <button onClick={() => { logoutSesion(); router.replace('/login') }}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-[#B6FF3A]/30 text-[#B6FF3A] text-sm font-semibold hover:bg-[#B6FF3A]/10 transition-colors">
            <LogOut size={16} /> {tr('perfil.cerrarSesion')}
          </button>
        ) : (
          <button onClick={logout} disabled={loggingOut}
            className={cn('w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-[#B6FF3A]/30 text-[#B6FF3A] text-sm font-semibold transition-colors disabled:opacity-50 hover:bg-[#B6FF3A]/10')}>
            <LogOut size={16} />{loggingOut ? '…' : tr('perfil.cerrarSesion')}
          </button>
        )}
        </div>{/* fin columna derecha */}

        <div className="lg:col-span-2">
          <div className="divider-gradient mt-6" />
          <p className="text-center text-[10px] text-[#6B6B85] tracking-[0.18em] uppercase pb-2 pt-2">Torneum · v0.1.0</p>
        </div>
      </div>
      {tierSheet && <TierSheet onClose={() => setTierSheet(false)} />}
      {editarPerfil && <EditarPerfilSheet nombre={nombre} onClose={() => setEditarPerfil(false)} />}
    </div>
  )
}

function KPITile({ icon: Icon, label, value, color, onClick }: { icon: React.ElementType; label: string; value: number; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative card-premium p-3.5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-25 blur-2xl" style={{ background: color }} />
      <div className="relative">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}22`, border: `1px solid ${color}40` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <p className="text-3xl font-bold text-white text-display font-mono-num leading-none"><CountUp value={value} /></p>
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#A0A0B8] font-semibold mt-1.5">{label}</p>
      </div>
    </button>
  )
}

function OpcionPerfil({ icon: Icon, label, onClick, badge }: { icon: React.ElementType; label: string; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/[0.03] transition-colors">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center"><Icon size={16} className="text-[#A0A0B8]" /></div>
      <span className="flex-1 text-sm text-white font-medium text-left">{label}</span>
      {badge != null && badge > 0 && <span className="px-2 py-0.5 rounded-full bg-[#B6FF3A] text-[#0A0A0F] text-[11px] font-bold">{badge}</span>}
      <ChevronRight size={16} className="text-[#6B6B85]" />
    </button>
  )
}
