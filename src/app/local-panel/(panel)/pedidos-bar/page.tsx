'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { formatearPrecio, tiempoRelativo, cn } from '@/lib/utils'
import { Check, Clock, User, QrCode, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface PedidoActivo {
  id: string; qr_code: string; estado: string; precio_total: number; notas?: string
  pagado_at: string; expira_at: string; entregado_at?: string
  usuarios: { nombre: string; foto_perfil_url?: string }
  pedido_items: { id: string; nombre_snapshot: string; cantidad: number; precio_unitario: number }[]
}

/** Chip de tiempo en cola: se pone ámbar a los 5 min y rojo a los 10 — urgencia para la barra. */
function EsperaChip({ pagadoAt }: { pagadoAt: string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])
  const mins = Math.max(0, Math.floor((Date.now() - new Date(pagadoAt).getTime()) / 60000))
  const color = mins >= 10 ? '#E94560' : mins >= 5 ? '#F39C12' : '#8B8BA8'
  return (
    <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-numeric" style={{ color }}>
      <Clock size={10} /> {mins < 1 ? 'ahora' : `${mins} min`}
    </span>
  )
}

type Filtro = 'pagado' | 'entregado'

export default function PedidosBarPanelPage() {
  const { local, trabajador } = useLocalPanelStore()
  const toast = useToast()
  const [pedidos, setPedidos] = useState<PedidoActivo[]>([])
  const [filtro, setFiltro] = useState<Filtro>('pagado')
  const [loading, setLoading] = useState(true)
  const [canjeando, setCanjeando] = useState<string | null>(null)

  const cargar = async () => {
    setLoading(true)
    const res = await fetch(`/api/local-panel/pedidos-bar?estado=${filtro}`)
    if (res.ok) {
      const j = await res.json()
      setPedidos(j.pedidos ?? [])
    }
    setLoading(false)
  }
  useEffect(() => { cargar() /* eslint-disable-next-line */ }, [filtro])

  // Realtime: nuevos pedidos pagados aparecen al instante
  useEffect(() => {
    if (!local?.id) return
    const ch = supabase.channel(`bar-${local.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pedidos_bar', filter: `local_id=eq.${local.id}`,
      }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line
  }, [local?.id, filtro])

  const canjear = async (p: PedidoActivo) => {
    setCanjeando(p.id)
    const res = await fetch('/api/pedidos-bar/canjear', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_code: p.qr_code }),
    })
    const j = await res.json()
    setCanjeando(null)
    if (!res.ok) { toast.error(j.error || 'No se pudo canjear'); return }
    toast.success(`Pedido de ${p.usuarios.nombre} entregado`)
    setPedidos(prev => prev.filter(x => x.id !== p.id))
  }

  const puedeCanjear = trabajador && ['dueno', 'gestor', 'barman'].includes(trabajador.rol)

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Bar · cola en vivo</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Pedidos</h1>
          <p className="text-sm text-[#B8B8CC] mt-2">
            {filtro === 'pagado'
              ? `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'} por servir`
              : `Últimos ${pedidos.length} entregados`}
          </p>
        </div>
        <button
          onClick={cargar}
          aria-label="Refrescar"
          className="w-10 h-10 rounded-xl glass-strong flex items-center justify-center text-white"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-subtle rounded-2xl p-1">
        {([
          { id: 'pagado',     label: 'En cola' },
          { id: 'entregado',  label: 'Entregados' },
        ] as { id: Filtro; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setFiltro(t.id)}
            className={cn(
              'flex-1 py-2.5 text-sm font-semibold transition-all rounded-xl',
              filtro === t.id
                ? 'bg-[#E94560] text-white shadow-[0_6px_20px_-4px_rgba(233,69,96,0.6)]'
                : 'text-[#B8B8CC] hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!puedeCanjear && filtro === 'pagado' && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F39C12]/10 border border-[#F39C12]/30 text-xs text-[#F39C12]">
          <Clock size={14} /> Tu rol no permite marcar pedidos como entregados.
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="card-premium p-12 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
            <QrCode size={28} className="text-[#B8B8CC]" />
          </div>
          <p className="text-lg font-bold text-display">
            {filtro === 'pagado' ? 'Sin pedidos en cola' : 'Sin entregas todavía'}
          </p>
          <p className="text-sm text-[#B8B8CC] max-w-xs">
            {filtro === 'pagado'
              ? 'Cuando un usuario pida en la app aparecerá aquí al instante.'
              : 'Los pedidos entregados se mostrarán aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pedidos.map(p => (
            <div key={p.id} className="card-premium p-4">
              {/* Header del pedido */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center overflow-hidden shrink-0">
                  {p.usuarios.foto_perfil_url ? (
                    <img src={p.usuarios.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-[#B8B8CC]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate text-display">{p.usuarios.nombre}</p>
                  <p className="text-[11px] text-[#8B8BA8]">
                    {filtro === 'pagado' ? `Pagado ${tiempoRelativo(p.pagado_at)}` : `Entregado ${p.entregado_at ? tiempoRelativo(p.entregado_at) : ''}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-white text-numeric">{formatearPrecio(p.precio_total)}</p>
                  {filtro === 'pagado' && <EsperaChip pagadoAt={p.pagado_at} />}
                </div>
              </div>

              {/* Items */}
              <div className="mt-3 space-y-1 pl-13">
                {p.pedido_items.map(it => (
                  <div key={it.id} className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-[#E94560] text-numeric w-7 text-right">{it.cantidad}×</span>
                    <span className="text-white truncate flex-1">{it.nombre_snapshot}</span>
                  </div>
                ))}
              </div>

              {p.notas && (
                <div className="mt-3 px-3 py-2 rounded-xl bg-[#F39C12]/10 border border-[#F39C12]/25">
                  <p className="text-[10px] uppercase tracking-wider text-[#F39C12] font-bold">Notas</p>
                  <p className="text-sm text-white italic mt-0.5">&ldquo;{p.notas}&rdquo;</p>
                </div>
              )}

              {filtro === 'pagado' && puedeCanjear && (
                <Button
                  fullWidth
                  className="mt-3"
                  loading={canjeando === p.id}
                  onClick={() => canjear(p)}
                >
                  <Check size={16} /> Marcar entregado
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
