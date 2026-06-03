'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ProductoLocal, CategoriaProducto, Local } from '@/types'
import { formatearPrecio, calcularComision, COMISION_PORCENTAJE, cn } from '@/lib/utils'
import { ChevronLeft, Plus, Minus, ShoppingBag, Clock, Wallet } from 'lucide-react'

const CATEGORIA_LABEL: Record<CategoriaProducto, string> = {
  cerveza: 'Cervezas', cubata: 'Cubatas', copa: 'Copas', cocktail: 'Cócteles',
  chupito: 'Chupitos', refresco: 'Refrescos', agua: 'Agua', comida: 'Comida',
  snack: 'Snacks', pack: 'Packs', otro: 'Otros',
}

const ORDEN_CATEGORIAS: CategoriaProducto[] = [
  'pack', 'cocktail', 'cubata', 'copa', 'cerveza', 'chupito',
  'refresco', 'agua', 'comida', 'snack', 'otro',
]

export default function CartaBarPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { usuario } = useAuthStore()
  const [local, setLocal] = useState<Local | null>(null)
  const [productos, setProductos] = useState<ProductoLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [carrito, setCarrito] = useState<Record<string, number>>({})
  const [showCheckout, setShowCheckout] = useState(false)
  const [notas, setNotas] = useState('')
  const [codigo, setCodigo] = useState('')
  const [comprando, setComprando] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [{ data: l }, res] = await Promise.all([
        supabase.from('locales').select('id, nombre, imagenes, tier, ciudad').eq('id', id).maybeSingle(),
        fetch(`/api/locales/${id}/productos`),
      ])
      if (l) setLocal(l as Local)
      if (res.ok) {
        const j = await res.json()
        setProductos(j.productos ?? [])
      }
      setLoading(false)
    })()
  }, [id])

  const setCantidad = (productoId: string, delta: number) => {
    setCarrito(prev => {
      const actual = prev[productoId] ?? 0
      const nuevo = Math.max(0, Math.min(10, actual + delta))
      const next = { ...prev }
      if (nuevo === 0) delete next[productoId]
      else next[productoId] = nuevo
      return next
    })
  }

  const totalItems = Object.values(carrito).reduce((s, n) => s + n, 0)
  const subtotal = Object.entries(carrito).reduce((s, [pid, qty]) => {
    const p = productos.find(x => x.id === pid)
    return s + (p ? p.precio * qty : 0)
  }, 0)
  const comision = calcularComision(subtotal)
  const total = subtotal + comision

  const porCategoria = useMemo(() => {
    const m = new Map<CategoriaProducto, ProductoLocal[]>()
    for (const p of productos) {
      const cat = (p.categoria || 'otro') as CategoriaProducto
      if (!m.has(cat)) m.set(cat, [])
      m.get(cat)!.push(p)
    }
    return ORDEN_CATEGORIAS.filter(c => m.has(c)).map(c => ({ cat: c, items: m.get(c)! }))
  }, [productos])

  const confirmar = async () => {
    if (!usuario) { router.push('/login'); return }
    if (totalItems === 0) return
    setComprando(true)
    const items = Object.entries(carrito).map(([producto_id, cantidad]) => ({ producto_id, cantidad }))
    const res = await fetch('/api/pedidos-bar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: id, items, notas: notas.trim() || undefined, codigo: codigo.trim() || undefined }),
    })
    const j = await res.json()
    setComprando(false)
    if (!res.ok) { toast.error(j.error || 'No se pudo crear el pedido'); return }
    router.push(`/pedidos-bar/${j.pedido.id}`)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!local) return <div className="min-h-screen flex items-center justify-center text-[#B8B8CC]">Local no encontrado</div>

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-white/8 px-4 py-3 safe-top flex items-center gap-3">
        <button aria-label="Volver" onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="eyebrow">Carta</p>
          <h1 className="text-lg font-bold text-display truncate">{local.nombre}</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Info expira */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-[#B8B8CC] mb-4">
          <Clock size={13} className="text-[#F39C12]" />
          <span>Tu QR vale 6 horas desde el pago. Si no lo canjeas, se reembolsa.</span>
        </div>

        {/* Lista de productos por categoría */}
        {productos.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[#B8B8CC]">Este local todavía no tiene carta digital.</p>
          </div>
        ) : (
          <div className="space-y-7">
            {porCategoria.map(({ cat, items }) => (
              <section key={cat}>
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8B8CC] mb-2.5">
                  {CATEGORIA_LABEL[cat]}
                </h2>
                <div className="space-y-2">
                  {items.map(p => {
                    const qty = carrito[p.id] ?? 0
                    return (
                      <div key={p.id} className={cn(
                        'card-premium p-3 flex items-center gap-3 transition-all',
                        qty > 0 && 'ring-1 ring-[#E94560]/50'
                      )}>
                        {p.imagen_url && (
                          <img src={p.imagen_url} alt={p.nombre} className="w-14 h-14 rounded-xl object-cover bg-white/5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate text-display">{p.nombre}</p>
                              {p.descripcion && (
                                <p className="text-xs text-[#B8B8CC] truncate mt-0.5">{p.descripcion}</p>
                              )}
                              {p.es_pack && p.unidades_pack && (
                                <Badge variant="gold" size="sm" className="mt-1">{p.unidades_pack} unidades</Badge>
                              )}
                            </div>
                            <p className="text-base font-bold text-white text-numeric shrink-0">{formatearPrecio(p.precio)}</p>
                          </div>
                          <div className="mt-2 flex items-center justify-end">
                            {qty === 0 ? (
                              <button
                                onClick={() => setCantidad(p.id, 1)}
                                aria-label={`Añadir ${p.nombre}`}
                                className="h-8 px-3 rounded-full bg-[#E94560] text-white text-xs font-bold flex items-center gap-1 shadow-[0_4px_14px_-4px_rgba(233,69,96,0.55)]"
                              >
                                <Plus size={13} /> Añadir
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setCantidad(p.id, -1)}
                                  aria-label="Quitar uno"
                                  className="w-8 h-8 rounded-full bg-white/8 border border-white/12 text-white flex items-center justify-center"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="text-base font-bold text-numeric w-6 text-center">{qty}</span>
                                <button
                                  onClick={() => setCantidad(p.id, 1)}
                                  aria-label="Añadir uno"
                                  disabled={qty >= 10}
                                  className="w-8 h-8 rounded-full bg-[#E94560] text-white flex items-center justify-center disabled:opacity-50"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Barra inferior de carrito */}
      {totalItems > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-20 px-4 safe-bottom">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full flex items-center justify-between gap-3 px-5 h-14 rounded-2xl bg-[#E94560] text-white shadow-[0_12px_30px_-8px_rgba(233,69,96,0.65)] active:scale-[0.98] transition-transform"
          >
            <span className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-numeric">{totalItems}</span>
              <span className="font-bold">Revisar pedido</span>
            </span>
            <span className="font-bold text-lg text-numeric">{formatearPrecio(total)}</span>
          </button>
        </div>
      )}

      {/* Sheet checkout */}
      <BottomSheet open={showCheckout} onClose={() => setShowCheckout(false)}>
        <div className="px-5 py-5 space-y-5">
          <h2 className="text-2xl font-bold text-display tracking-tight">Tu pedido</h2>

          <div className="space-y-2">
            {Object.entries(carrito).map(([pid, qty]) => {
              const p = productos.find(x => x.id === pid)
              if (!p) return null
              return (
                <div key={pid} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-[#B8B8CC] text-numeric w-6 text-right">{qty}×</span>
                    <span className="text-white truncate">{p.nombre}</span>
                  </div>
                  <span className="text-white font-semibold text-numeric shrink-0">{formatearPrecio(p.precio * qty)}</span>
                </div>
              )
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#B8B8CC]">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value.slice(0, 200))}
              placeholder="Sin hielo, con extra de…"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#8B8BA8] focus:border-[#E94560]/60 outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#B8B8CC]">Código de RRPP (opcional)</label>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
              placeholder="Ej. LEO123"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#8B8BA8] focus:border-[#E94560]/60 outline-none tracking-[0.1em]"
            />
            <p className="text-[10px] text-[#8B8BA8]">Si tienes el código de un promotor, el descuento se aplica al confirmar.</p>
          </div>

          <div className="border-t border-white/8 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-[#B8B8CC]">
              <span>Subtotal</span>
              <span className="text-numeric">{formatearPrecio(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#B8B8CC]">
              <span>Comisión Rumbo ({COMISION_PORCENTAJE}%)</span>
              <span className="text-numeric">{formatearPrecio(comision)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/8 mt-2">
              <span>Total</span>
              <span className="text-numeric">{formatearPrecio(total)}</span>
            </div>
          </div>

          <Button fullWidth size="lg" loading={comprando} onClick={confirmar}>
            <Wallet size={17} /> Pagar y generar QR
          </Button>
          <p className="text-[10px] text-center text-[#8B8BA8] uppercase tracking-wider">
            Stripe próximamente · de momento el pago se simula
          </p>
        </div>
      </BottomSheet>
    </div>
  )
}
