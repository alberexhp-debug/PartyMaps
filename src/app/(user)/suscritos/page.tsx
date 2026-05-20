'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Local, Evento } from '@/types'
import { formatearFecha, formatearHora, getLabelTipoLocal } from '@/lib/utils'
import { Bell, Calendar, ChevronRight, BellOff, MapPin } from 'lucide-react'
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
  const { usuario } = useAuthStore()
  const [suscripciones, setSuscripciones] = useState<SuscripcionConLocal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!usuario) { router.push('/login'); return }
    cargar()
  }, [usuario])

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
    <div className="min-h-screen bg-[#0D0D1A]">
      <div className="bg-[#0D0D1A] border-b border-[#1A1A2E] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Suscritos</h1>
        <p className="text-sm text-[#505065] mt-0.5">{suscripciones.length} locales seguidos</p>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-[#1A1A2E] rounded-2xl animate-pulse" />
          ))
        ) : suscripciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-[#1A1A2E] rounded-2xl flex items-center justify-center">
              <Bell size={28} className="text-[#505065]" />
            </div>
            <p className="text-[#505065] text-center">No sigues ningún local todavía</p>
            <button onClick={() => router.push('/explorar')} className="text-sm text-[#E94560] font-medium">
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
              <div key={s.id} className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] overflow-hidden">
                {/* Banner */}
                <div className="relative h-24">
                  <img
                    src={local.imagenes?.[0] || ''}
                    alt={local.nombre}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-[#1A1A2E]/60 to-transparent" />
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
                      ? <BellOff size={12} className="text-[#505065]" />
                      : <Bell size={12} className="text-white" />
                    }
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white">{local.nombre}</h3>
                      <div className="flex items-center gap-1 text-xs text-[#505065]">
                        <MapPin size={10} />
                        {local.ciudad} · {getLabelTipoLocal(local.tipo_local)}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/local/${local.id}`)}
                      className="flex items-center gap-1 text-xs text-[#A0A0B8] border border-[#2A2A3E] rounded-lg px-2 py-1 hover:border-[#505065] shrink-0"
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
                    <p className="text-xs text-[#505065]">Sin eventos próximos</p>
                  )}

                  {s.silenciada && (
                    <p className="text-[10px] text-[#505065]">Notificaciones silenciadas</p>
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
