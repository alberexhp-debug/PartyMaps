'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Local, Evento } from '@/types'
import { formatearFecha, formatearHora, getLabelTipoLocal } from '@/lib/utils'
import { Bell, Calendar, ChevronRight, BellOff, MapPin } from 'lucide-react'
import { IlustracionRadar } from '@/components/ui/Illustration'
import { LocalImagen } from '@/components/ui/LocalImagen'
import { SkeletonSuscritoCard } from '@/components/ui/ErrorState'
import { PullIndicator } from '@/components/ui/PullIndicator'
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh'
import { cn } from '@/lib/utils'

type SuscripcionConLocal = {
  id: string
  local_id: string
  silenciada: boolean
  created_at: string
  locales: Local & { eventos?: Evento[] }
}

export default function SuscritosPage() {
  const router = useRouter()
  const { usuario, isLoading } = useAuthStore()
  const [suscripciones, setSuscripciones] = useState<SuscripcionConLocal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoading) return            // esperar a que AuthProvider resuelva la sesión
    if (!usuario) { router.push('/login'); return }
    cargar()
  }, [usuario, isLoading])

  const ptr = usePullToRefresh({ onRefresh: cargar })

  async function cargar() {
    const { data } = await supabase
      .from('suscripciones')
      .select(`
        *,
        locales!inner(
          id, nombre, imagenes, ciudad, tipo_local, tier,
          aforo_estimado_porcentaje, modulos_activos,
          eventos(id, nombre, fecha_inicio, estado, precio_base)
        )
      `)
      .eq('usuario_id', usuario!.id)
      .order('created_at', { ascending: false })

    if (data) setSuscripciones(data as SuscripcionConLocal[])
    setLoading(false)
  }

  const toggleSilenciar = async (suscripcionId: string, silenciada: boolean) => {
    await supabase.from('suscripciones').update({ silenciada: !silenciada }).eq('id', suscripcionId)
    setSuscripciones(prev => prev.map(s => s.id === suscripcionId ? { ...s, silenciada: !silenciada } : s))
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PullIndicator {...ptr} />
      <div className="hero-halo-violet" />
      <div className="relative px-5 pt-6 pb-3 safe-top">
        <p className="eyebrow eyebrow-violet mb-2">Tu radar</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Suscritos</h1>
        <p className="text-[#A0A0B8] mt-2 text-sm">
          <span className="text-white font-bold text-numeric">{suscripciones.length}</span> {suscripciones.length === 1 ? 'local seguido' : 'locales seguidos'}
        </p>
      </div>

      <div className="relative p-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonSuscritoCard key={i} />)
        ) : suscripciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <IlustracionRadar size={140} />
            <p className="text-[#FAFAFC] text-xl font-semibold text-display max-w-xs">Tu radar está vacío</p>
            <p className="text-[#A0A0B8] text-sm max-w-xs">Sigue tus locales favoritos para recibir avisos de aforo, eventos y promos sin tener que abrir la app.</p>
            <button onClick={() => router.push('/explorar')} className="text-sm text-[#B6FF3A] font-semibold mt-2">
              Explorar locales →
            </button>
          </div>
        ) : (
          suscripciones.map(s => {
            const local = s.locales
            const proximoEvento = local.eventos
              ?.filter(e => e.estado === 'publicado' && new Date(e.fecha_inicio) > new Date())
              .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())[0]

            return (
              <div key={s.id} className="card-premium overflow-hidden">
                {/* Banner */}
                <div className="relative h-28">
                  <LocalImagen src={local.imagenes?.[0]} nombre={local.nombre} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14142A] via-[#14142A]/40 to-transparent" />
                  {local.tier === 'destacado' && (
                    <div className="absolute top-2 left-3 px-2 py-0.5 bg-[#F39C12] rounded-full text-[10px] font-bold text-white">
                      ★ Destacado
                    </div>
                  )}
                  <button
                    onClick={() => toggleSilenciar(s.id, s.silenciada)}
                    className="absolute top-2 right-3 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    {s.silenciada
                      ? <BellOff size={12} className="text-[#6B6B85]" />
                      : <Bell size={12} className="text-white" />
                    }
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white">{local.nombre}</h3>
                      <div className="flex items-center gap-1 text-xs text-[#6B6B85]">
                        <MapPin size={10} />
                        {local.ciudad} · {getLabelTipoLocal(local.tipo_local)}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/local/${local.id}`)}
                      className="flex items-center gap-1 text-xs text-[#A0A0B8] border border-white/10 rounded-lg px-2 py-1 hover:border-[#505065] shrink-0"
                    >
                      Ver <ChevronRight size={11} />
                    </button>
                  </div>

                  {proximoEvento ? (
                    <div className="flex items-center gap-2 p-2 bg-[#F39C12]/10 border border-[#F39C12]/20 rounded-xl">
                      <Calendar size={12} className="text-[#F39C12] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#F39C12] truncate">{proximoEvento.nombre}</p>
                        <p className="text-[10px] text-[#F39C12]/70">
                          {formatearFecha(proximoEvento.fecha_inicio)} · {formatearHora(proximoEvento.fecha_inicio)}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/local/${local.id}/comprar`)}
                        className="shrink-0 text-[10px] px-2 py-1 bg-[#F39C12] rounded-lg text-black font-bold"
                      >
                        Tickets
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B6B85]">Sin eventos próximos</p>
                  )}

                  {s.silenciada && (
                    <p className="text-[10px] text-[#6B6B85]">Notificaciones silenciadas</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
