'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Entrada, Local, Evento, ConsumicionBienvenida } from '@/types'
import { formatearPrecio, formatearFecha, formatearHora } from '@/lib/utils'
import { ArrowLeft, MapPin, Calendar, Ticket, Coffee, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
// qrcode is loaded dynamically to avoid SSR issues
import { cn } from '@/lib/utils'

type EntradaConInfo = Entrada & { local?: Local; evento?: Evento; consumicion?: ConsumicionBienvenida }

export default function EntradaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { usuario, isLoading } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [entrada, setEntrada] = useState<EntradaConInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [brightness, setBrightness] = useState(false)

  useEffect(() => {
    if (isLoading) return            // esperar a que AuthProvider resuelva la sesión
    if (!usuario) { router.push('/login'); return }
    cargar()
  }, [usuario, isLoading])

  async function cargar() {
    const { data } = await supabase
      .from('entradas')
      .select(`
        *,
        locales!inner(id, nombre, imagenes, ciudad, direccion, tipo_local),
        eventos(id, nombre, fecha_inicio, fecha_fin, dress_code)
      `)
      .eq('id', id)
      .eq('usuario_id', usuario!.id)
      .single()

    if (!data) { router.push('/entradas'); return }

    const entrada: EntradaConInfo = {
      ...data,
      local: data.locales,
      evento: data.eventos,
    }

    // Fetch welcome drink if applicable
    if (data.consumicion_id && entrada.local) {
      const consumicion = entrada.local && 'consumiciones_bienvenida' in entrada.local
        ? (entrada.local as Local & { consumiciones_bienvenida: ConsumicionBienvenida[] })
            .consumiciones_bienvenida?.find((c: ConsumicionBienvenida) => c.id === data.consumicion_id)
        : null
      if (consumicion) entrada.consumicion = consumicion
    }

    setEntrada(entrada)
    setLoading(false)
  }

  useEffect(() => {
    if (!entrada || !canvasRef.current) return
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, entrada!.qr_code, {
        width: 260,
        margin: 2,
        color: { dark: '#11141C', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      })
    })
  }, [entrada])

  // Boost screen brightness on long press
  const handleQRPress = () => {
    setBrightness(true)
    setTimeout(() => setBrightness(false), 5000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#B6FF3A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!entrada) return null

  const estadoInfo = {
    activa: { label: 'Entrada válida', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30', icon: CheckCircle2 },
    usada: { label: 'Ya usada', color: 'text-[#6B6B85]', bg: 'bg-white/6 border-white/10', icon: Clock },
    cancelada: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30', icon: AlertCircle },
    expirada: { label: 'Expirada', color: 'text-[#6B6B85]', bg: 'bg-white/6 border-white/10', icon: Clock },
  }[entrada.estado]

  const StatusIcon = estadoInfo.icon

  return (
    <div className={cn('min-h-screen transition-all', brightness ? 'brightness-125' : '')}
      style={{ background: '#11141C' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 safe-top">
        <button aria-label="Volver" onClick={() => router.back()} className="p-2 -ml-2 text-[#A0A0B8]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white">Mi entrada</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Ticket card */}
        <div className="glass rounded-3xl overflow-hidden">
          {/* Local header */}
          <div className="relative h-28">
            <img
              src={entrada.local?.imagenes?.[0] || ''}
              alt={entrada.local?.nombre}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E2333] to-transparent" />
            <div className="absolute bottom-3 left-4">
              <h2 className="text-lg font-bold text-white">{entrada.local?.nombre}</h2>
            </div>
          </div>

          {/* Torn edge */}
          <div className="flex items-center px-4 py-2">
            <div className="w-4 h-4 rounded-full bg-white/5 -ml-8 shrink-0" />
            <div className="flex-1 border-b-2 border-dashed border-white/10" />
            <div className="w-4 h-4 rounded-full bg-white/5 -mr-8 shrink-0" />
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center py-6 px-4">
            <div
              className={cn(
                'p-3 rounded-2xl cursor-pointer transition-all',
                entrada.estado === 'activa' ? 'bg-white' : 'bg-white/50'
              )}
              onClick={handleQRPress}
              title="Mantén pulsado para aumentar el brillo"
            >
              <canvas ref={canvasRef} className={cn(entrada.estado !== 'activa' && 'opacity-40')} />
            </div>

            <div className={cn('mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold', estadoInfo.bg, estadoInfo.color)}>
              <StatusIcon size={14} />
              {estadoInfo.label}
            </div>

            {entrada.estado === 'activa' && (
              <p className="mt-2 text-xs text-[#6B6B85]">Toca el QR para aumentar el brillo</p>
            )}
          </div>

          {/* Torn edge bottom */}
          <div className="flex items-center px-4 py-2">
            <div className="w-4 h-4 rounded-full bg-white/5 -ml-8 shrink-0" />
            <div className="flex-1 border-b-2 border-dashed border-white/10" />
            <div className="w-4 h-4 rounded-full bg-white/5 -mr-8 shrink-0" />
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            {entrada.evento && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-[#A0A0B8] shrink-0" />
                <span className="text-white font-medium">{entrada.evento.nombre}</span>
              </div>
            )}
            {entrada.evento?.fecha_inicio && (
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-[#A0A0B8] shrink-0" />
                <span className="text-[#A0A0B8]">
                  {formatearFecha(entrada.evento.fecha_inicio)} · {formatearHora(entrada.evento.fecha_inicio)}
                </span>
              </div>
            )}
            {entrada.local?.direccion && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-[#A0A0B8] shrink-0" />
                <span className="text-[#A0A0B8]">{entrada.local.direccion}</span>
              </div>
            )}
            {entrada.evento?.dress_code && (
              <div className="flex items-center gap-2 text-sm">
                <Ticket size={14} className="text-[#A0A0B8] shrink-0" />
                <span className="text-[#A0A0B8]">Dress code: {entrada.evento.dress_code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Consumición */}
        {entrada.consumicion_id && (
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-2xl border',
            entrada.consumicion_canjeada
              ? 'border-white/10 bg-white/6 opacity-60'
              : 'border-green-500/30 bg-green-500/10'
          )}>
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Coffee size={18} className="text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">
                {entrada.consumicion ? entrada.consumicion.nombre : 'Consumición de bienvenida'}
              </p>
              <p className="text-xs text-[#A0A0B8]">
                {entrada.consumicion_canjeada ? 'Ya canjeada' : 'Muestra tu QR al llegar para canjear'}
              </p>
            </div>
            {entrada.consumicion_canjeada
              ? <CheckCircle2 size={18} className="text-[#6B6B85]" />
              : <CheckCircle2 size={18} className="text-green-400" />
            }
          </div>
        )}

        {/* Cartita digital: consumiciones incluidas con la entrada (contador en servidor) */}
        {(entrada.consumiciones_incluidas ?? 0) > 0 && (() => {
          const inc = entrada.consumiciones_incluidas ?? 0
          const canj = entrada.consumiciones_canjeadas ?? 0
          const quedan = Math.max(0, inc - canj)
          return (
            <div className={cn(
              'p-4 rounded-2xl border',
              quedan > 0 ? 'border-green-500/30 bg-green-500/10' : 'border-white/10 bg-white/6 opacity-60'
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                  <Coffee size={18} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">
                    {quedan > 0 ? `${quedan} de ${inc} ${inc === 1 ? 'consumición' : 'consumiciones'}` : 'Consumiciones canjeadas'}
                  </p>
                  <p className="text-xs text-[#A0A0B8] truncate">
                    {entrada.consumiciones_descripcion || (quedan > 0 ? 'Muestra tu QR en la barra para canjear' : 'No te queda ninguna')}
                  </p>
                </div>
              </div>
              {/* Puntos: se apagan al canjear (●●○) */}
              <div className="flex items-center gap-1.5 mt-3">
                {Array.from({ length: inc }).map((_, i) => (
                  <span key={i} className={cn('h-2.5 flex-1 rounded-full', i < quedan ? 'bg-green-400' : 'bg-white/15')} />
                ))}
              </div>
            </div>
          )
        })()}

        {/* Desglose precio */}
        <div className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-[#6B6B85] uppercase tracking-wider">Detalle del pago</h3>
          <div className="flex justify-between text-sm">
            <span className="text-[#A0A0B8]">Entrada</span>
            <span className="text-white">{formatearPrecio(entrada.precio_local)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#A0A0B8]">Servicio Tourneum</span>
            <span className="text-white">{formatearPrecio(entrada.comision_plataforma)}</span>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between font-bold">
            <span className="text-white">Total pagado</span>
            <span className="text-[#B6FF3A]">{formatearPrecio(entrada.precio_total)}</span>
          </div>
        </div>

        {/* ID de entrada */}
        <p className="text-center text-[10px] text-[#6B6B85]">ID: {entrada.id}</p>
      </div>
    </div>
  )
}
