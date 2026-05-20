'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Local, TierLocal } from '@/types'
import { getLabelTipoLocal, formatearFecha } from '@/lib/utils'
import { Star, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AdminTiersPage() {
  const toast = useToast()
  const [locales, setLocales] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTier, setFiltroTier] = useState<TierLocal | 'todos'>('todos')

  useEffect(() => { cargar() }, [filtroTier])

  async function cargar() {
    let q = supabase.from('locales').select('*').eq('estado', 'activo').order('tier')
    if (filtroTier !== 'todos') q = q.eq('tier', filtroTier)
    const { data } = await q
    if (data) setLocales(data)
    setLoading(false)
  }

  const cambiarTier = async (id: string, tier: TierLocal) => {
    await supabase.from('locales').update({
      tier,
      tier_fecha_inicio: new Date().toISOString(),
      tier_fecha_fin: tier === 'basico' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', id)
    toast.success(`Tier actualizado a ${tier}`)
    cargar()
  }

  const tierColor = { basico: '#505065', pro: '#4F8EF7', destacado: '#F39C12' }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <Star size={20} className="text-[#F39C12]" />
        <h1 className="text-2xl font-black text-white">Gestión de tiers</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['todos', 'basico', 'pro', 'destacado'] as const).map(t => (
          <button key={t} onClick={() => setFiltroTier(t)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-colors',
              filtroTier === t ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white' : 'border-[#2A2A3E] text-[#505065]')}>
            {t}
          </button>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2">
        {(['basico', 'pro', 'destacado'] as TierLocal[]).map(tier => (
          <div key={tier} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-3 text-center">
            <p className="text-xs capitalize" style={{ color: tierColor[tier] }}>{tier}</p>
            <p className="text-xl font-black text-white">{locales.filter(l => l.tier === tier).length}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-[#1A1A2E] rounded-xl animate-pulse" />)
        ) : locales.map(l => (
          <div key={l.id} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A2A3E] overflow-hidden shrink-0">
              <img src={l.imagenes?.[0] || ''} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{l.nombre}</p>
              <p className="text-xs text-[#505065]">{getLabelTipoLocal(l.tipo_local)} · {l.ciudad}</p>
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
                <select value={l.tier} onChange={e => cambiarTier(l.id, e.target.value as TierLocal)}
                  className="pl-2 pr-6 py-1 bg-[#0D0D1A] border border-[#2A2A3E] rounded-lg text-xs text-[#A0A0B8] outline-none appearance-none cursor-pointer">
                  <option value="basico">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="destacado">Destacado</option>
                </select>
                <ChevronDown size={10} className="absolute right-1.5 top-2 text-[#505065] pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
