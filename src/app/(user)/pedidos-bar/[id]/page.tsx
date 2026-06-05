'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { formatearPrecio, tiempoRelativo } from '@/lib/utils'
import { ChevronLeft, Check, Clock, AlertCircle } from 'lucide-react'

interface PedidoCompleto {
  id: string; qr_code: string; estado: string; precio_total: number;
  notas?: string; pagado_at: string; expira_at: string; entregado_at?: string;
  locales: { id: string; nombre: string; imagenes: string[] } | null
  pedido_items: { id: string; nombre_snapshot: string; cantidad: number; precio_unitario: number }[]
}

export default function PedidoBarPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { usuario } = useAuthStore()
  const [pedido, setPedido] = useState<PedidoCompleto | null>(null)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tiempoRestante, setTiempoRestante] = useState('')

  useEffect(() => {
    if (!id) return
    if (!usuario) { router.push('/login'); return }
    ;(async () => {
      // Lectura por endpoint con service_role: leer pedidos_bar desde el cliente
      // evalúa una policy que toca auth.users (42501) hasta aplicar la 036.
      const res = await fetch(`/api/pedidos-bar/${id}`)
      if (res.ok) { const j = await res.json(); if (j.pedido) setPedido(j.pedido as PedidoCompleto) }
      setLoading(false)
    })()
  }, [id, usuario, router])

  // Generar QR (PNG dataURL) en cliente con qrcode
  useEffect(() => {
    if (!pedido?.qr_code) return
    ;(async () => {
      const QRCode = (await import('qrcode')).default
      const url = await QRCode.toDataURL(pedido.qr_code, {
        width: 480,
        margin: 1,
        color: { dark: '#0B0B16', light: '#FAFAFC' },
        errorCorrectionLevel: 'M',
      })
      setQrSrc(url)
    })()
  }, [pedido?.qr_code])

  // Realtime: cuando entreguen el pedido, actualizar UI sin recargar
  useEffect(() => {
    if (!pedido?.id) return
    const ch = supabase.channel(`pedido-${pedido.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos_bar', filter: `id=eq.${pedido.id}`,
      }, payload => {
        setPedido(prev => prev ? { ...prev, ...(payload.new as Partial<PedidoCompleto>) } : prev)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [pedido?.id])

  // Contador de expiración
  useEffect(() => {
    if (!pedido || pedido.estado !== 'pagado') return
    const tick = () => {
      const ms = new Date(pedido.expira_at).getTime() - Date.now()
      if (ms <= 0) { setTiempoRestante('Expirado'); return }
      const h = Math.floor(ms / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      setTiempoRestante(h > 0 ? `Caduca en ${h}h ${m}m` : `Caduca en ${m}m`)
    }
    tick()
    const iv = setInterval(tick, 30_000)
    return () => clearInterval(iv)
  }, [pedido])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!pedido) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <p className="text-[#B8B8CC]">Pedido no encontrado</p>
      <Button onClick={() => router.push('/entradas')}>Volver a mis compras</Button>
    </div>
  )

  const entregado = pedido.estado === 'entregado'
  const expirado = pedido.estado === 'expirado'
  const cancelado = pedido.estado === 'cancelado'

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 safe-top">
        <button aria-label="Volver" onClick={() => router.push('/entradas')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="eyebrow">Pedido bar</p>
          <h1 className="text-base font-bold text-display">{pedido.locales?.nombre}</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-5">
        {/* Estado */}
        {entregado && (
          <div className="card-premium p-5 flex items-center gap-4 border border-[#27AE60]/30">
            <div className="w-14 h-14 rounded-2xl bg-[#27AE60]/15 border border-[#27AE60]/40 flex items-center justify-center shrink-0">
              <Check size={26} className="text-[#27AE60]" />
            </div>
            <div>
              <p className="text-lg font-bold text-display">Entregado</p>
              <p className="text-sm text-[#B8B8CC]">
                Recogido {pedido.entregado_at ? tiempoRelativo(pedido.entregado_at) : 'hace un momento'}.
              </p>
            </div>
          </div>
        )}
        {(expirado || cancelado) && (
          <div className="card-premium p-5 flex items-center gap-4 border border-[#F39C12]/30">
            <div className="w-14 h-14 rounded-2xl bg-[#F39C12]/15 border border-[#F39C12]/40 flex items-center justify-center shrink-0">
              <AlertCircle size={26} className="text-[#F39C12]" />
            </div>
            <div>
              <p className="text-lg font-bold text-display">{expirado ? 'Caducado' : 'Cancelado'}</p>
              <p className="text-sm text-[#B8B8CC]">
                {expirado
                  ? 'No se canjeó a tiempo. Te lo reembolsamos automáticamente.'
                  : 'Pedido cancelado. Te lo reembolsamos.'}
              </p>
            </div>
          </div>
        )}

        {/* QR */}
        {!entregado && !expirado && !cancelado && (
          <div className="card-premium p-6 flex flex-col items-center text-center">
            <p className="eyebrow mb-3">Enseña este QR en la barra</p>
            {qrSrc ? (
              <div className="bg-white p-4 rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
                <img src={qrSrc} alt="QR del pedido" className="w-56 h-56" />
              </div>
            ) : (
              <div className="w-56 h-56 skeleton rounded-2xl" />
            )}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F39C12]/15 border border-[#F39C12]/30 text-[#F39C12] text-xs font-bold">
              <Clock size={12} /> {tiempoRestante}
            </div>
            <p className="text-xs text-[#B8B8CC] mt-3 max-w-xs">
              Si tarda más de 6 horas en canjearse, el pedido se reembolsa.
            </p>
          </div>
        )}

        {/* Items */}
        <div className="card-premium p-4 space-y-2">
          <p className="eyebrow mb-2">Tu pedido</p>
          {pedido.pedido_items.map(it => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-[#B8B8CC] text-numeric w-7 text-right">{it.cantidad}×</span>
                <span className="text-white truncate">{it.nombre_snapshot}</span>
              </div>
              <span className="text-white font-semibold text-numeric shrink-0">{formatearPrecio(it.precio_unitario * it.cantidad)}</span>
            </div>
          ))}
          {pedido.notas && (
            <div className="mt-3 pt-3 border-t border-white/8">
              <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">Notas</p>
              <p className="text-sm text-[#B8B8CC] mt-1 italic">&ldquo;{pedido.notas}&rdquo;</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-white/8 flex justify-between font-bold text-white">
            <span>Total</span>
            <span className="text-numeric">{formatearPrecio(pedido.precio_total)}</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#8B8BA8] uppercase tracking-[0.18em]">
          Rumbo · Pedido {pedido.qr_code.slice(0, 14)}…
        </p>
      </div>
    </div>
  )
}
