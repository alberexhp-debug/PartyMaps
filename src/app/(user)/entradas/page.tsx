'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Entrada, Local, Evento } from '@/types'
import { formatearPrecio, formatearFecha } from '@/lib/utils'
import { Ticket, Clock, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type EntradaConInfo = Entrada & { local?: Local; evento?: Evento }

export default function EntradasPage() {
  const router = useRouter()
  const { usuario } = useAuthStore()
  const [entradas, setEntradas] = useState<EntradaConInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'activas' | 'historial'>('activas')

  useEffect(() => {
    if (!usuario) { router.push('/login'); return }
    cargar()
  }, [usuario])

  async function cargar() {
    const { data } = await supabase
      .from('entradas')
      .select(`
        *,
        locales!inner(id, nombre, imagenes, ciudad, tipo_local),
        eventos(id, nombre, fecha_inicio)
      `)
      .eq('usuario_id', usuario!.id)
      .order('created_at', { ascending: false })

    if (data) {
      setEntradas(data.map((e: EntradaConInfo & { locales?: Local; eventos?: Evento }) => ({
        ...e,
        local: e.locales,
        evento: e.eventos,
      })))
    }
    setLoading(false)
  }

  const activas = entradas.filter(e => e.estado === 'activa')
  const historial = entradas.filter(e => e.estado !== 'activa')
  const mostradas = tab === 'activas' ? activas : historial

  return (
    <div className="min-h-screen bg-[#0D0D1A]">
      {/* Header */}
      <div className="bg-[#0D0D1A] border-b border-[#1A1A2E] px-4 pt-4 pb-0 safe-top">
        <h1 className="text-xl font-bold text-white mb-4">Mis entradas</h1>
        <div className="flex gap-1">
          {(['activas', 'historial'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-[#E94560] text-white'
                  : 'border-transparent text-[#505065]'
              )}
            >
              {t === 'activas' ? `Activas (${activas.length})` : `Historial (${historial.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#1A1A2E] rounded-2xl animate-pulse" />
          ))
        ) : mostradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-[#1A1A2E] rounded-2xl flex items-center justify-center">
              <Ticket size={28} className="text-[#505065]" />
            </div>
            <p className="text-[#505065] text-center">
              {tab === 'activas' ? 'No tienes entradas activas' : 'No tienes entradas en el historial'}
            </p>
            {tab === 'activas' && (
              <button
                onClick={() => router.push('/explorar')}
                className="text-sm text-[#E94560] font-medium"
              >
                Explorar locales →
              </button>
            )}
          </div>
        ) : (
          mostradas.map(entrada => (
            <EntradaCard key={entrada.id} entrada={entrada} onClick={() => router.push(`/entradas/${entrada.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}

function EntradaCard({ entrada, onClick }: { entrada: EntradaConInfo; onClick: () => void }) {
  const estadoColor = {
    activa: 'text-green-400 bg-green-400/10 border-green-400/30',
    usada: 'text-[#505065] bg-[#1A1A2E] border-[#2A2A3E]',
    cancelada: 'text-red-400 bg-red-400/10 border-red-400/30',
    expirada: 'text-[#505065] bg-[#1A1A2E] border-[#2A2A3E]',
  }[entrada.estado]

  const estadoLabel = {
    activa: 'Válida',
    usada: 'Usada',
    cancelada: 'Cancelada',
    expirada: 'Expirada',
  }[entrada.estado]

  return (
    <button
      onClick={onClick}
      className="w-full bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] overflow-hidden hover:border-[#E94560]/30 transition-colors"
    >
      <div className="flex items-stretch">
        {/* Imagen */}
        <div className="w-20 h-20 bg-[#0D0D1A] flex-shrink-0">
          <img
            src={entrada.local?.imagenes?.[0] || ''}
            alt={entrada.local?.nombre}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Línea dentada decorativa */}
        <div className="flex flex-col justify-center">
          <div className="w-0 border-l-2 border-dashed border-[#2A2A3E] h-full mx-0.5" />
        </div>

        {/* Info */}
        <div className="flex-1 p-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">{entrada.local?.nombre}</p>
              {entrada.evento ? (
                <p className="text-xs text-[#A0A0B8] truncate">{entrada.evento.nombre}</p>
              ) : (
                <p className="text-xs text-[#505065]">Entrada general</p>
              )}
            </div>
            <span className={cn('shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium', estadoColor)}>
              {estadoLabel}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[#505065]">
              <Clock size={11} />
              <span>{formatearFecha(entrada.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#A0A0B8] font-medium">{formatearPrecio(entrada.precio_total)}</span>
              <ChevronRight size={14} className="text-[#505065]" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
