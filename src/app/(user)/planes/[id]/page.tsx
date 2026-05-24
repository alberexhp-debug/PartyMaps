'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { PlanPublico, ParticipantePlan, MensajeChat, Local, Usuario } from '@/types'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearHora, tiempoRelativo, detectarContactoEnTexto } from '@/lib/utils'
import {
  ArrowLeft, Send, Users, MapPin, Clock, Check, X,
  MessageCircle, UserCheck, Crown, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PlanDetalle = PlanPublico & {
  locales?: Local
  creador?: Partial<Usuario>
}

type ParticipanteConUsuario = ParticipantePlan & { usuarios?: Partial<Usuario> }
type MensajeConUsuario = MensajeChat & { usuarios?: Partial<Usuario> }

export default function PlanDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { usuario } = useAuthStore()
  const toast = useToast()
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [plan, setPlan] = useState<PlanDetalle | null>(null)
  const [participantes, setParticipantes] = useState<ParticipanteConUsuario[]>([])
  const [mensajes, setMensajes] = useState<MensajeConUsuario[]>([])
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [tab, setTab] = useState<'chat' | 'miembros'>('chat')
  const [miSolicitud, setMiSolicitud] = useState<ParticipanteConUsuario | null>(null)

  const cargar = useCallback(async () => {
    const [planRes, partRes, msgRes] = await Promise.all([
      supabase.from('planes_publicos')
        .select('*, locales!inner(*), usuarios!creador_id(*)')
        .eq('id', id).single(),
      supabase.from('participantes_plan')
        .select('*, usuarios!usuario_id(id, nombre, foto_perfil_url, reputacion_puntuacion)')
        .eq('plan_id', id),
      supabase.from('mensajes_chat_plan')
        .select('*, usuarios!usuario_id(id, nombre, foto_perfil_url)')
        .eq('plan_id', id)
        .order('created_at', { ascending: true })
        .limit(100),
    ])

    if (planRes.data) {
      setPlan({ ...planRes.data, local: planRes.data.locales, creador: planRes.data.usuarios })
    }
    if (partRes.data) {
      setParticipantes(partRes.data.map((p: ParticipanteConUsuario) => ({ ...p, usuario: p.usuarios })))
      if (usuario) {
        const mia = partRes.data.find((p: ParticipanteConUsuario) => p.usuario_id === usuario.id)
        setMiSolicitud(mia || null)
      }
    }
    if (msgRes.data) {
      setMensajes(msgRes.data.map((m: MensajeConUsuario) => ({ ...m, usuario: m.usuarios })))
    }
    setLoading(false)
  }, [id, usuario])

  useEffect(() => { cargar() }, [cargar])

  // Real-time chat subscription
  useEffect(() => {
    const channel = supabase
      .channel(`plan-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes_chat_plan',
        filter: `plan_id=eq.${id}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('mensajes_chat_plan')
          .select('*, usuarios!usuario_id(id, nombre, foto_perfil_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) setMensajes(prev => [...prev, { ...data, usuario: data.usuarios }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes])

  const enviarMensaje = async () => {
    if (!usuario || !mensaje.trim()) return
    const canChat = plan?.creador_id === usuario.id ||
      participantes.some(p => p.usuario_id === usuario.id && p.estado === 'aceptada')
    if (!canChat) { toast.error('Solo los miembros aceptados pueden chatear'); return }
    const deteccion = detectarContactoEnTexto(mensaje)
    if (deteccion.tieneContacto) {
      toast.error(`Por seguridad no puedes compartir ${deteccion.tipo} en el chat del plan`)
      return
    }
    setEnviando(true)
    await supabase.from('mensajes_chat_plan').insert({
      plan_id: id,
      usuario_id: usuario.id,
      contenido: mensaje.trim(),
    })
    setMensaje('')
    setEnviando(false)
    inputRef.current?.focus()
  }

  const gestionarSolicitud = async (participanteId: string, accion: 'aceptada' | 'rechazada') => {
    const { error } = await supabase
      .from('participantes_plan')
      .update({ estado: accion })
      .eq('id', participanteId)
    if (error) { toast.error('Error al gestionar solicitud'); return }

    if (accion === 'aceptada' && plan) {
      await supabase.from('planes_publicos')
        .update({ huecos_disponibles: Math.max(0, plan.huecos_disponibles - 1) })
        .eq('id', id)
    }
    cargar()
    toast.success(accion === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud rechazada')
  }

  const solicitarUnirse = async () => {
    if (!usuario) { router.push('/login'); return }
    const { error } = await supabase.from('participantes_plan').insert({
      plan_id: id,
      usuario_id: usuario.id,
      estado: 'pendiente',
    })
    if (error?.code === '23505') { toast.info('Ya enviaste una solicitud'); return }
    if (error) { toast.error('Error al enviar solicitud'); return }
    toast.success('Solicitud enviada')
    cargar()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!plan) return null

  const soyCreador = plan.creador_id === usuario?.id
  const miParticipacion = participantes.find(p => p.usuario_id === usuario?.id)
  const soyMiembro = soyCreador || miParticipacion?.estado === 'aceptada'
  const solicitudesPendientes = participantes.filter(p => p.estado === 'pendiente')
  const miembrosAceptados = participantes.filter(p => p.estado === 'aceptada')

  return (
    <div className="flex flex-col h-screen bg-white/5">
      {/* Header */}
      <div className="bg-white/5 border-b border-[#1A1A2E] safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-[#A0A0B8]">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">{plan.locales?.nombre}</h1>
            <div className="flex items-center gap-3 text-xs text-[#6B6B85]">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatearHora(plan.hora_llegada)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={10} />
                {plan.total_personas - plan.huecos_disponibles}/{plan.total_personas}
              </span>
            </div>
          </div>
          {!soyMiembro && !miParticipacion && plan.huecos_disponibles > 0 && (
            <Button size="sm" onClick={solicitarUnirse}>
              <UserCheck size={14} />
              Unirse
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex px-4">
          {(['chat', 'miembros'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors capitalize',
                tab === t ? 'border-[#E94560] text-white' : 'border-transparent text-[#6B6B85]'
              )}
            >
              {t === 'chat' ? (
                <span className="flex items-center justify-center gap-1.5">
                  <MessageCircle size={14} />
                  Chat
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Users size={14} />
                  Miembros {solicitudesPendientes.length > 0 && soyCreador && (
                    <span className="w-4 h-4 bg-[#E94560] rounded-full text-[10px] text-white flex items-center justify-center">
                      {solicitudesPendientes.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Miembros */}
      {tab === 'miembros' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {/* Plan info */}
          <div className="bg-white/6 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#2A2A3E] shrink-0">
                <img src={plan.locales?.imagenes?.[0] || ''} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-white">{plan.locales?.nombre}</p>
                <div className="flex items-center gap-1 text-xs text-[#6B6B85]">
                  <MapPin size={10} />
                  {plan.locales?.ciudad}
                </div>
                {plan.descripcion && <p className="text-xs text-[#A0A0B8] mt-1">{plan.descripcion}</p>}
              </div>
            </div>
          </div>

          {/* Estado de mi solicitud */}
          {miParticipacion && !soyCreador && (
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-xl border text-sm',
              miParticipacion.estado === 'pendiente' && 'border-[#F39C12]/30 bg-[#F39C12]/10 text-[#F39C12]',
              miParticipacion.estado === 'aceptada' && 'border-green-500/30 bg-green-500/10 text-green-400',
              miParticipacion.estado === 'rechazada' && 'border-red-500/30 bg-red-500/10 text-red-400',
            )}>
              <AlertCircle size={16} />
              {miParticipacion.estado === 'pendiente' && 'Tu solicitud está pendiente de aprobación'}
              {miParticipacion.estado === 'aceptada' && '¡Eres miembro de este plan!'}
              {miParticipacion.estado === 'rechazada' && 'Tu solicitud fue rechazada'}
            </div>
          )}

          {/* Solicitudes pendientes (solo creador) */}
          {soyCreador && solicitudesPendientes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[#A0A0B8] uppercase tracking-wider">
                Solicitudes pendientes ({solicitudesPendientes.length})
              </h3>
              {solicitudesPendientes.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-white/6 rounded-xl border border-[#F39C12]/20">
                  <Avatar usuario={p.usuarios} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{p.usuarios?.nombre || 'Usuario'}</p>
                    {p.usuarios?.reputacion_puntuacion && (
                      <p className="text-xs text-[#F39C12]">★ {p.usuarios.reputacion_puntuacion.toFixed(1)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => gestionarSolicitud(p.id, 'rechazada')}
                      className="w-8 h-8 rounded-full border border-red-500/30 text-red-400 flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => gestionarSolicitud(p.id, 'aceptada')}
                      className="w-8 h-8 rounded-full border border-green-500/30 text-green-400 flex items-center justify-center"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Miembros aceptados */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#A0A0B8] uppercase tracking-wider">
              Miembros ({miembrosAceptados.length + 1})
            </h3>
            {/* Creador */}
            <div className="flex items-center gap-3 p-3 glass rounded-xl">
              <Avatar usuario={plan.creador} size={36} />
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{plan.creador?.nombre || 'Creador'}</p>
                <p className="text-xs text-[#6B6B85]">Organizador</p>
              </div>
              <Crown size={14} className="text-[#F39C12]" />
            </div>
            {miembrosAceptados.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 glass rounded-xl">
                <Avatar usuario={p.usuarios} size={36} />
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{p.usuarios?.nombre || 'Usuario'}</p>
                  {p.usuarios?.reputacion_puntuacion && (
                    <p className="text-xs text-[#6B6B85]">★ {p.usuarios.reputacion_puntuacion.toFixed(1)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Chat */}
      {tab === 'chat' && (
        <>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {!soyMiembro ? (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                <MessageCircle size={40} className="text-[#6B6B85]" />
                <p className="text-[#6B6B85] text-center text-sm">
                  Únete al plan para ver y participar en el chat
                </p>
              </div>
            ) : mensajes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                <MessageCircle size={40} className="text-[#6B6B85]" />
                <p className="text-[#6B6B85] text-sm">Sé el primero en escribir</p>
              </div>
            ) : (
              mensajes.map(msg => {
                const esMio = msg.usuario_id === usuario?.id
                return (
                  <div key={msg.id} className={cn('flex gap-2', esMio ? 'flex-row-reverse' : 'flex-row')}>
                    {!esMio && <Avatar usuario={msg.usuarios} size={28} />}
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2',
                      esMio ? 'bg-[#E94560] rounded-br-sm' : 'bg-white/6 rounded-bl-sm'
                    )}>
                      {!esMio && (
                        <p className="text-xs font-semibold text-[#A0A0B8] mb-1">{msg.usuarios?.nombre}</p>
                      )}
                      <p className="text-sm text-white">{msg.contenido}</p>
                      <p className={cn('text-[10px] mt-1', esMio ? 'text-white/60 text-right' : 'text-[#6B6B85]')}>
                        {tiempoRelativo(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Input chat */}
          {soyMiembro && (
            <div className="border-t border-[#1A1A2E] p-3 flex gap-2 pb-safe">
              <input
                ref={inputRef}
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje() } }}
                placeholder="Mensaje..."
                maxLength={500}
                className="flex-1 px-4 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 placeholder:text-[#6B6B85]"
              />
              <button
                onClick={enviarMensaje}
                disabled={!mensaje.trim() || enviando}
                className="w-10 h-10 bg-[#E94560] rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Avatar({ usuario, size = 32 }: { usuario?: Partial<Usuario> | null; size?: number }) {
  return (
    <div
      className="rounded-full bg-[#2A2A3E] flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {usuario?.foto_perfil_url ? (
        <img src={usuario.foto_perfil_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-semibold" style={{ fontSize: size * 0.4 }}>
          {usuario?.nombre?.[0]?.toUpperCase() || '?'}
        </span>
      )}
    </div>
  )
}
