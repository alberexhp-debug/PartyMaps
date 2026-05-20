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
import {
  getLabelTipoLocal, getColorTemperatura, getLabelTemperatura,
  formatearPrecio, getTemperaturaAforo, tiempoRelativo
} from '@/lib/utils'
import {
  ChevronLeft, Bell, BellOff, MapPin, Clock, Music, Ticket,
  Star, MessageSquare, Lightbulb, Share2, Navigation
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    const cargar = async () => {
      const [{ data: localData }, { data: reviewsData }] = await Promise.all([
        supabase.from('locales').select('*, eventos(id,nombre,estado,fecha_inicio,imagen_url)').eq('id', id).single(),
        supabase.from('reviews').select('*, usuarios(nombre, foto_perfil_url)').eq('local_id', id).eq('estado', 'activa').eq('censurada', false).order('created_at', { ascending: false }).limit(20),
      ])

      if (localData) {
        setLocal({ ...localData, temperatura: getTemperaturaAforo(localData.aforo_estimado_porcentaje || 0) })
      }
      if (reviewsData) setReviews(reviewsData)

      if (usuario) {
        const { data: sub } = await supabase.from('suscripciones').select('id').match({ usuario_id: usuario.id, local_id: id }).single()
        setSuscrito(!!sub)
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0D0D1A]">
      <Spinner size="lg" />
    </div>
  )

  if (!local) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D1A] gap-4">
      <p className="text-[#A0A0B8]">Local no encontrado</p>
      <Button onClick={() => router.back()}>Volver</Button>
    </div>
  )

  const colorTemp = getColorTemperatura(local.temperatura)
  const eventoActivo = (local as LocalConAforo & { eventos?: Array<{ id: string; nombre: string; estado: string; imagen_url?: string }> }).eventos?.find((e: { estado: string }) => e.estado === 'publicado')
  const mediaReviews = reviews.length > 0 ? reviews.reduce((a, r) => a + r.puntuacion, 0) / reviews.length : 0
  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
  const diasLabel = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      {/* Galería */}
      <div className="relative h-72">
        {local.imagenes?.length > 0 ? (
          <img
            src={local.imagenes[imagenActiva]}
            alt={local.nombre}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }}
          />
        ) : (
          <div className="w-full h-full bg-[#1A1A2E] flex items-center justify-center">
            <Music size={48} className="text-[#2A2A3E]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D1A] via-[#0D0D1A]/20 to-transparent" />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-top">
          <button onClick={() => router.back()} className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
            <ChevronLeft size={22} />
          </button>
          <div className="flex gap-2">
            <button onClick={compartir} className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
              <Share2 size={18} />
            </button>
            <button onClick={toggleSuscripcion} className={cn(
              'w-10 h-10 rounded-xl backdrop-blur-sm flex items-center justify-center transition-colors',
              suscrito ? 'bg-[#E94560] text-white' : 'bg-black/50 text-white'
            )}>
              {suscrito ? <Bell size={18} className="fill-current" /> : <BellOff size={18} />}
            </button>
          </div>
        </div>

        {/* Miniaturas galería */}
        {local.imagenes?.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {local.imagenes.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => setImagenActiva(i)}
                className={cn('rounded-full transition-all', i === imagenActiva ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="px-5 space-y-5 pb-32">
        {/* Cabecera */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">{local.nombre}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default">{getLabelTipoLocal(local.tipo_local)}</Badge>
                {local.tier === 'destacado' && <Badge variant="gold">★ Destacado</Badge>}
              </div>
            </div>
            {reviews.length > 0 && <StarDisplay value={mediaReviews} count={reviews.length} />}
          </div>

          <div className="flex items-center gap-2 text-sm text-[#A0A0B8]">
            <MapPin size={14} />
            <span>{local.direccion}</span>
            <button className="ml-auto flex items-center gap-1 text-[#4F8EF7] text-xs"
              onClick={() => window.open(`https://maps.google.com/?q=${local.latitud},${local.longitud}`)}>
              <Navigation size={12} /> Cómo llegar
            </button>
          </div>
        </div>

        {/* Estado aforo */}
        <div className="p-4 bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', local.temperatura === 'caliente' && 'animate-pulse-heat')}
                style={{ background: colorTemp }} />
              <span className="font-semibold text-white">{getLabelTemperatura(local.temperatura)} ahora</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: colorTemp }}>
              {Math.round(local.aforo_estimado_porcentaje || 0)}%
            </span>
          </div>
          <div className="h-2 bg-[#0D0D1A] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${local.aforo_estimado_porcentaje || 0}%`, background: colorTemp }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-[#505065]">Estimación actualizada hace &lt;10 min</span>
            <span className="text-xs text-[#505065]">Pico: 2:00 AM</span>
          </div>
          {local.aforo_correccion_manual && (
            <p className="text-xs text-[#4F8EF7] mt-2">ℹ Información actualizada por el local</p>
          )}
        </div>

        {/* Evento activo */}
        {eventoActivo && (
          <div className="p-4 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-[#F39C12] fill-current" />
              <span className="text-sm font-semibold text-[#F39C12]">Evento esta noche</span>
            </div>
            <p className="text-white font-bold">{eventoActivo.nombre}</p>
          </div>
        )}

        {/* Módulos de experiencia */}
        {local.modulos_activos?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#A0A0B8]">Esta noche</h3>
            <div className="flex flex-wrap gap-2">
              {local.modulos_activos.includes('concurso') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 rounded-xl">
                  <span>📸</span><span className="text-sm text-[#4F8EF7] font-medium">Concurso activo</span>
                </div>
              )}
              {local.modulos_activos.includes('perfil_noche') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <span>✨</span><span className="text-sm text-yellow-400 font-medium">Perfil de noche</span>
                </div>
              )}
              {local.modulos_activos.includes('retos') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F39C12]/10 border border-[#F39C12]/20 rounded-xl">
                  <span>🎯</span><span className="text-sm text-[#F39C12] font-medium">Retos activos</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs info / reviews */}
        <div className="flex gap-1 p-1 bg-[#1A1A2E] rounded-xl">
          {(['info', 'reviews'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === t ? 'bg-[#E94560] text-white' : 'text-[#505065]'
              )}
            >
              {t === 'info' ? 'Información' : `Reviews (${reviews.length})`}
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
                  {local.musica.map(m => <Badge key={m} variant="blue">{m}</Badge>)}
                </div>
              </div>
            )}

            {local.horario && Object.keys(local.horario).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock size={14} /> Horario</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {diasSemana.map((dia, i) => {
                    const h = local.horario[dia as keyof typeof local.horario]
                    return (
                      <div key={dia} className="flex justify-between text-sm p-2.5 bg-[#1A1A2E] rounded-lg">
                        <span className="text-[#A0A0B8]">{diasLabel[i]}</span>
                        <span className="text-white">{h ? `${h.apertura}–${h.cierre}` : 'Cerrado'}</span>
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
                  <div key={c.id} className="flex justify-between items-center p-3 bg-[#1A1A2E] rounded-xl border border-[#2A2A3E]">
                    <div>
                      <p className="text-sm font-medium text-white">{c.nombre}</p>
                      <p className="text-xs text-[#505065]">{c.descripcion}</p>
                    </div>
                    <span className="text-[#E94560] font-semibold">{formatearPrecio(c.precio)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <MessageSquare size={40} className="text-[#505065]" />
                <p className="text-[#505065] text-sm text-center">Aún no hay reviews. Sé el primero en opinar.</p>
              </div>
            ) : (
              <>
                {/* Distribución de estrellas */}
                <div className="p-4 bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E]">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-bold text-white">{mediaReviews.toFixed(1)}</span>
                      <StarDisplay value={mediaReviews} />
                      <span className="text-xs text-[#505065] mt-1">{reviews.length} reviews</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map(n => {
                        const count = reviews.filter(r => r.puntuacion === n).length
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                        return (
                          <div key={n} className="flex items-center gap-2 text-xs">
                            <span className="text-[#505065] w-3">{n}</span>
                            <div className="flex-1 h-1.5 bg-[#0D0D1A] rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[#505065] w-4">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {reviews.map(review => (
                  <div key={review.id} className="p-4 bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] space-y-2">
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
                      <span className="text-xs text-[#505065]">{tiempoRelativo(review.created_at)}</span>
                    </div>
                    {review.comentario && <p className="text-sm text-[#A0A0B8]">{review.comentario}</p>}
                    {review.respuesta_local && (
                      <div className="mt-2 p-3 bg-[#0D0D1A] rounded-xl border-l-2 border-[#E94560]">
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

      {/* Footer fijo: comprar entrada */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
        <div className="bg-[#0D0D1A]/95 backdrop-blur-md p-3 rounded-2xl border border-[#2A2A3E] flex items-center gap-3">
          <div>
            <p className="text-xs text-[#505065]">Entrada desde</p>
            <p className="font-bold text-white">
              {local.precio_entrada_min === 0 ? 'Gratis' : formatearPrecio(local.precio_entrada_min || 0)}
            </p>
          </div>
          <Button className="flex-1" onClick={() => router.push(`/local/${local.id}/comprar`)}>
            <Ticket size={16} /> Comprar entrada
          </Button>
        </div>
      </div>
    </div>
  )
}
