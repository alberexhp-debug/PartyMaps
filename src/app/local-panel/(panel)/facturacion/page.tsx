'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearPrecio, formatearFecha } from '@/lib/utils'
import { CreditCard, TrendingUp, Star, Zap, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIERS = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 'Gratis',
    comision: '7%',
    features: ['Perfil en el mapa', 'Venta de entradas', 'Hasta 2 eventos/mes', '1 usuario del panel'],
    color: '#505065',
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: '69€/mes',
    comision: '6%',
    features: ['Todo lo de Básico', 'Eventos ilimitados', 'Analytics avanzado', '5 usuarios del panel', 'Notificaciones push', 'Módulos de experiencia'],
    color: '#4F8EF7',
    destacado: false,
  },
  {
    id: 'destacado',
    nombre: 'Destacado',
    precio: '169€/mes',
    comision: '5%',
    features: ['Todo lo de Pro', 'Posición prioritaria en mapa', 'Badge ★ Destacado', '10 usuarios del panel', 'Soporte prioritario', 'Estadísticas de suscriptores avanzadas'],
    color: '#F39C12',
    destacado: true,
  },
]

export default function FacturacionPage() {
  const toast = useToast()
  const { local, trabajador } = useLocalPanelStore()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ ingresos_mes: 0, comisiones_mes: 0 })

  const esDueno = trabajador?.rol === 'dueno'

  useEffect(() => {
    if (!local) return
    const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    supabase.from('entradas').select('precio_total, comision_plataforma')
      .eq('local_id', local.id).gte('created_at', inicio).eq('estado', 'activa')
      .then(({ data }) => {
        if (data) {
          setStats({
            ingresos_mes: data.reduce((s, e) => s + (e.precio_total - e.comision_plataforma), 0),
            comisiones_mes: data.reduce((s, e) => s + e.comision_plataforma, 0),
          })
        }
      })
  }, [local])

  const solicitarCambio = (tier: string) => {
    toast.info(`Solicitud de cambio a ${tier} enviada. El equipo de Fourvenues se pondrá en contacto.`)
  }

  if (!local) return null

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <h1 className="text-2xl font-black text-white">Facturación</h1>

      {!esDueno && (
        <div className="flex items-center gap-2 p-3 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-xl text-sm text-[#F39C12]">
          <AlertCircle size={14} />
          Solo el dueño del local puede gestionar la facturación
        </div>
      )}

      {/* Resumen del mes */}
      <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-3">
        <h2 className="font-bold text-white">Este mes</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0D0D1A] rounded-xl p-3">
            <p className="text-xs text-[#505065]">Ingresos netos</p>
            <p className="text-xl font-black text-white mt-1">{formatearPrecio(stats.ingresos_mes)}</p>
          </div>
          <div className="bg-[#0D0D1A] rounded-xl p-3">
            <p className="text-xs text-[#505065]">Comisión plataforma</p>
            <p className="text-xl font-black text-[#E94560] mt-1">{formatearPrecio(stats.comisiones_mes)}</p>
          </div>
        </div>
        <p className="text-xs text-[#505065]">
          Tier actual: <span className="capitalize text-white font-semibold">{local.tier}</span>
          {' '}· Comisión: <span className="text-[#E94560] font-semibold">
            {local.tier === 'basico' ? '7%' : local.tier === 'pro' ? '6%' : '5%'}
          </span>
        </p>
        <p className="text-xs text-[#505065]">
          Los pagos se realizan mediante Stripe Connect. Conecta tu cuenta para recibir transferencias.
        </p>
      </div>

      {/* Tiers */}
      <div className="space-y-3">
        <h2 className="font-bold text-white">Planes disponibles</h2>
        {TIERS.map(tier => {
          const esActual = local.tier === tier.id
          return (
            <div key={tier.id} className={cn(
              'rounded-2xl border p-4 space-y-3 relative',
              esActual ? 'border-2' : 'border',
              esActual ? `border-[${tier.color}]` : 'border-[#2A2A3E]',
              'bg-[#1A1A2E]'
            )} style={{ borderColor: esActual ? tier.color : undefined }}>
              {tier.destacado && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#F39C12] rounded-full text-xs font-bold text-black">
                  ★ Más popular
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{tier.nombre}</h3>
                  <p className="text-sm font-bold" style={{ color: tier.color }}>{tier.precio}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#505065]">Comisión</p>
                  <p className="text-lg font-black text-white">{tier.comision}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[#A0A0B8]">
                    <Check size={12} style={{ color: tier.color }} />
                    {f}
                  </li>
                ))}
              </ul>
              {esActual ? (
                <div className="flex items-center justify-center h-10 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: tier.color, color: tier.color }}>
                  Plan actual
                </div>
              ) : (
                <Button
                  fullWidth
                  variant={tier.id === 'destacado' ? 'primary' : 'secondary'}
                  disabled={!esDueno}
                  onClick={() => solicitarCambio(tier.nombre)}
                >
                  {tier.id === 'basico' ? 'Degradar a Básico' : `Actualizar a ${tier.nombre}`}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Stripe */}
      <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-3">
        <h2 className="font-bold text-white flex items-center gap-2">
          <CreditCard size={16} className="text-[#4F8EF7]" />
          Cuenta Stripe
        </h2>
        {local.stripe_account_id ? (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Check size={14} />
            Cuenta conectada: {local.stripe_account_id}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-[#A0A0B8]">Conecta tu cuenta de Stripe para recibir pagos</p>
            <Button variant="outline" disabled>
              Conectar Stripe (próximamente)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
