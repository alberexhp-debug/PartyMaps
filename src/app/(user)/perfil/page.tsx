'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { CartaPerfil } from '@/components/user/CartaPerfil'
import {
  calcularSignoZodiaco, calcularEdad, EMOJI_SIGNO, cn,
} from '@/lib/utils'
import {
  User, Star, Bell, BellOff, Shield, LogOut, ChevronRight,
  Ticket, Users, Edit3, Camera, AlertCircle, Lightbulb, Sparkles, ArrowRight, ClipboardCheck,
} from 'lucide-react'
import { usePushSubscription } from '@/lib/hooks/usePushSubscription'

export default function PerfilPage() {
  const router = useRouter()
  const toast = useToast()
  const { usuario, setUsuario } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(usuario?.nombre || '')
  const push = usePushSubscription()

  useEffect(() => {
    if (!usuario) router.push('/login')
  }, [usuario, router])

  if (!usuario) return null

  const signo = calcularSignoZodiaco(usuario.fecha_nacimiento)
  const edad = calcularEdad(usuario.fecha_nacimiento)
  const emojiSigno = EMOJI_SIGNO[signo] || '✨'

  const logout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    setUsuario(null)
    router.push('/bienvenida')
  }

  const guardarNombre = async () => {
    if (nuevoNombre.trim().length < 2) { toast.error('El nombre es demasiado corto'); return }
    const { error } = await supabase.from('usuarios').update({ nombre: nuevoNombre.trim() }).eq('id', usuario.id)
    if (error) { toast.error('Error al guardar'); return }
    setUsuario({ ...usuario, nombre: nuevoNombre.trim() })
    setEditandoNombre(false)
    toast.success('Nombre actualizado')
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 py-5 safe-top">
        <h1 className="text-2xl font-bold text-white text-display">Mi perfil</h1>
      </div>

      <div className="px-4 space-y-5">
        {/* Avatar + nombre */}
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                {usuario.foto_perfil_url ? (
                  <img src={usuario.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-[#6B6B85]" />
                  </div>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#E94560] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(233,69,96,0.5)]">
                <Camera size={12} className="text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              {editandoNombre ? (
                <div className="space-y-2">
                  <input
                    value={nuevoNombre}
                    onChange={e => setNuevoNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-[#E94560]/60 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-[#E94560]/30"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') guardarNombre() }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={guardarNombre}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditandoNombre(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white text-display truncate">{usuario.nombre}</h2>
                    <button onClick={() => setEditandoNombre(true)} className="text-[#6B6B85] hover:text-white transition-colors">
                      <Edit3 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-[#A0A0B8] mt-0.5">{edad} años · <span className="text-base">{emojiSigno}</span> {signo}</p>
                  {usuario.reputacion_num_valoraciones > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-[#F39C12] fill-current" />
                      <span className="text-xs text-[#F39C12] font-semibold">
                        {(usuario.reputacion_puntuacion || 0).toFixed(1)}
                      </span>
                      <span className="text-xs text-[#6B6B85]">({usuario.reputacion_num_valoraciones})</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carta de perfil — preview prominente */}
        <Link href="/perfil/carta" className="block">
          <div className="relative rounded-3xl overflow-hidden group">
            <div className="relative px-5 py-5 glass-strong">
              <div className="flex items-center gap-4">
                <div className="w-24 shrink-0">
                  <CartaPerfil
                    nombre={usuario.nombre}
                    apodo={usuario.carta_apodo}
                    edad={edad}
                    signo={signo}
                    foto={usuario.foto_perfil_url}
                    frase={usuario.carta_frase}
                    estilo={usuario.carta_estilo ?? 'holo'}
                    slug={usuario.carta_slug}
                    paraExportar
                    className="!aspect-[5/7]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={14} className="text-[#E94560]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E94560]">Tu carta</span>
                  </div>
                  <p className="text-sm text-white font-semibold leading-tight">Personalízala y compártela</p>
                  <p className="text-xs text-[#A0A0B8] mt-1 leading-snug line-clamp-2">
                    {usuario.carta_frase || `${signo}, brilla esta noche. Tu carta te identifica en PartyMaps.`}
                  </p>
                  <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#E94560]">
                    Abrir carta <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Ticket, label: 'Entradas', onClick: () => router.push('/entradas') },
            { icon: Users, label: 'Planes', onClick: () => router.push('/planes') },
            { icon: Bell, label: 'Suscritos', onClick: () => router.push('/suscritos') },
          ].map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="glass rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-white/20 transition-all active:scale-[0.98]"
            >
              <Icon size={22} className="text-[#A0A0B8]" />
              <span className="text-xs text-white font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Notificaciones push */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {push.estado === 'activado'
                ? <Bell size={18} className="text-[#4F8EF7]" />
                : <BellOff size={18} className="text-[#6B6B85]" />}
              <div>
                <p className="text-sm font-semibold text-white">Notificaciones push</p>
                <p className="text-xs text-[#A0A0B8]">
                  {push.estado === 'activado' && 'Recibirás avisos de tus locales suscritos'}
                  {push.estado === 'desactivado' && 'Actívalas para no perderte ninguna noche'}
                  {push.estado === 'denegado' && 'Permiso bloqueado en este navegador'}
                  {push.estado === 'no-soportado' && 'Tu navegador no admite Web Push'}
                </p>
              </div>
            </div>
            {push.estado === 'activado' && (
              <button
                onClick={() => push.desactivar().then(() => toast.info('Notificaciones desactivadas'))}
                disabled={push.trabajando}
                className="text-xs text-[#E94560] font-semibold disabled:opacity-50"
              >
                Desactivar
              </button>
            )}
            {push.estado === 'desactivado' && (
              <Button
                size="sm"
                loading={push.trabajando}
                onClick={async () => {
                  const ok = await push.activar()
                  if (ok) toast.success('¡Notificaciones activadas!')
                  else toast.error('No se pudieron activar')
                }}
              >
                Activar
              </Button>
            )}
          </div>
          {push.estado === 'denegado' && (
            <div className="flex items-start gap-2 text-xs text-[#F39C12] bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-xl p-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Ve a los ajustes del navegador → Notificaciones y permite PartyMaps para activarlas.</span>
            </div>
          )}
        </div>

        {/* Opciones */}
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          <OpcionPerfil icon={Sparkles} label="Mi carta de perfil" onClick={() => router.push('/perfil/carta')} />
          <OpcionPerfil icon={ClipboardCheck} label="Valoraciones pendientes" onClick={() => router.push('/perfil/valoraciones-pendientes')} />
          <OpcionPerfil icon={Lightbulb} label="Mis sugerencias enviadas" onClick={() => router.push('/perfil/sugerencias')} />
          <OpcionPerfil icon={Shield} label="Privacidad y seguridad" onClick={() => {}} />
          <OpcionPerfil icon={Star} label="Mis reseñas" onClick={() => {}} />
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={logout}
          disabled={loggingOut}
          className={cn(
            'w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-[#E94560]/30 text-[#E94560] text-sm font-semibold transition-colors disabled:opacity-50',
            'hover:bg-[#E94560]/10'
          )}
        >
          <LogOut size={16} />
          {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>

        <p className="text-center text-[10px] text-[#6B6B85] tracking-wider uppercase">PartyMaps 2.0 · v0.1.0</p>
      </div>
    </div>
  )
}

function OpcionPerfil({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-colors"
    >
      <Icon size={18} className="text-[#A0A0B8]" />
      <span className="flex-1 text-sm text-white text-left">{label}</span>
      <ChevronRight size={16} className="text-[#6B6B85]" />
    </button>
  )
}
