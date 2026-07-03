'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import { formatearPrecio, cn } from '@/lib/utils'
import {
  Check, Sparkles, Star, Zap, Eye, CreditCard, TrendingDown, FileText, Printer, X,
} from 'lucide-react'
import type { TierLocal } from '@/types'

interface Tier {
  id: TierLocal
  nombre: string
  cuota: number
  comision: number
  color: string
  icono: React.ElementType
  vende: boolean
  features: string[]
  parametros?: string
  destacado?: boolean
}

const TIERS: Tier[] = [
  {
    id: 'visibility',
    nombre: 'Visibility',
    cuota: 0,
    comision: 0,
    color: '#8B8BA8',
    icono: Eye,
    vende: false,
    features: [
      'Aparece en el mapa y en la lista de explorar',
      'Recibe seguidores y reseñas',
      'Página de perfil de la sede editable',
      'Sin cobro de inscripciones',
    ],
  },
  {
    id: 'venta',
    nombre: 'Venta',
    cuota: 0,
    comision: 4.0,
    color: '#4F8EF7',
    icono: CreditCard,
    vende: true,
    features: [
      'Todo lo anterior',
      'Venta de inscripciones con QR',
      'Consumibles (hasta 10 productos)',
      'Hasta 2 torneos al mes',
      '1 trabajador en el panel',
    ],
    parametros: 'Sin cuota mensual · 4% por venta · Para empezar',
  },
  {
    id: 'pro',
    nombre: 'Pro',
    cuota: 49,
    comision: 2.5,
    color: '#B6FF3A',
    icono: Sparkles,
    vende: true,
    destacado: true,
    features: [
      'Todo lo anterior',
      'Torneos ilimitados',
      'Hasta 50 productos en la carta',
      'Hasta 5 trabajadores',
      'Analytics avanzados',
      '1 boost de torneo al mes',
      '5.000 notificaciones push/mes',
    ],
    parametros: 'Compensa si facturas >3.300€/mes',
  },
  {
    id: 'destacado',
    nombre: 'Destacado',
    cuota: 149,
    comision: 1.5,
    color: '#D4A84B',
    icono: Star,
    vende: true,
    features: [
      'Todo lo anterior',
      'Insignia ★ en mapa y lista',
      'Posicionamiento Top en explorar',
      'Consumibles ilimitados',
      'Trabajadores ilimitados',
      '4 boosts de torneo al mes',
      'Notif patrocinadas ilimitadas',
      'Comisión casi a nivel datáfono',
      'Soporte prioritario',
    ],
    parametros: 'Compensa si facturas >10.000€/mes',
  },
]

export default function FacturacionPage() {
  const { local, trabajador } = useLocalPanelStore()
  const toast = useToast()
  const [volumenMensual, setVolumenMensual] = useState(3000)
  const [ingresosUltMes, setIngresosUltMes] = useState<number | null>(null)
  const [solicitando, setSolicitando] = useState<TierLocal | null>(null)
  const [verFactura, setVerFactura] = useState(false)

  const tierActual = local?.tier ?? 'visibility'
  const cuotaActual = TIERS.find(t => t.id === tierActual)?.cuota ?? 0
  const puedeCambiar = trabajador?.rol === 'dueno'

  // Marca el paso "Revisa tu tier" del onboarding como visitado (fire-and-forget).
  useEffect(() => {
    fetch('/api/onboarding', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paso: 'tier' }),
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!local) return
    const hace30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    Promise.all([
      supabase.from('entradas').select('precio_local').eq('local_id', local.id).gte('created_at', hace30d).eq('estado', 'activa'),
      supabase.from('pedidos_bar').select('precio_total, comision_plataforma').eq('local_id', local.id).gte('pagado_at', hace30d).in('estado', ['pagado', 'entregado']),
    ]).then(([e, p]) => {
      const eIngresos = (e.data || []).reduce((s, x) => s + (x.precio_local || 0), 0)
      const pIngresos = (p.data || []).reduce((s, x) => s + ((x.precio_total || 0) - (x.comision_plataforma || 0)), 0)
      const total = Math.round(eIngresos + pIngresos)
      setIngresosUltMes(total)
      if (total > 100) setVolumenMensual(total)
    })
  }, [local])

  const costePorTier = (t: Tier, volumen: number) => {
    if (!t.vende) return Infinity
    return t.cuota + (volumen * t.comision) / 100
  }

  const tierRecomendado = useMemo<TierLocal>(() => {
    if (volumenMensual === 0) return 'visibility'
    let menor: Tier = TIERS[1]
    let menorCoste = costePorTier(menor, volumenMensual)
    for (const t of TIERS) {
      if (!t.vende) continue
      const c = costePorTier(t, volumenMensual)
      if (c < menorCoste) { menor = t; menorCoste = c }
    }
    return menor.id
  }, [volumenMensual])

  const solicitarCambio = async (nuevoTier: TierLocal) => {
    if (!puedeCambiar) { toast.error('Solo el dueño puede cambiar el plan'); return }
    setSolicitando(nuevoTier)
    await new Promise(r => setTimeout(r, 600))
    toast.info(`Solicitud de cambio a ${nuevoTier} registrada. Te contactaremos para activarlo.`)
    setSolicitando(null)
  }

  return (
    <div className="relative p-4 md:p-8 pb-20 md:pb-8 space-y-6 overflow-hidden">
      <div className="hero-halo-rose" />

      <div className="relative">
        <p className="eyebrow mb-2">Tu plan</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Facturación</h1>
        <p className="text-sm text-[#B8B8CC] mt-2">
          Modelo mixto: paga solo lo que vendes, o sube de plan y baja tu comisión.
        </p>
      </div>

      {/* Estado actual + calculadora */}
      <div className="card-premium p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow eyebrow-muted mb-1.5">Plan actual</p>
            <p className="text-2xl font-bold text-white text-display capitalize">{tierActual}</p>
            {ingresosUltMes != null && (
              <p className="text-xs text-[#B8B8CC] mt-1">
                Últimos 30 días vendiste <span className="text-white font-bold text-numeric">{formatearPrecio(ingresosUltMes)}</span>
              </p>
            )}
          </div>
          {tierRecomendado !== tierActual && (
            <div className="px-3 py-2 rounded-xl bg-[#27AE60]/12 border border-[#27AE60]/30 text-[#27AE60] text-xs">
              <p className="font-bold uppercase tracking-wider mb-0.5">Recomendación</p>
              <p className="text-sm font-semibold">
                Con tu volumen, <span className="capitalize">{tierRecomendado}</span> te sale más barato
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-white/8 pt-5">
          <p className="eyebrow eyebrow-muted mb-2">Calculadora de plan ideal</p>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[#B8B8CC]">Cuánto vendes al mes</span>
            <span className="text-2xl font-bold text-white text-display text-numeric">{formatearPrecio(volumenMensual)}</span>
          </div>
          <input
            type="range" min={0} max={20000} step={100}
            value={volumenMensual}
            onChange={e => setVolumenMensual(Number(e.target.value))}
            className="w-full accent-[#B6FF3A] mt-2"
            aria-label="Volumen mensual estimado"
          />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIERS.map(t => {
              const coste = costePorTier(t, volumenMensual)
              const esRecomendado = t.id === tierRecomendado
              return (
                <div
                  key={t.id}
                  className={cn(
                    'rounded-xl p-2.5 border transition-colors',
                    esRecomendado ? 'border-[#27AE60]/50 bg-[#27AE60]/8' : 'border-white/8 bg-white/3'
                  )}
                >
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[#B8B8CC]">{t.nombre}</p>
                  <p className={cn('text-lg font-bold text-display text-numeric mt-0.5', esRecomendado ? 'text-[#27AE60]' : 'text-white')}>
                    {t.vende ? formatearPrecio(coste) : '—'}
                  </p>
                  <p className="text-[10px] text-[#8B8BA8] mt-0.5">
                    {t.vende ? `${t.cuota}€ + ${t.comision}%` : 'No vende'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cards de planes */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map(t => {
          const Icon = t.icono
          const esActual = tierActual === t.id || (tierActual === 'basico' && t.id === 'venta')
          return (
            <div
              key={t.id}
              className={cn(
                'relative card-premium p-5 flex flex-col',
                t.destacado && 'ring-1 ring-[#B6FF3A]/40',
              )}
            >
              {t.destacado && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#B6FF3A] text-[#0A0A0F] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  Más usado
                </div>
              )}
              {esActual && (
                <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-[#27AE60] text-white text-[10px] font-bold uppercase tracking-wider">
                  Tu plan
                </div>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${t.color}22`, border: `1px solid ${t.color}40` }}>
                <Icon size={18} style={{ color: t.color }} />
              </div>
              <h2 className="text-xl font-bold text-display tracking-tight">{t.nombre}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white text-display text-numeric">
                  {t.cuota === 0 ? 'Gratis' : `${t.cuota}€`}
                </span>
                {t.cuota > 0 && <span className="text-xs text-[#B8B8CC]">/mes</span>}
              </div>
              {t.vende ? (
                <p className="text-xs text-[#B8B8CC] mt-1">+ {t.comision}% por venta</p>
              ) : (
                <p className="text-xs text-[#8B8BA8] mt-1">No vende</p>
              )}
              {t.parametros && (
                <p className="text-[11px] text-[#8B8BA8] italic mt-2 leading-snug">{t.parametros}</p>
              )}

              <ul className="mt-4 space-y-2 flex-1">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#B8B8CC]">
                    <Check size={13} className="text-[#27AE60] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                fullWidth
                variant={esActual ? 'glass' : t.destacado ? 'primary' : 'secondary'}
                className="mt-5"
                disabled={esActual || !puedeCambiar}
                loading={solicitando === t.id}
                onClick={() => solicitarCambio(t.id)}
              >
                {esActual ? 'Plan actual' : t.cuota > 0 ? 'Solicitar cambio' : 'Cambiar a este plan'}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Factura del mes */}
      <div className="card-premium p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4F8EF7]/15 border border-[#4F8EF7]/30 flex items-center justify-center">
            <FileText size={18} className="text-[#4F8EF7]" />
          </div>
          <div>
            <p className="font-bold text-white">Factura del mes</p>
            <p className="text-xs text-[#B8B8CC]">Cuota + comisiones de este periodo. Descárgala en PDF.</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setVerFactura(true)}>
          <FileText size={15} /> Ver factura
        </Button>
      </div>

      {verFactura && local && (
        <FacturaModal
          localId={local.id} localNombre={local.nombre}
          localCif={(local as { cif?: string | null }).cif ?? null}
          localDireccion={(local as { direccion?: string | null }).direccion ?? null}
          tier={tierActual} cuota={cuotaActual}
          onClose={() => setVerFactura(false)}
        />
      )}

      {/* Detalles legales/modelo */}
      <div className="card-premium p-5 space-y-3">
        <h2 className="text-base font-bold text-display text-white">Detalles del modelo</h2>
        <ul className="space-y-2 text-xs leading-relaxed">
          <li className="flex gap-2 text-[#B8B8CC]"><TrendingDown size={13} className="text-[#27AE60] mt-0.5 shrink-0" />
            <span>Tope absoluto: la comisión nunca supera <strong className="text-white">3€ por transacción</strong>.</span></li>
          <li className="flex gap-2 text-[#B8B8CC]"><Zap size={13} className="text-[#F39C12] mt-0.5 shrink-0" />
            <span><strong className="text-white">3 meses gratis</strong> al cambiar a Pro por primera vez (cuota + comisión reducida desde el día 1).</span></li>
          <li className="flex gap-2 text-[#B8B8CC]"><Check size={13} className="text-[#27AE60] mt-0.5 shrink-0" />
            <span>Sin comisión en reembolsos: si cancelas un torneo, Tourneum no cobra esa comisión.</span></li>
          <li className="flex gap-2 text-[#B8B8CC]"><CreditCard size={13} className="text-[#4F8EF7] mt-0.5 shrink-0" />
            <span>Pago real con Stripe en breve. De momento las solicitudes se registran y te contactamos.</span></li>
        </ul>
      </div>

      {!puedeCambiar && (
        <div className="card-premium p-3 text-xs text-[#F39C12] flex items-center gap-2 border border-[#F39C12]/30">
          Solo el dueño puede cambiar el plan.
        </div>
      )}
    </div>
  )
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Factura del mes en curso (cuota + comisiones reales), imprimible a PDF. */
function FacturaModal({ localId, localNombre, localCif, localDireccion, tier, cuota, onClose }: {
  localId: string; localNombre: string; localCif: string | null; localDireccion: string | null
  tier: string; cuota: number; onClose: () => void
}) {
  const [comisiones, setComisiones] = useState<number | null>(null)
  const [operaciones, setOperaciones] = useState(0)
  const ahora = new Date()
  const periodo = `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`
  const numFactura = `RMB-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${localId.slice(0, 6).toUpperCase()}`

  useEffect(() => {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
    Promise.all([
      supabase.from('entradas').select('comision_plataforma').eq('local_id', localId).gte('created_at', inicio).neq('estado', 'cancelada'),
      supabase.from('pedidos_bar').select('comision_plataforma').eq('local_id', localId).gte('created_at', inicio).in('estado', ['pagado', 'entregado']),
    ]).then(([e, p]) => {
      const filas = [...(e.data ?? []), ...(p.data ?? [])]
      const total = filas.reduce((s, x) => s + (Number(x.comision_plataforma) || 0), 0)
      setComisiones(Math.round(total * 100) / 100)
      setOperaciones(filas.filter(x => (Number(x.comision_plataforma) || 0) > 0).length)
    }).catch(() => setComisiones(0))
  }, [localId])

  const com = comisiones ?? 0
  const subtotal = cuota + com
  const iva = Math.round(subtotal * 0.21 * 100) / 100
  const total = Math.round((subtotal + iva) * 100) / 100
  const e = (n: number) => `${n.toFixed(2)} €`

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <style>{`@media print {
        body { background: #fff !important; }
        body * { visibility: hidden !important; }
        #factura-doc, #factura-doc * { visibility: visible !important; }
        #factura-doc { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; }
        .no-print { display: none !important; }
      }`}</style>
      <div className="w-full max-w-lg" onClick={ev => ev.stopPropagation()}>
        {/* Documento blanco */}
        <div id="factura-doc" className="bg-white text-gray-900 rounded-xl p-7 sm:p-9">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-2xl font-black tracking-tight" style={{ color: '#B6FF3A' }}>Tourneum</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Tourneum · plataforma de torneos</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p className="font-bold text-gray-900">Factura {numFactura}</p>
              <p>Emitida: {ahora.toLocaleDateString('es-ES')}</p>
              <p className="capitalize">Periodo: {periodo}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div>
              <p className="font-bold text-gray-400 uppercase tracking-wide mb-1">De</p>
              <p className="font-semibold text-gray-900">Tourneum</p>
              <p className="text-gray-500">rumbomap.com</p>
            </div>
            <div>
              <p className="font-bold text-gray-400 uppercase tracking-wide mb-1">Para</p>
              <p className="font-semibold text-gray-900">{localNombre}</p>
              {localCif && <p className="text-gray-500">CIF/NIF: {localCif}</p>}
              {localDireccion && <p className="text-gray-500">{localDireccion}</p>}
            </div>
          </div>

          <table className="w-full text-sm mb-5">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 text-[11px] uppercase tracking-wide">
                <th className="text-left font-semibold py-2">Concepto</th>
                <th className="text-right font-semibold py-2">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-700">Cuota mensual · plan <span className="capitalize">{tier}</span></td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{e(cuota)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2.5 text-gray-700">Comisiones por ventas online {comisiones == null ? '…' : `(${operaciones} operaciones)`}</td>
                <td className="py-2.5 text-right text-gray-900 font-medium">{e(com)}</td>
              </tr>
            </tbody>
          </table>

          <div className="ml-auto w-56 text-sm space-y-1.5">
            <div className="flex justify-between text-gray-600"><span>Base imponible</span><span>{e(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA (21%)</span><span>{e(iva)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-1.5 mt-1.5"><span>Total</span><span>{e(total)}</span></div>
          </div>

          <p className="text-[10px] text-gray-400 mt-7 leading-relaxed border-t border-gray-100 pt-3">
            Documento informativo generado por Tourneum. La venta en taquilla (efectivo) no genera comisión. El cobro real se
            gestionará vía Stripe próximamente. Las comisiones reflejadas corresponden a operaciones del periodo indicado.
          </p>
        </div>

        {/* Acciones (no se imprimen) */}
        <div className="no-print flex gap-2 mt-3">
          <button onClick={() => window.print()} className="flex-1 btn-primary inline-flex items-center justify-center gap-2">
            <Printer size={16} /> Imprimir / Guardar PDF
          </button>
          <button onClick={onClose} className="px-4 rounded-xl border border-white/15 text-white inline-flex items-center gap-1.5 hover:bg-white/5">
            <X size={16} /> Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
