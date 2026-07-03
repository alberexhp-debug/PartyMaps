'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  Star, Bell, BellOff, Shield, LogOut, ChevronRight,
  Users, Trophy, Edit3, Camera, AlertCircle, Lightbulb, ClipboardCheck, Award, Medal,
} from 'lucide-react'
import { usePushSubscription } from '@/lib/hooks/usePushSubscription'
import { CompetitiveCard } from '@/components/todh/CompetitiveCard'
import { CountUp } from '@/components/ui/CountUp'

const LOGROS = [
  { icon: '🥇', label: 'Campeón regional' },
  { icon: '🔥', label: 'Racha de 10' },
  { icon: '🎯', label: '50 torneos' },
  { icon: '⚡', label: 'Madrugador' },
  { icon: '🤝', label: 'Buen rival' },
]
const HISTORIAL = [
  { torneo: 'Lima Smash Weekly #41', puesto: 'Top 4', juego: 'Smash', color: '#E63E54', fecha: 'hace 1 sem' },
  { torneo: 'SF6 Newcomers Night', puesto: '🥈 2º', juego: 'SF6', color: '#2EC4B6', fecha: 'hace 2 sem' },
  { torneo: 'TFT Friday Showdown', puesto: '🥇 1º', juego: 'TFT', color: '#4F8EF7', fecha: 'hace 3 sem' },
  { torneo: 'Magic Commander League', puesto: 'Top 8', juego: 'Magic', color: '#F4912B', fecha: 'hace 1 mes' },
]

export default function PerfilPage() {
  const router = useRouter()
  const toast = useToast()
  const { usuario, setUsuario } = useAuthStore()
  const demo = !usuario
  const [loggingOut, setLoggingOut] = useState(false)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(usuario?.nombre || '')
  const [stats, setStats] = useState({ entradas: 0 })
  const [pendientesValorar, setPendientesValorar] = useState(0)
  const [amigosPendientes, setAmigosPendientes] = useState(0)
  const push = usePushSubscription()

  const inscritos = useDemoStore(s => s.inscritos)
  const seguidos = useDemoStore(s => s.seguidos)
  const avatarEmoji = useDemoStore(s => s.avatarEmoji)
  const setAvatarEmoji = useDemoStore(s => s.setAvatarEmoji)
  const [avatarPicker, setAvatarPicker] = useState(false)
  const AVATARS = ['🎮', '⚔️', '🃏', '🏆', '👾', '🔥', '⚡', '🦾', '🐉', '🌟', '🎯', '🕹️']

  useEffect(() => {
    if (!usuario) return
    fetch('/api/amigos').then(r => (r.ok ? r.json() : null))
      .then(d => { if (Array.isArray(d?.recibidas)) setAmigosPendientes(d.recibidas.length) })
      .catch(() => {})
    ;(async () => {
      const { count: e } = await supabase.from('entradas').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id)
      setStats({ entradas: e ?? 0 })
      try {
        const res = await fetch('/api/planes/pendientes-valorar')
        if (res.ok) { const j = await res.json(); setPendientesValorar((j.pendientes ?? []).length) }
      } catch {}
    })()
  }, [usuario])

  const nombre = usuario?.nombre || 'Invitado'
  // Identidad de showcase (no hay aún tabla competitiva real): siempre poblada
  const torneosJugados = 23 + Math.max(inscritos.length, stats.entradas)
  const crew = 12
  const sigoTOs = 3 + seguidos.length

  const logout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    setUsuario(null)
    router.push('/explorar')
  }
  const guardarNombre = async () => {
    if (!usuario) { setEditandoNombre(false); return }
    if (nuevoNombre.trim().length < 2) { toast.error('El nombre es demasiado corto'); return }
    const { error } = await supabase.from('usuarios').update({ nombre: nuevoNombre.trim() }).eq('id', usuario.id)
    if (error) { toast.error('Error al guardar'); return }
    setUsuario({ ...usuario, nombre: nuevoNombre.trim() })
    setEditandoNombre(false)
    toast.success('Nombre actualizado')
  }

  return (
    <div className="relative min-h-screen pb-28 overflow-hidden">
      <div className="hero-halo-rose" />
      <div className="hero-halo-violet" />

      <div className="relative px-5 pt-6 pb-2 safe-top">
        <p className="eyebrow eyebrow-muted mb-2">Tu cuenta</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Perfil</h1>
      </div>

      <div className="relative px-4 space-y-5 mt-4">
        {/* Tarjeta usuario */}
        <div className={cn('card-premium p-5 stagger-item relative', avatarPicker && 'z-30')} style={{ ['--delay' as string]: '40ms' }}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-[0_10px_28px_-10px_rgba(0,0,0,0.7)] ring-1 ring-white/12">
                {usuario?.foto_perfil_url && !avatarEmoji ? (
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
                  {avatarEmoji && <button onClick={() => { setAvatarEmoji(null); setAvatarPicker(false) }} className="mt-2 w-full h-8 rounded-lg bg-white/6 text-[#B8B8CC] text-xs font-semibold">Quitar</button>}
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
                    <Button size="sm" onClick={guardarNombre}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditandoNombre(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white text-display truncate">{nombre}</h2>
                    {!demo && <button onClick={() => setEditandoNombre(true)} className="text-[#6B6B85] hover:text-white transition-colors"><Edit3 size={14} /></button>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-bold bg-[#A78BFA]/15 text-[#A78BFA] border border-[#A78BFA]/40">Diamante</span>
                    <span className="text-sm text-[#A0A0B8]">Madrid 🇪🇸</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Star size={13} className="text-[#F39C12] fill-current" />
                    <span className="text-sm text-[#F39C12] font-bold font-mono-num">4.8</span>
                    <span className="text-xs text-[#6B6B85]">· 31 valoraciones</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Identidad competitiva */}
        <div className="stagger-item" style={{ ['--delay' as string]: '90ms' }}>
          <CompetitiveCard />
        </div>

        {/* KPIs torneos */}
        <div className="grid grid-cols-3 gap-3 stagger-item" style={{ ['--delay' as string]: '120ms' }}>
          <KPITile icon={Trophy} label="Torneos" value={torneosJugados} color="#B6FF3A" onClick={() => router.push('/entradas')} />
          <KPITile icon={Users} label="Crew" value={crew} color="#7C5CFF" onClick={() => router.push('/amigos')} />
          <KPITile icon={Bell} label="Sigo" value={sigoTOs} color="#4F8EF7" onClick={() => router.push('/amigos')} />
        </div>

        {/* Logros */}
        <div className="stagger-item" style={{ ['--delay' as string]: '160ms' }}>
          <div className="flex items-center gap-2 mb-2"><Award size={15} className="text-[#E0BE63]" /><p className="eyebrow eyebrow-muted">Logros</p></div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {LOGROS.map(l => (
              <div key={l.label} className="shrink-0 flex flex-col items-center gap-1.5 w-20 card-premium card-int py-3 px-1" title={l.label}>
                <span className="text-2xl">{l.icon}</span>
                <span className="text-[10px] text-[#B8B8CC] text-center leading-tight font-medium">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Historial */}
        <div className="stagger-item" style={{ ['--delay' as string]: '200ms' }}>
          <div className="flex items-center gap-2 mb-2"><Medal size={15} className="text-[#9B82FF]" /><p className="eyebrow eyebrow-muted">Historial reciente</p></div>
          <div className="card-premium overflow-hidden divide-y divide-white/5">
            {HISTORIAL.map(h => (
              <div key={h.torneo} className="flex items-center gap-3 px-4 py-3">
                <span className="w-1 h-9 rounded-full shrink-0" style={{ background: h.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{h.torneo}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{h.juego} · {h.fecha}</p>
                </div>
                <span className="text-sm font-bold text-[#E0BE63] shrink-0">{h.puesto}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notificaciones push (solo con sesión real) */}
        {!demo && (
          <div className="card-premium p-5 stagger-item" style={{ ['--delay' as string]: '280ms' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', push.estado === 'activado' ? 'bg-[#4F8EF7]/15 text-[#4F8EF7]' : 'bg-white/5 text-[#6B6B85]')}>
                  {push.estado === 'activado' ? <Bell size={18} /> : <BellOff size={18} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Notificaciones push</p>
                  <p className="text-xs text-[#A0A0B8] mt-0.5">
                    {push.estado === 'activado' && 'Recibirás avisos de tus torneos'}
                    {push.estado === 'desactivado' && 'Actívalas para no perderte nada'}
                    {push.estado === 'denegado' && 'Permiso bloqueado en este navegador'}
                    {push.estado === 'no-soportado' && 'Tu navegador no admite Web Push'}
                  </p>
                </div>
              </div>
              {push.estado === 'desactivado' && (
                <Button size="sm" loading={push.trabajando} onClick={async () => {
                  const ok = await push.activar(); if (ok) toast.success('¡Notificaciones activadas!'); else toast.error('No se pudieron activar')
                }}>Activar</Button>
              )}
            </div>
          </div>
        )}

        {/* Opciones */}
        <div className="card-premium overflow-hidden divide-y divide-white/5 stagger-item" style={{ ['--delay' as string]: '360ms' }}>
          <OpcionPerfil icon={Users} label="Amigos y grupos" badge={amigosPendientes > 0 ? amigosPendientes : undefined} onClick={() => router.push('/amigos')} />
          <OpcionPerfil icon={Bell} label="Notificaciones" onClick={() => router.push('/notificaciones')} />
          {!demo && <OpcionPerfil icon={ClipboardCheck} label="Valoraciones pendientes" badge={pendientesValorar > 0 ? pendientesValorar : undefined} onClick={() => router.push('/perfil/valoraciones-pendientes')} />}
          {!demo && <OpcionPerfil icon={Lightbulb} label="Mis sugerencias enviadas" onClick={() => router.push('/perfil/sugerencias')} />}
          <OpcionPerfil icon={Shield} label="Privacidad y datos" onClick={() => router.push(demo ? '/explorar' : '/perfil/privacidad')} />
        </div>

        {/* Sesión */}
        {demo ? (
          <button onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">
            Iniciar sesión
          </button>
        ) : (
          <button onClick={logout} disabled={loggingOut}
            className={cn('w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-[#B6FF3A]/30 text-[#B6FF3A] text-sm font-semibold transition-colors disabled:opacity-50 hover:bg-[#B6FF3A]/10')}>
            <LogOut size={16} />{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        )}

        <div className="divider-gradient mt-6" />
        <p className="text-center text-[10px] text-[#6B6B85] tracking-[0.18em] uppercase pb-2">TODH · v0.1.0</p>
      </div>
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
