'use client'
import { useEffect, useState } from 'react'
import { PageHeader, EmptyState, StatCard } from '@/components/local-panel/ui'
import { getLabelTipoLocal } from '@/lib/utils'
import { Store, Users, Wallet } from 'lucide-react'

type LocalGrupo = {
  id: string; nombre: string; ciudad: string; tipo_local: string; tier: string; estado: string
  imagen: string | null; suscriptores: number; ingresos_mes: number; entradas_mes: number
}

const ESTADO_BADGE: Record<string, string> = {
  activo: 'text-[#27AE60] bg-[#27AE60]/12 border-[#27AE60]/30',
  pendiente_verificacion: 'text-[#F39C12] bg-[#F39C12]/12 border-[#F39C12]/30',
  suspendido: 'text-[#B6FF3A] bg-[#B6FF3A]/12 border-[#B6FF3A]/30',
  eliminado: 'text-[#8B8BA8] bg-white/6 border-white/10',
}

export default function GrupoLocalesPage() {
  const [locales, setLocales] = useState<LocalGrupo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/grupo/locales').then(r => r.ok ? r.json() : null)
      .then(j => setLocales(j?.locales ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const ingresosTotal = locales.reduce((s, l) => s + l.ingresos_mes, 0)
  const suscriptoresTotal = locales.reduce((s, l) => s + l.suscriptores, 0)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tu grupo" acento="blue" titulo="Locales"
        subtitulo="Todos tus locales y su rendimiento del mes." />

      {!loading && locales.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard icon={Store} acento="blue" label="Locales" value={locales.length} />
          <StatCard icon={Users} acento="violet" label="Suscriptores" value={suscriptoresTotal.toLocaleString('es-ES')} />
          <StatCard icon={Wallet} acento="green" label="Ingresos mes" value={`${ingresosTotal.toFixed(0)} €`} />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
      ) : locales.length === 0 ? (
        <EmptyState icon={Store} acento="blue" titulo="Sin locales en el grupo"
          descripcion="Cuando el equipo de Torneum asocie locales a tu grupo, aparecerán aquí." />
      ) : (
        <div className="space-y-2">
          {locales.map(l => (
            <div key={l.id} className="flex items-center gap-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-3.5">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#1E2331] flex items-center justify-center">
                {l.imagen
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.imagen} alt="" className="h-full w-full object-cover" />
                  : <Store size={18} className="text-[#6B6B85]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{l.nombre}</p>
                <p className="truncate text-xs text-[#8B8BA8]">{getLabelTipoLocal(l.tipo_local as never)} · {l.ciudad}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-[#9DA0B5]">
                  <span className="text-[#B8B8CC] font-semibold text-numeric">{l.ingresos_mes.toFixed(0)} €</span>
                  <span>· {l.entradas_mes} entradas</span>
                  <span>· {l.suscriptores} subs</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${ESTADO_BADGE[l.estado] ?? ESTADO_BADGE.eliminado}`}>
                  {l.estado.replace('_', ' ')}
                </span>
                <span className="text-[10px] capitalize text-[#6B6B85]">{l.tier}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
