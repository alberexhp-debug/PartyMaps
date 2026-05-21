'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import {
  calcularSignoZodiaco, calcularEdad, getFraseZodiaco,
  formatearFecha, EMOJI_SIGNO
} from '@/lib/utils'
import {
  User, Star, Bell, BellOff, Shield, LogOut, ChevronRight,
  Ticket, Users, Edit3, Camera, AlertCircle, Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePushSubscription } from '@/lib/hooks/usePushSubscription'

export default function PerfilPage() {
  const router = useRouter()
  const toast = useToast()
  const { usuario, setUsuario } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(usuario?.nombre || '')
  const push = usePushSubscription()

  if (!usuario) {
    router.push('/login')
    return null
  }

  const signo = calcularSignoZodiaco(usuario.fecha_nacimiento)
  const edad = calcularEdad(usuario.fecha_nacimiento)
  const frase = getFraseZodiaco(signo, new Date().toISOString())
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
    <div className="min-h-screen bg-[#0D0D1A] pb-24">
      {/* Header */}
      <div className="bg-[#0D0D1A] border-b border-[#1A1A2E] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Mi perfil</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Avatar + nombre */}
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#2A2A3E] overflow-hidden">
                {usuario.foto_perfil_url ? (
                  <img src={usuario.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-[#505065]" />
                  </div>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#E94560] rounded-full flex items-center justify-center">
                <Camera size={12} className="text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              {editandoNombre ? (
                <div className="space-y-2">
                  <input
                    value={nuevoNombre}
                    onChange={e => setNuevoNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0D0D1A] border border-[#E94560]/50 rounded-xl text-white text-sm outline-none"
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
                    <h2 className="text-lg font-bold text-white truncate">{usuario.nombre}</h2>
                    <button onClick={() => setEditandoNombre(true)}>
                      <Edit3 size={14} className="text-[#505065] hover:text-white" />
                    </button>
                  </div>
                  <p className="text-sm text-[#505065]">{edad} años · {emojiSigno} {signo}</p>
                  {usuario.reputacion_num_valoraciones > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-[#F39C12] fill-current" />
                      <span className="text-xs text-[#F39C12] font-semibold">
                        {(usuario.reputacion_puntuacion || 0).toFixed(1)}
                      </span>
                      <span className="text-xs text-[#505065]">({usuario.reputacion_num_valoraciones} valoraciones)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carta zodiacal — Perfil de noche */}
        <div className="relative bg-gradient-to-br from-[#1A0A2E] to-[#0D0D1A] rounded-2xl border border-[#4F8EF7]/30 p-5 overflow-hidden">
          {/* Decoración */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F8EF7]/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#E94560]/5 rounded-full translate-y-12 -translate-x-12" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{emojiSigno}</span>
              <div>
                <p className="text-xs text-[#4F8EF7] font-semibold uppercase tracking-wider">Tu noche</p>
                <p className="text-sm font-bold text-white">{signo}</p>
              </div>
            </div>
            <p className="text-base text-white font-medium italic leading-relaxed">&ldquo;{frase}&rdquo;</p>
            <p className="mt-2 text-xs text-[#505065]">{formatearFecha(new Date().toISOString())}</p>
          </div>
        </div>

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
              className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[#E94560]/30 transition-colors"
            >
              <Icon size={22} className="text-[#A0A0B8]" />
              <span className="text-xs text-[#505065] font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Notificaciones push */}
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {push.estado === 'activado'
                ? <Bell size={18} className="text-[#4F8EF7]" />
                : <BellOff size={18} className="text-[#505065]" />}
              <div>
                <p className="text-sm font-semibold text-white">Notificaciones push</p>
                <p className="text-xs text-[#505065]">
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
                className="text-xs text-red-400 font-semibold disabled:opacity-50"
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
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] overflow-hidden divide-y divide-[#2A2A3E]">
          <OpcionPerfil icon={Lightbulb} label="Mis sugerencias enviadas" onClick={() => router.push('/perfil/sugerencias')} />
          <OpcionPerfil icon={Shield} label="Privacidad y seguridad" onClick={() => {}} />
          <OpcionPerfil icon={Star} label="Mis reseñas" onClick={() => {}} />
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={logout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <LogOut size={16} />
          {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>

        <p className="text-center text-[10px] text-[#505065]">PartyMaps 2.0 · v0.1.0</p>
      </div>
    </div>
  )
}

function OpcionPerfil({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#0D0D1A]/50 transition-colors"
    >
      <Icon size={18} className="text-[#A0A0B8]" />
      <span className="flex-1 text-sm text-white text-left">{label}</span>
      <ChevronRight size={16} className="text-[#505065]" />
    </button>
  )
}
