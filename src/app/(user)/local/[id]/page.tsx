'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LocalConAforo, Review } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StarDisplay, StarRating } from '@/components/ui/StarRating'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { useVerificarPresencia } from '@/lib/hooks/useVerificarPresencia'
import {
  getLabelTipoLocal, getColorTemperatura, getLabelTemperatura,
  formatearPrecio, getTemperaturaAforo, tiempoRelativo, getLabelMusica, youtubeId
} from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, Check, Bell, BellOff, MapPin, Clock, Music, Ticket,
  Star, MessageSquare, Lightbulb, Share2, Navigation, PenLine, X,
  LogIn, LogOut, Send, Sparkles, Beer, Sofa,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LocalImagen } from '@/components/ui/LocalImagen'
import { ReservarModal } from '@/components/user/ReservarModal'
import { estadoDeLocal } from '@/lib/estado-local'
import { textoEstadoFicha } from '@/lib/horarios'

export default function LocalPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { usuario } = useAuthStore()
  const [local, setLocal] = useState<LocalConAforo | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [suscrito, setSuscrito] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imagenActiva, setImagenActiva] = useState(0)
  const [tab, setTab] = useState<'info' | 'reviews'>('info')
  const [showBienvenida, setShowBienvenida] = useState(false)
  const [bienvenidaSel, setBienvenidaSel] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [miReview, setMiReview] = useState<Review | null>(null)
  const [checkinActivo, setCheckinActivo] = useState<string | null>(null)
  // Re-verificación cada 20 min: si el usuario sale del radio, cerramos el checkin automáticamente
  // y bloqueamos la participación en módulos hasta que vuelva.
  useVerificarPresencia({
    checkinId: checkinActivo,
    localLat: local?.latitud ?? 0,
    localLng: local?.longitud ?? 0,
    radioMetros: local?.radio_verificacion_metros ?? 150,
    onSalida: () => {
      setCheckinActivo(null)
      toast.info('Has salido del radio del local. Vuelve a hacer check-in para participar en los módulos.')
    },
  })
  const [haciendoCheckin, setHaciendoCheckin] = useState(false)
  const [showSugerencia, setShowSugerencia] = useState(false)
  const [showReservar, setShowReservar] = useState(false)
  // Hora actual con tick de 1 min: la línea de estado pasa sola de "abre pronto" a "abierto".
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setAhora(new Date())
    const id = setInterval(tick, 60000)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  useEffect(() => {
    const cargar = async () => {
      const [{ data: localData }, { data: reviewsData }] = await Promise.all([
        supabase.from('locales').select('*, eventos(id,nombre,estado,fecha_inicio,fecha_fin,imagen_url)').eq('id', id).single(),
        supabase.from('reviews').select('*, usuarios(nombre, foto_perfil_url)').eq('local_id', id).eq('estado', 'activa').eq('censurada', false).order('created_at', { ascending: false }).limit(20),
      ])

      if (localData) {
        setLocal({ ...localData, temperatura: getTemperaturaAforo(localData.aforo_estimado_porcentaje || 0) })
      }
      if (reviewsData) setReviews(reviewsData)

      if (usuario) {
        const [{ data: sub }, { data: myReview }, { data: checkin }] = await Promise.all([
          supabase.from('suscripciones').select('id').match({ usuario_id: usuario.id, local_id: id }).single(),
          supabase.from('reviews').select('*').match({ usuario_id: usuario.id, local_id: id }).is('checkin_id', null).single(),
          supabase.from('checkins').select('id').match({ usuario_id: usuario.id, local_id: id }).is('salida_at', null).single(),
        ])
        setSuscrito(!!sub)
        if (myReview) setMiReview(myReview)
        if (checkin) setCheckinActivo(checkin.id)
      }

      setLoading(false)
    }
    cargar()
  }, [id, usuario])

  const toggleSuscripcion = async () => {
    if (!usuario) { router.push('/login'); return }
    if (suscrito) {
      if (!confirm(`¿Dejar de seguir a ${local?.nombre}?`)) return
      await supabase.from('suscripciones').delete().match({ usuario_id: usuario.id, local_id: id })
      setSuscrito(false)
      toast.info('Dejaste de seguir este local')
    } else {
      await supabase.from('suscripciones').insert({ usuario_id: usuario.id, local_id: id })
      setSuscrito(true)
      toast.success('Siguiendo este local')
    }
  }

  const compartir = async () => {
    if (navigator.share) {
      await navigator.share({ title: local?.nombre, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado')
    }
  }

  const hacerCheckin = async () => {
    if (!usuario) { router.push('/login'); return }
    if (!local) return
    setHaciendoCheckin(true)

    const obtenerPos = (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )

    try {
      const pos = await obtenerPos()
      const { latitude: lat, longitude: lng } = pos.coords

      // Haversine distance en metros
      const R = 6371000
      const dLat = (local.latitud - lat) * Math.PI / 180
      const dLon = (local.longitud - lng) * Math.PI / 180
      const a = Math.sin(dLat/2)**2 + Math.cos(lat * Math.PI/180) * Math.cos(local.latitud * Math.PI/180) * Math.sin(dLon/2)**2
      const distancia = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

      if (distancia > (local.radio_verificacion_metros || 150)) {
        toast.error(`Debes estar dentro del local (estás a ${Math.round(distancia)}m)`)
        setHaciendoCheckin(false)
        return
      }

      const { data } = await supabase.from('checkins').insert({
        usuario_id: usuario.id,
        local_id: local.id,
        latitud: lat,
        longitud: lng,
      }).select('id').single()

      if (data) {
        setCheckinActivo(data.id)
        toast.success('¡Check-in realizado! Que disfrutes la noche 🎉')
      }
    } catch {
      toast.error('No se pudo obtener tu ubicación. Activa el GPS e inténtalo de nuevo.')
    }
    setHaciendoCheckin(false)
  }

  const hacerCheckout = async () => {
    if (!checkinActivo) return
    await supabase.from('checkins').update({ salida_at: new Date().toISOString() }).eq('id', checkinActivo)
    setCheckinActivo(null)
    toast.info('Check-out registrado. ¡Hasta la próxima!')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  )

  if (!local) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-[#A0A0B8]">Local no encontrado</p>
      <Button onClick={() => router.back()}>Volver</Button>
    </div>
  )

  function SugerenciaModal({ localId, userId, onClose, onEnviada }: {
    localId: string; userId: string; onClose: () => void; onEnviada: () => void
  }) {
    const [texto, setTexto] = useState('')
    const [loading, setLoading] = useState(false)

    const enviar = async () => {
      if (texto.trim().length < 5) { toast.error('La sugerencia es demasiado corta'); return }
      setLoading(true)
      try {
        const res = await fetch('/api/sugerencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ local_id: localId, contenido: texto.trim() }),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error || 'Error al enviar la sugerencia')
        } else {
          onEnviada()
        }
      } catch {
        toast.error('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
        <div className="w-full bg-white/6 rounded-t-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Sugerencia al local</h2>
            <button onClick={onClose} className="p-2 text-[#6B6B85] hover:text-white"><X size={20} /></button>
          </div>
          <p className="text-sm text-[#6B6B85]">Tu sugerencia será anónima para otros usuarios. Solo la verá el equipo del local.</p>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Ej: Podrían mejorar el volumen en la zona VIP..."
            rows={4}
            maxLength={400}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#6B6B85]"
          />
          <p className="text-xs text-[#6B6B85] text-right">{texto.length}/400</p>
          <Button fullWidth loading={loading} onClick={enviar}>
            <Send size={15} /> Enviar sugerencia
          </Button>
        </div>
      </div>
    )
  }

  function ReviewModal({ localId, localNombre, userId, onClose, onGuardada }: {
    localId: string; localNombre: string; userId: string
    onClose: () => void; onGuardada: (r: Review) => void
  }) {
    const [puntuacion, setPuntuacion] = useState(0)
    const [comentario, setComentario] = useState('')
    const [loading, setLoading] = useState(false)

    const guardar = async () => {
      if (puntuacion === 0) { toast.error('Selecciona una puntuación'); return }
      setLoading(true)

      // Verificar que tiene un checkin previo en el local (review verificada)
      const { data: checkinPrevio } = await supabase
        .from('checkins')
        .select('id')
        .match({ usuario_id: userId, local_id: localId })
        .order('entrada_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!checkinPrevio) {
        toast.error('Solo puedes dejar review si has hecho check-in en el local')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.from('reviews').insert({
        usuario_id: userId,
        local_id: localId,
        checkin_id: checkinPrevio.id,
        puntuacion,
        comentario: comentario.trim() || null,
        estado: 'activa',
      }).select('*, usuarios(nombre, foto_perfil_url)').single()
      if (error) {
        if (error.code === '23505') toast.error('Ya tienes una review en este local')
        else toast.error('Error al publicar la review')
      } else {
        onGuardada(data as Review)
      }
      setLoading(false)
    }

    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
        <div className="w-full bg-white/6 rounded-t-3xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Tu opinión sobre {localNombre}</h2>
            <button onClick={onClose} className="p-2 text-[#6B6B85] hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#A0A0B8]">Puntuación *</p>
            <div className="flex gap-3 justify-center py-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setPuntuacion(n)} className="transition-transform active:scale-95">
                  <Star
                    size={36}
                    className={n <= puntuacion ? 'text-yellow-400 fill-yellow-400' : 'text-[#2A2A3E]'}
                  />
                </button>
              ))}
            </div>
            {puntuacion > 0 && (
              <p className="text-center text-sm text-[#A0A0B8]">
                {['', 'Muy malo', 'Malo', 'Normal', 'Bueno', 'Excelente'][puntuacion]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0B8]">Comentario (opcional)</label>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Cuéntanos tu experiencia..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#6B6B85]"
            />
            <p className="text-xs text-[#6B6B85] text-right">{comentario.length}/500</p>
          </div>

          <Button fullWidth loading={loading} onClick={guardar}>
            <Star size={16} />
            Publicar review
          </Button>
        </div>
      </div>
    )
  }

  const colorTemp = getColorTemperatura(local.temperatura)
  const eventosPublicados = ((local as LocalConAforo & { eventos?: Array<{ id: string; nombre: string; estado: string; imagen_url?: string; fecha_inicio?: string }> }).eventos ?? [])
    .filter(e => e.estado === 'publicado')
    .sort((a, b) => new Date(a.fecha_inicio ?? 0).getTime() - new Date(b.fecha_inicio ?? 0).getTime())
  const eventoActivo = eventosPublicados[0]
  const masEventos = eventosPublicados.slice(1)

  // Estado de apertura (línea bajo el nombre + punto de la noche de hoy en el bloque Horario).
  const estadoAp = estadoDeLocal(local, ahora)
  const lineaEstado = textoEstadoFicha(estadoAp, ahora)
  const colorEstado = estadoAp.estado === 'abierto' ? '#27AE60' : estadoAp.estado === 'abre_pronto' ? '#F39C12' : '#4A4A60'
  const hoyStr = ahora.toDateString()
  const eventoEstaNoche = eventosPublicados.some(e => e.fecha_inicio && new Date(e.fecha_inicio).toDateString() === hoyStr)

  // Antes de comprar, si el local ofrece consumición de bienvenida, la ofrecemos en un modal.
  const irAComprar = () => {
    if (local.consumiciones_bienvenida?.length) { setShowBienvenida(true); return }
    router.push(`/local/${id}/comprar`)
  }
  const continuarCompra = () => {
    router.push(`/local/${id}/comprar?bienvenida=${bienvenidaSel ?? 'ninguna'}`)
  }
  const mediaReviews = reviews.length > 0 ? reviews.reduce((a, r) => a + r.puntuacion, 0) / reviews.length : 0
  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
  const nochesCompleto = ['Noche del lunes', 'Noche del martes', 'Noche del miércoles', 'Noche del jueves', 'Noche del viernes', 'Noche del sábado', 'Noche del domingo']
  const hoyIdx = (new Date().getDay() + 6) % 7

  return (
    <div className="min-h-screen">
      {/* Hero cinemático */}
      <div className="relative h-[58vh] min-h-[420px] max-h-[560px]">
        <LocalImagen src={local.imagenes?.[imagenActiva]} nombre={local.nombre} priority />

        {/* Vignette superior + degradado fuerte abajo */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(6,6,12,0.5) 0%, rgba(6,6,12,0.05) 25%, rgba(6,6,12,0.6) 70%, #06060C 100%)'
        }} />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-top z-20">
          <button aria-label="Volver" onClick={() => router.back()} className="w-11 h-11 glass-strong rounded-2xl flex items-center justify-center text-white">
            <ChevronLeft size={22} />
          </button>
          <button aria-label="Compartir" onClick={compartir} className="w-11 h-11 glass-strong rounded-2xl flex items-center justify-center text-white">
            <Share2 size={18} />
          </button>
        </div>

        {/* Título sobre la imagen */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 z-[5]">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="default">{getLabelTipoLocal(local.tipo_local)}</Badge>
            {local.tier === 'destacado' && <Badge variant="gold">★ Destacado</Badge>}
            {local.num_suscriptores > 0 && (
              <Badge variant="default">
                <Bell size={10} /> {local.num_suscriptores.toLocaleString('es-ES')} {local.num_suscriptores === 1 ? 'sigue' : 'siguen'}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-display text-white" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>{local.nombre}</h1>
          {/* Línea de estado de apertura */}
          {lineaEstado && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorEstado, boxShadow: `0 0 6px ${colorEstado}` }} />
              <span className="text-[13px] text-[#B8B8CC]">{lineaEstado}</span>
              {eventoEstaNoche && <Badge variant="violet" size="sm">Evento esta noche</Badge>}
            </div>
          )}
          {(reviews.length > 0 || local.precio_entrada_min != null) && (
            <div className="flex items-center gap-2.5 mt-2.5 text-sm">
              {reviews.length > 0 && (
                <span className="flex items-center gap-1 text-white">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{mediaReviews.toFixed(1)}</span>
                  <span className="text-white/55">({reviews.length})</span>
                </span>
              )}
              {reviews.length > 0 && local.precio_entrada_min != null && <span className="text-white/30">·</span>}
              {local.precio_entrada_min != null && (
                <span className="text-white/85">
                  {local.precio_entrada_min === 0 ? 'Entrada gratis' : `Desde ${formatearPrecio(local.precio_entrada_min)}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Miniaturas */}
        {local.imagenes?.length > 1 && (
          <div className="absolute top-1/2 -translate-y-1/2 right-3 z-10 flex flex-col gap-1.5">
            {local.imagenes.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => setImagenActiva(i)}
                className={cn('rounded-full transition-all', i === imagenActiva ? 'w-2 h-6 bg-white shadow-[0_0_8px_white]' : 'w-2 h-2 bg-white/40')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="px-5 space-y-5 pb-32 -mt-2">
        {/* Dirección */}
        <div className="flex items-center gap-2 text-sm text-[#A0A0B8]">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{local.direccion}</span>
          <button className="ml-auto flex items-center gap-1 text-[#4F8EF7] text-xs shrink-0"
            onClick={() => window.open(`https://maps.google.com/?q=${local.latitud},${local.longitud}`)}>
            <Navigation size={12} /> Cómo llegar
          </button>
        </div>

        {/* Acciones: seguir (primaria) + pedir en barra (secundaria) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={toggleSuscripcion}
            className={cn(
              'group relative h-12 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98] overflow-hidden flex items-center justify-center gap-2',
              suscrito
                ? 'glass border border-white/15 text-white hover:border-white/25'
                : 'bg-[#E94560] text-white shadow-[0_12px_28px_-10px_rgba(233,69,96,0.55)] hover:bg-[#FF3D71]'
            )}
          >
            {suscrito ? (
              <>
                <Bell size={18} className="fill-current text-[#E94560]" />
                <span>Siguiendo</span>
              </>
            ) : (
              <>
                <BellOff size={18} />
                <span>Seguir</span>
              </>
            )}
          </button>

          <button
            onClick={() => router.push(`/local/${id}/bar`)}
            className="h-12 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98] glass border border-white/15 text-white hover:border-white/25 flex items-center justify-center gap-2"
          >
            <Beer size={18} className="text-[#F39C12]" />
            <span>Pedir en barra</span>
          </button>
        </div>

        {/* Reservar mesa/reservado */}
        {local.reservas_activas && (
          <button
            onClick={() => { if (!usuario) { router.push('/login'); return } setShowReservar(true) }}
            className="w-full h-12 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98] bg-[#D4A84B]/12 border border-[#D4A84B]/30 text-[#D4A84B] hover:bg-[#D4A84B]/18 flex items-center justify-center gap-2"
          >
            <Sofa size={18} />
            <span>Reservar reservado</span>
          </button>
        )}

        {/* Evento — banner */}
        {eventoActivo && (
          <button
            onClick={irAComprar}
            className="group relative block w-full h-44 rounded-2xl overflow-hidden text-left active:scale-[0.99] transition-transform"
          >
            <LocalImagen src={eventoActivo.imagen_url} nombre={eventoActivo.nombre} />
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, rgba(8,8,16,0.10) 0%, rgba(8,8,16,0.35) 45%, rgba(8,8,16,0.94) 100%)'
            }} />

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-[#F39C12]/20 border border-[#F39C12]/40">
              <Sparkles size={12} className="text-[#F39C12]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#F39C12]">Próximo evento</span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-xl font-bold text-white leading-tight text-display" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>
                {eventoActivo.nombre}
              </h3>
              {eventoActivo.fecha_inicio && (
                <p className="text-sm text-white/85 mt-1 flex items-center gap-1.5">
                  <Clock size={13} className="shrink-0" />
                  <span className="capitalize">
                    {new Date(eventoActivo.fecha_inicio).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="text-white/40">·</span>
                  {new Date(eventoActivo.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-white/12 backdrop-blur-md border border-white/15 text-sm font-semibold text-white">
                <Ticket size={14} /> Ver entradas
              </span>
            </div>
          </button>
        )}

        {/* Próximos eventos */}
        {masEventos.length > 0 && (
          <div>
            <p className="eyebrow mb-2.5">Próximos eventos</p>
            <div className="space-y-2">
              {masEventos.map(ev => (
                <button
                  key={ev.id}
                  onClick={irAComprar}
                  className="flex items-center gap-3 w-full p-2.5 glass rounded-xl text-left hover:bg-white/8 transition-colors"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative">
                    <LocalImagen src={ev.imagen_url} nombre={ev.nombre} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{ev.nombre}</p>
                    {ev.fecha_inicio && (
                      <p className="text-xs text-[#8B8BA8] mt-0.5 flex items-center gap-1.5">
                        <Clock size={11} className="shrink-0" />
                        <span className="capitalize truncate">
                          {new Date(ev.fecha_inicio).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' · '}
                          {new Date(ev.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Vídeos del local */}
        {(local.videos_youtube ?? []).some(u => youtubeId(u)) && (
          <div>
            <p className="eyebrow mb-2.5">Vídeos</p>
            <div className="space-y-3">
              {(local.videos_youtube ?? []).map((url, i) => {
                const vid = youtubeId(url)
                if (!vid) return null
                return (
                  <div key={i} className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${vid}`}
                      title={`Vídeo ${i + 1} de ${local.nombre}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Check-in banner */}
        {usuario && (
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-2xl border',
            checkinActivo ? 'bg-green-500/10 border-green-500/30' : 'bg-white/6 border-white/10'
          )}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              checkinActivo ? 'bg-green-500/20' : 'bg-[#2A2A3E]')}>
              {checkinActivo ? <LogIn size={18} className="text-green-400" /> : <LogIn size={18} className="text-[#6B6B85]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {checkinActivo ? '¡Estás aquí!' : 'Check-in'}
              </p>
              <p className="text-xs text-[#6B6B85]">
                {checkinActivo ? 'Tu presencia está registrada' : 'Verifica que estás en el local'}
              </p>
            </div>
            {checkinActivo ? (
              <button onClick={hacerCheckout}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 glass rounded-xl text-xs text-[#A0A0B8] hover:text-white">
                <LogOut size={13} /> Salir
              </button>
            ) : (
              <Button size="sm" loading={haciendoCheckin} onClick={hacerCheckin}>
                Check-in
              </Button>
            )}
          </div>
        )}

        {/* Tabs info / reviews / módulos */}
        <div className="flex gap-1 p-1 bg-white/6 rounded-xl">
          {[
            { key: 'info', label: 'Info' },
            { key: 'reviews', label: `Reviews (${reviews.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as 'info' | 'reviews')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === key ? 'bg-[#E94560] text-white' : 'text-[#6B6B85]'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-4">
            {local.descripcion && (
              <p className="text-[#A0A0B8] text-sm leading-relaxed">{local.descripcion}</p>
            )}

            {local.musica?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Music size={14} /> Música</h3>
                <div className="flex flex-wrap gap-2">
                  {local.musica.map(m => <Badge key={m} variant="blue">{getLabelMusica(m)}</Badge>)}
                </div>
              </div>
            )}

            {local.horario && Object.keys(local.horario).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock size={14} /> Horario</h3>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
                  {diasSemana.map((dia, i) => {
                    const h = local.horario[dia as keyof typeof local.horario]
                    const esHoy = i === hoyIdx
                    return (
                      <div key={dia} className={cn('flex items-center justify-between px-4 py-2.5 text-sm', esHoy && 'bg-white/[0.05]')}>
                        <span className="flex items-center gap-2">
                          {esHoy && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colorEstado }} />}
                          <span className={cn(esHoy ? 'text-white font-semibold' : 'text-[#A0A0B8]')}>{nochesCompleto[i]}</span>
                        </span>
                        <span className={cn(h ? (esHoy ? 'text-white font-medium' : 'text-[#C8C8D8]') : 'text-[#6B6B85]')}>
                          {h ? `${h.apertura} – ${h.cierre}` : 'Cerrado'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {local.consumiciones_bienvenida?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Consumiciones de bienvenida</h3>
                {local.consumiciones_bienvenida.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 glass rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-white">{c.nombre}</p>
                      <p className="text-xs text-[#6B6B85]">{c.descripcion}</p>
                    </div>
                    <span className="text-[#E94560] font-semibold">{formatearPrecio(c.precio)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sugerencia anónima al local */}
            <div className="p-4 glass rounded-2xl space-y-2">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare size={15} className="text-[#A0A0B8]" /> ¿Algo que mejorar?
              </p>
              <p className="text-xs text-[#6B6B85]">Manda una sugerencia anónima al local</p>
              <Button size="sm" variant="secondary" fullWidth onClick={() => {
                if (!usuario) { router.push('/login'); return }
                setShowSugerencia(true)
              }}>
                <Send size={13} /> Enviar sugerencia
              </Button>
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-4">
            {/* Botón escribir review */}
            {usuario && !miReview && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full flex items-center gap-3 p-4 bg-white/6 border border-dashed border-[#E94560]/40 rounded-2xl hover:border-[#E94560] transition-colors"
              >
                <PenLine size={18} className="text-[#E94560]" />
                <span className="text-sm font-medium text-[#A0A0B8]">Escribe tu opinión sobre {local.nombre}</span>
              </button>
            )}
            {usuario && miReview && (
              <div className="p-3 bg-[#E94560]/10 border border-[#E94560]/30 rounded-xl flex items-center gap-2">
                <Star size={14} className="text-[#E94560] fill-current" />
                <span className="text-sm text-[#E94560]">Ya dejaste una review ({miReview.puntuacion} ★)</span>
              </div>
            )}
            {!usuario && (
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center gap-3 p-4 bg-white/6 border border-dashed border-white/10 rounded-2xl"
              >
                <PenLine size={18} className="text-[#6B6B85]" />
                <span className="text-sm text-[#6B6B85]">Inicia sesión para dejar una review</span>
              </button>
            )}

            {reviews.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <MessageSquare size={40} className="text-[#6B6B85]" />
                <p className="text-[#6B6B85] text-sm text-center">Aún no hay reviews. Sé el primero en opinar.</p>
              </div>
            ) : (
              <>
                {/* Distribución de estrellas */}
                <div className="p-4 glass rounded-2xl">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-bold text-white">{mediaReviews.toFixed(1)}</span>
                      <StarDisplay value={mediaReviews} />
                      <span className="text-xs text-[#6B6B85] mt-1">{reviews.length} reviews</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map(n => {
                        const count = reviews.filter(r => r.puntuacion === n).length
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                        return (
                          <div key={n} className="flex items-center gap-2 text-xs">
                            <span className="text-[#6B6B85] w-3">{n}</span>
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[#6B6B85] w-4">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {reviews.map(review => (
                  <div key={review.id} className="p-4 glass rounded-2xl space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#2A2A3E] flex items-center justify-center text-xs font-bold text-white">
                          {(review.usuario as { nombre?: string })?.nombre?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{(review.usuario as { nombre?: string })?.nombre || 'Usuario'}</p>
                          <StarDisplay value={review.puntuacion} />
                        </div>
                      </div>
                      <span className="text-xs text-[#6B6B85]">{tiempoRelativo(review.created_at)}</span>
                    </div>
                    {review.comentario && <p className="text-sm text-[#A0A0B8]">{review.comentario}</p>}
                    {review.respuesta_local && (
                      <div className="mt-2 p-3 bg-white/5 rounded-xl border-l-2 border-[#E94560]">
                        <p className="text-xs text-[#E94560] font-medium mb-1">Respuesta del local</p>
                        <p className="text-xs text-[#A0A0B8]">{review.respuesta_local}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

      </div>

      {/* Modal review */}
      {showReviewModal && local && usuario && (
        <ReviewModal
          localId={local.id}
          localNombre={local.nombre}
          userId={usuario.id}
          onClose={() => setShowReviewModal(false)}
          onGuardada={(nueva) => {
            setMiReview(nueva)
            setReviews(r => [nueva, ...r])
            setShowReviewModal(false)
            toast.success('¡Review publicada!')
          }}
        />
      )}

      {/* Modal sugerencia */}
      {showSugerencia && local && usuario && (
        <SugerenciaModal
          localId={local.id}
          userId={usuario.id}
          onClose={() => setShowSugerencia(false)}
          onEnviada={() => { setShowSugerencia(false); toast.success('Sugerencia enviada') }}
        />
      )}

      {/* Modal reservar */}
      {showReservar && local && usuario && (
        <ReservarModal
          local={local}
          usuario={usuario}
          onClose={() => setShowReservar(false)}
          onReservado={() => { setShowReservar(false); toast.success('Solicitud de reserva enviada. El local la confirmará pronto.') }}
        />
      )}

      {/* Footer fijo: comprar entrada */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
        <div className="glass-strong p-3 rounded-2xl border border-white/10 flex items-center gap-3">
          <div>
            <p className="text-xs text-[#6B6B85]">Entrada desde</p>
            <p className="font-bold text-white">
              {local.precio_entrada_min === 0 ? 'Gratis' : formatearPrecio(local.precio_entrada_min || 0)}
            </p>
          </div>
          <Button className="flex-1" onClick={irAComprar}>
            <Ticket size={16} /> Comprar entrada
          </Button>
        </div>
      </div>

      {/* Modal: consumición de bienvenida antes de comprar */}
      {showBienvenida && local.consumiciones_bienvenida && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowBienvenida(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-md glass-strong rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up safe-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <Beer size={18} className="text-[#E94560]" />
              <h3 className="text-lg font-bold text-white text-display">Consumición de bienvenida</h3>
            </div>
            <p className="text-sm text-[#8B8BA8] mb-4">Este local te incluye una consumición. Elige la tuya y la verás aplicada en la compra.</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {local.consumiciones_bienvenida.map(c => {
                const sel = bienvenidaSel === c.id
                return (
                  <button key={c.id} onClick={() => setBienvenidaSel(c.id)}
                    className={cn('w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors',
                      sel ? 'bg-[#E94560]/12 border-[#E94560]/40' : 'bg-white/4 border-white/8 hover:bg-white/8')}>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{c.nombre || 'Consumición'}</p>
                      {c.descripcion && <p className="text-xs text-[#8B8BA8] truncate">{c.descripcion}</p>}
                    </div>
                    {sel && <Check size={16} className="text-[#E94560] shrink-0" />}
                  </button>
                )
              })}
              <button onClick={() => setBienvenidaSel(null)}
                className={cn('w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors',
                  bienvenidaSel === null ? 'bg-[#E94560]/12 border-[#E94560]/40' : 'bg-white/4 border-white/8 hover:bg-white/8')}>
                <span className="text-sm text-white">Ninguna, gracias</span>
                {bienvenidaSel === null && <Check size={16} className="text-[#E94560] shrink-0" />}
              </button>
            </div>
            <Button fullWidth size="lg" className="mt-4" onClick={continuarCompra}>
              Continuar a la compra <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
