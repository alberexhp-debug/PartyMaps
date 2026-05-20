'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Evento, EstadoEvento } from '@/types'
import { formatearFecha, formatearHora, formatearPrecio } from '@/lib/utils'
import { Plus, Calendar, Ticket, Users, Eye, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function EventosPage() {
  const router = useRouter()
  const { local } = useLocalPanelStore()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<EstadoEvento | 'todos'>('todos')

  useEffect(() => {
    if (!local) return
    cargar()
  }, [local])

  async function cargar() {
    const { data } = await supabase
      .from('eventos')
      .select('*')
      .eq('local_id', local!.id)
      .order('fecha_inicio', { ascending: false })
    if (data) setEventos(data)
    setLoading(false)
  }

  async function eliminar(eventoId: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('eventos').update({ estado: 'cancelado' }).eq('id', eventoId)
    cargar()
  }

  const filtrados = filtro === 'todos' ? eventos : eventos.filter(e => e.estado === filtro)

  const estadoBadge = (estado: EstadoEvento) => {
    const map: Record<EstadoEvento, { variant: 'success' | 'warning' | 'danger' | 'default' | 'blue' | 'gold'; label: string }> = {
      publicado: { variant: 'success', label: 'Publicado' },
      borrador: { variant: 'warning', label: 'Borrador' },
      cancelado: { variant: 'danger', label: 'Cancelado' },
      finalizado: { variant: 'default', label: 'Finalizado' },
    }
    return map[estado]
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Eventos</h1>
        <Button size="sm" onClick={() => router.push('/local-panel/eventos/nuevo')}>
          <Plus size={14} /> Crear evento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['todos', 'publicado', 'borrador', 'cancelado', 'finalizado'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium border capitalize transition-colors',
              filtro === f
                ? 'bg-[#E94560] border-[#E94560] text-white'
                : 'border-[#2A2A3E] text-[#505065] hover:text-white'
            )}
          >
            {f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 bg-[#1A1A2E] rounded-2xl animate-pulse" />
        ))
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Calendar size={40} className="text-[#505065]" />
          <p className="text-[#505065]">No hay eventos</p>
          <Button size="sm" onClick={() => router.push('/local-panel/eventos/nuevo')}>
            <Plus size={14} /> Crear el primero
          </Button>
        </div>
      ) : (
        filtrados.map(evento => {
          const badge = estadoBadge(evento.estado)
          const ocupacion = evento.aforo_maximo > 0
            ? Math.round((evento.entradas_vendidas / evento.aforo_maximo) * 100)
            : 0
          return (
            <div key={evento.id} className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{evento.nombre}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#505065] mt-0.5">
                    <Calendar size={11} />
                    {formatearFecha(evento.fecha_inicio)} · {formatearHora(evento.fecha_inicio)}
                  </div>
                </div>
                <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#0D0D1A] rounded-xl p-2">
                  <Ticket size={12} className="text-[#E94560] mx-auto mb-1" />
                  <p className="text-xs text-[#505065]">Vendidas</p>
                  <p className="text-sm font-bold text-white">{evento.entradas_vendidas}</p>
                </div>
                <div className="bg-[#0D0D1A] rounded-xl p-2">
                  <Users size={12} className="text-[#4F8EF7] mx-auto mb-1" />
                  <p className="text-xs text-[#505065]">Aforo</p>
                  <p className="text-sm font-bold text-white">{evento.aforo_maximo}</p>
                </div>
                <div className="bg-[#0D0D1A] rounded-xl p-2">
                  <Eye size={12} className="text-[#F39C12] mx-auto mb-1" />
                  <p className="text-xs text-[#505065]">Precio</p>
                  <p className="text-sm font-bold text-white">{formatearPrecio(evento.precio_base)}</p>
                </div>
              </div>

              {/* Barra ocupación */}
              <div>
                <div className="flex justify-between text-xs text-[#505065] mb-1">
                  <span>Ocupación</span>
                  <span>{ocupacion}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0D0D1A] rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', ocupacion > 90 ? 'bg-[#E94560]' : ocupacion > 60 ? 'bg-[#F39C12]' : 'bg-[#4F8EF7]')}
                    style={{ width: `${ocupacion}%` }}
                  />
                </div>
              </div>

              {/* Early bird */}
              {evento.precio_early_bird && evento.early_bird_hasta && new Date(evento.early_bird_hasta) > new Date() && (
                <div className="flex items-center gap-2 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
                  <AlertCircle size={12} className="text-green-400 shrink-0" />
                  <span className="text-green-400">
                    Early Bird activo: {formatearPrecio(evento.precio_early_bird)} hasta {formatearFecha(evento.early_bird_hasta)}
                  </span>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => router.push(`/local-panel/eventos/${evento.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 border border-[#2A2A3E] rounded-xl text-sm text-[#A0A0B8] hover:border-[#E94560]/50 hover:text-white transition-colors"
                >
                  <Edit2 size={13} /> Editar
                </button>
                {evento.estado !== 'cancelado' && (
                  <button
                    onClick={() => eliminar(evento.id)}
                    className="flex items-center justify-center gap-1.5 h-9 px-3 border border-red-500/30 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
