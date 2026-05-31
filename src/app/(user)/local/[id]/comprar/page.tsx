'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Local, Evento, ConsumicionBienvenida } from '@/types'
import { calcularComision, formatearPrecio, formatearFecha, formatearHora } from '@/lib/utils'
import { ArrowLeft, Ticket, Clock, Users, ChevronRight, Check, AlertCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ComprarEntradaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { usuario } = useAuthStore()

  const [local, setLocal] = useState<Local | null>(null)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)
  const [comprando, setComprando] = useState(false)
  const [consumicionSeleccionada, setConsumicionSeleccionada] = useState<ConsumicionBienvenida | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [paso, setPaso] = useState<'resumen' | 'pago' | 'exito'>('resumen')

  useEffect(() => {
    async function cargar() {
      const { data: localData } = await supabase
        .from('locales')
        .select('*')
        .eq('id', id)
        .single()
      if (!localData) { router.push('/mapa'); return }
      setLocal(localData)

      const { data: eventoData } = await supabase
        .from('eventos')
        .select('*')
        .eq('local_id', id)
        .eq('estado', 'publicado')
        .gte('fecha_inicio', new Date().toISOString())
        .order('fecha_inicio', { ascending: true })
        .limit(1)
        .single()
      if (eventoData) setEvento(eventoData)

      setLoading(false)
    }
    cargar()
  }, [id, router])

  const precioBase = (() => {
    if (!evento) return local?.precio_entrada_min || 0
    const ahora = new Date()
    const earlyBirdActivo = evento.precio_early_bird &&
      evento.early_bird_hasta &&
      new Date(evento.early_bird_hasta) > ahora &&
      (evento.early_bird_cupo == null || evento.entradas_vendidas < evento.early_bird_cupo)
    return earlyBirdActivo ? evento.precio_early_bird! : evento.precio_base
  })()

  const precioEarlyBird = (() => {
    if (!evento?.precio_early_bird || !evento.early_bird_hasta) return null
    const ahora = new Date()
    if (new Date(evento.early_bird_hasta) > ahora) return evento.precio_early_bird
    return null
  })()

  const comision = calcularComision(precioBase, local?.tier || 'basico')
  const subtotal = (precioBase + (consumicionSeleccionada?.precio || 0)) * cantidad
  const comisionTotal = comision * cantidad
  const total = subtotal + comisionTotal

  const comprar = async () => {
    if (!usuario) { router.push('/login'); return }
    setComprando(true)
    try {
      const res = await fetch('/api/entradas/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_id: id,
          evento_id: evento?.id,
          consumicion_id: consumicionSeleccionada?.id,
          cantidad,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPaso('exito')
      // Celebración con confeti en la paleta Rumbo
      const { dispararConfetiCompra } = await import('@/lib/confeti')
      dispararConfetiCompra()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al comprar entrada')
    } finally {
      setComprando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!local) return null

  if (paso === 'exito') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
          <Check size={40} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">¡Compra completada!</h1>
        <p className="text-[#A0A0B8] mb-8">
          {cantidad === 1 ? 'Tu entrada está lista en tu wallet' : `Tus ${cantidad} entradas están listas en tu wallet`}
        </p>
        <Button className="w-full max-w-xs" onClick={() => router.push('/entradas')}>
          <Ticket size={18} />
          Ver mis entradas
        </Button>
        <button onClick={() => router.push(`/local/${id}`)} className="mt-4 text-sm text-[#6B6B85] underline">
          Volver al local
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/5/95 backdrop-blur-sm border-b border-[#1A1A2E] px-4 py-3 flex items-center gap-3 safe-top">
        <button aria-label="Volver" onClick={() => router.back()} className="p-2 -ml-2 text-[#A0A0B8]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white">Comprar entrada</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Local & Evento */}
        <div className="bg-white/6 rounded-2xl p-4 border border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#2A2A3E] flex-shrink-0">
              <img src={local.imagenes?.[0] || ''} alt={local.nombre} className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-white truncate">{local.nombre}</h2>
              <p className="text-sm text-[#A0A0B8]">{local.ciudad}</p>
              {evento && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-lg text-xs text-[#F39C12] font-medium">
                    ★ {evento.nombre}
                  </span>
                </div>
              )}
            </div>
          </div>

          {evento && (
            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-[#A0A0B8]">
                <Clock size={14} />
                <span>{formatearFecha(evento.fecha_inicio)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#A0A0B8]">
                <Zap size={14} />
                <span>{formatearHora(evento.fecha_inicio)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Early bird banner */}
        {precioEarlyBird && precioEarlyBird < evento!.precio_base && (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
            <Zap size={16} className="text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-400">¡Precio Early Bird activo!</p>
              <p className="text-xs text-green-400/70">Hasta {formatearFecha(evento!.early_bird_hasta!)}</p>
            </div>
          </div>
        )}

        {/* Cantidad */}
        <div className="bg-white/6 rounded-2xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider mb-3">Entradas</h3>
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">Número de entradas</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                className="w-8 h-8 rounded-full border border-white/10 text-white flex items-center justify-center hover:border-[#E94560]/50"
              >
                −
              </button>
              <span className="text-white font-bold w-4 text-center">{cantidad}</span>
              <button
                onClick={() => setCantidad(Math.min(10, cantidad + 1))}
                className="w-8 h-8 rounded-full border border-white/10 text-white flex items-center justify-center hover:border-[#E94560]/50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Consumiciones */}
        {local.consumiciones_bienvenida?.length > 0 && (
          <div className="bg-white/6 rounded-2xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider mb-3">Consumición de bienvenida</h3>
            <div className="space-y-2">
              <button
                onClick={() => setConsumicionSeleccionada(null)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border transition-colors',
                  !consumicionSeleccionada
                    ? 'border-[#E94560] bg-[#E94560]/10'
                    : 'border-white/10 bg-white/5'
                )}
              >
                <span className="text-sm text-white">Sin consumición</span>
                {!consumicionSeleccionada && <Check size={16} className="text-[#E94560]" />}
              </button>
              {local.consumiciones_bienvenida.map(c => (
                <button
                  key={c.id}
                  onClick={() => setConsumicionSeleccionada(c)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl border transition-colors',
                    consumicionSeleccionada?.id === c.id
                      ? 'border-[#E94560] bg-[#E94560]/10'
                      : 'border-white/10 bg-white/5'
                  )}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{c.nombre}</p>
                    <p className="text-xs text-[#6B6B85]">{c.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-sm text-[#E94560] font-semibold">+{formatearPrecio(c.precio)}</span>
                    {consumicionSeleccionada?.id === c.id && <Check size={16} className="text-[#E94560]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Desglose precio */}
        <div className="bg-white/6 rounded-2xl p-4 border border-white/10 space-y-2">
          <h3 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider mb-3">Resumen</h3>
          <div className="flex justify-between text-sm">
            <span className="text-[#A0A0B8]">
              Entrada × {cantidad} {precioEarlyBird ? '(Early Bird)' : ''}
            </span>
            <span className="text-white">{formatearPrecio(precioBase * cantidad)}</span>
          </div>
          {consumicionSeleccionada && (
            <div className="flex justify-between text-sm">
              <span className="text-[#A0A0B8]">Consumición × {cantidad}</span>
              <span className="text-white">{formatearPrecio(consumicionSeleccionada.precio * cantidad)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-[#A0A0B8]">Comisión de servicio</span>
            <span className="text-white">{formatearPrecio(comisionTotal)}</span>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between">
            <span className="font-bold text-white">Total</span>
            <span className="font-bold text-[#E94560] text-lg">{formatearPrecio(total)}</span>
          </div>
        </div>

        {/* Info pago */}
        <div className="flex items-start gap-2 px-1">
          <AlertCircle size={14} className="text-[#6B6B85] mt-0.5 shrink-0" />
          <p className="text-xs text-[#6B6B85]">
            El pago es seguro. Tu entrada quedará disponible inmediatamente en tu wallet con código QR.
            En modo demo, la entrada se crea directamente sin cargo real.
          </p>
        </div>

        {/* Botones */}
        <div className="space-y-2 pt-2">
          <Button fullWidth loading={comprando} onClick={comprar}>
            <Ticket size={18} />
            {total === 0 ? 'Reservar entrada gratis' : `Pagar ${formatearPrecio(total)}`}
          </Button>
          {cantidad === 1 && (
            <button
              onClick={() => router.push(`/planes?local=${id}`)}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-white/10 text-[#A0A0B8] text-sm hover:border-[#4F8EF7]/50 hover:text-[#4F8EF7] transition-colors"
            >
              <Users size={16} />
              Crear plan con amigos
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
