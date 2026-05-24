'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Local, TierLocal } from '@/types'
import { getLabelTipoLocal, formatearFecha, formatearPrecio } from '@/lib/utils'
import { Star, ChevronDown, Settings, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registrarAuditoria } from '@/lib/auditoria'

const CLAVES_PRECIOS = [
  { clave: 'comision_porcentaje', label: 'Comisión por entrada', sufijo: '%' },
  { clave: 'precio_tier_pro', label: 'Tier Pro', sufijo: '€/mes' },
  { clave: 'precio_tier_destacado', label: 'Tier Destacado', sufijo: '€/mes' },
  { clave: 'precio_boost_48h', label: 'Boost 48h', sufijo: '€' },
  { clave: 'precio_boost_72h', label: 'Boost 72h', sufijo: '€' },
  { clave: 'precio_notif_patrocinada_1000', label: 'Notif. patrocinada', sufijo: '€/1000' },
] as const

export default function AdminTiersPage() {
  const toast = useToast()
  const [locales, setLocales] = useState<Local[]>([])
  const [precios, setPrecios] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filtroTier, setFiltroTier] = useState<TierLocal | 'todos'>('todos')

  useEffect(() => { cargar() }, [filtroTier])

  async function cargar() {
    let q = supabase.from('locales').select('*').eq('estado', 'activo').order('tier')
    if (filtroTier !== 'todos') q = q.eq('tier', filtroTier)
    const [{ data: ll }, { data: cc }] = await Promise.all([
      q,
      supabase.from('configuracion_sistema').select('clave, valor')
        .in('clave', CLAVES_PRECIOS.map(c => c.clave)),
    ])
    if (ll) setLocales(ll)
    if (cc) setPrecios(Object.fromEntries(cc.map(r => [r.clave, r.valor])))
    setLoading(false)
  }

  const cambiarTier = async (id: string, tier: TierLocal) => {
    const previo = locales.find(l => l.id === id)
    await supabase.from('locales').update({
      tier,
      tier_fecha_inicio: new Date().toISOString(),
      tier_fecha_fin: tier === 'basico' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', id)
    await registrarAuditoria({
      tipo_accion: 'local_cambio_tier',
      entidad_tipo: 'local',
      entidad_id: id,
      datos_anteriores: previo ? { tier: previo.tier } : null,
      datos_nuevos: { tier },
    })
    toast.success(`Tier actualizado a ${tier}`)
    cargar()
  }

  const tierColor: Record<TierLocal, string> = {
    visibility: '#8B8BA8',
    venta: '#4F8EF7',
    basico: '#4F8EF7',     // legacy → mismo color que venta
    pro: '#E94560',
    destacado: '#D4A84B',
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <Star size={20} className="text-[#F39C12]" />
        <h1 className="text-2xl font-black text-white">Gestión de tiers</h1>
      </div>

      {/* Precios y comisiones actuales */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Tag size={14} className="text-[#F39C12]" /> Precios y comisiones
          </h2>
          <Link href="/admin/configuracion"
            className="text-xs text-[#4F8EF7] hover:text-white flex items-center gap-1">
            <Settings size={11} /> Editar
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CLAVES_PRECIOS.map(p => (
            <div key={p.clave} className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-[#6B6B85]">{p.label}</p>
              <p className="text-lg font-black text-white">
                {precios[p.clave] ?? '—'}
                <span className="text-xs text-[#6B6B85] font-medium ml-1">{p.sufijo}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['todos', 'visibility', 'venta', 'pro', 'destacado'] as const).map(t => (
          <button key={t} onClick={() => setFiltroTier(t)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-colors',
              filtroTier === t ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white' : 'border-white/10 text-[#6B6B85]')}>
            {t}
          </button>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(['visibility', 'venta', 'pro', 'destacado'] as TierLocal[]).map(tier => {
          // contar también los legacy 'basico' como 'venta'
          const count = locales.filter(l => l.tier === tier || (tier === 'venta' && l.tier === 'basico')).length
          return (
            <div key={tier} className="card-premium p-3 text-center">
              <p className="text-xs capitalize text-numeric font-bold" style={{ color: tierColor[tier] }}>{tier}</p>
              <p className="text-2xl font-bold text-white text-display text-numeric mt-1">{count}</p>
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-white/6 rounded-xl animate-pulse" />)
        ) : locales.map(l => (
          <div key={l.id} className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A2A3E] overflow-hidden shrink-0">
              <img src={l.imagenes?.[0] || ''} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{l.nombre}</p>
              <p className="text-xs text-[#6B6B85]">{getLabelTipoLocal(l.tipo_local)} · {l.ciudad}</p>
              {l.tier_fecha_fin && (
                <p className="text-xs text-[#F39C12]">Hasta: {formatearFecha(l.tier_fecha_fin)}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
                style={{ background: `${tierColor[l.tier]}20`, color: tierColor[l.tier] }}>
                {l.tier}
              </span>
              <div className="relative">
                <select value={l.tier === 'basico' ? 'venta' : l.tier} onChange={e => cambiarTier(l.id, e.target.value as TierLocal)}
                  className="pl-2 pr-6 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-[#A0A0B8] outline-none appearance-none cursor-pointer">
                  <option value="visibility">Visibility</option>
                  <option value="venta">Venta (4%)</option>
                  <option value="pro">Pro (49€ · 2.5%)</option>
                  <option value="destacado">Destacado (149€ · 1.5%)</option>
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-2 text-[#6B6B85] pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
