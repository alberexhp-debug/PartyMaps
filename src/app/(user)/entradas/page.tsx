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
    <div className="relative min-h-screen overflow-hidden">
      <div className="hero-halo-rose" />

      {/* Header */}
      <div className="relative px-5 pt-6 pb-0 safe-top">
        <p className="eyebrow mb-2">Tus accesos</p>
        <h1 className="text-display-lg text-white">Mis entradas</h1>
        <p className="text-[#A0A0B8] mt-2 text-sm">
          {activas.length === 0 ? 'Sin entradas activas' : `${activas.length} ${activas.length === 1 ? 'entrada lista' : 'entradas listas'}`}
        </p>

        <div className="flex gap-1 glass-subtle rounded-2xl p-1 mt-5">
          {(['activas', 'historial'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold transition-all capitalize rounded-xl',
                tab === t
                  ? 'bg-[#E94560] text-white shadow-[0_6px_20px_-4px_rgba(233,69,96,0.6)]'
                  : 'text-[#A0A0B8] hover:text-white'
              )}
            >
              {t === 'activas' ? `Activas · ${activas.length}` : `Historial · ${historial.length}`}
            </button>
          ))}
        </div>
      </div>

      <div className="relative p-4 space-y-3 mt-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
          ))
        ) : mostradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center px-6">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-3xl holo-bg opacity-20 blur-2xl" />
              <div className="relative w-full h-full card-premium flex items-center justify-center">
                <Ticket size={36} className="text-[#A0A0B8]" />
              </div>
            </div>
            <p className="text-[#FAFAFC] text-lg font-semibold text-display max-w-xs">
              {tab === 'activas' ? 'Aún no hay entradas' : 'Sin historial'}
            </p>
            <p className="text-[#A0A0B8] text-sm max-w-xs">
              {tab === 'activas'
                ? 'Encuentra el local perfecto para esta noche en el mapa.'
                : 'Aquí verás las entradas usadas y caducadas.'}
            </p>
            {tab === 'activas' && (
              <button
                onClick={() => router.push('/explorar')}
                className="text-sm text-[#E94560] font-semibold flex items-center gap-1 mt-2"
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
    usada: 'text-[#6B6B85] bg-white/6 border-white/10',
    cancelada: 'text-red-400 bg-red-400/10 border-red-400/30',
    expirada: 'text-[#6B6B85] bg-white/6 border-white/10',
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
      className="w-full card-premium overflow-hidden hover:-translate-y-0.5 transition-transform active:scale-[0.99] text-left"
    >
      <div className="flex items-stretch">
        {/* Imagen */}
        <div className="w-24 h-28 bg-white/5 flex-shrink-0 relative">
          <img
            src={entrada.local?.imagenes?.[0] || ''}
            alt={entrada.local?.nombre}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/40" />
        </div>

        {/* Línea dentada decorativa */}
        <div className="flex flex-col justify-center -mx-1 z-10">
          <div className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#06060C]" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 p-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">{entrada.local?.nombre}</p>
              {entrada.evento ? (
                <p className="text-xs text-[#A0A0B8] truncate">{entrada.evento.nombre}</p>
              ) : (
                <p className="text-xs text-[#6B6B85]">Entrada general</p>
              )}
            </div>
            <span className={cn('shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium', estadoColor)}>
              {estadoLabel}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[#6B6B85]">
              <Clock size={11} />
              <span>{formatearFecha(entrada.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#A0A0B8] font-medium">{formatearPrecio(entrada.precio_total)}</span>
              <ChevronRight size={14} className="text-[#6B6B85]" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
