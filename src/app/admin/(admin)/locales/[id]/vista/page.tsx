'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { registrarAuditoria } from '@/lib/auditoria'
import { getLabelTipoLocal } from '@/lib/utils'
import { ROL_LABEL } from '@/lib/permisosLocal'
import type { RolLocal } from '@/types'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Eye, Users, Megaphone, Calendar, LifeBuoy, Store, AtSign,
  CreditCard, UserCog, Boxes,
} from 'lucide-react'

type Vista = {
  local: {
    id: string; nombre: string; tipo_local: string; ciudad: string; estado: string; tier: string
    imagenes: string[] | null; descripcion: string | null; instagram_handle: string | null
    num_suscriptores: number; modulos_activos: string[] | null; stripe_account_id: string | null
    gestor_id: string | null; created_at: string; aforo_maximo: number; entradas_disponibles_noche: number | null
  }
  equipo: { nombre: string; rol: string; activo: boolean; email: string }[]
  rrpp_activos: number
  eventos_publicados: number
  tickets_abiertos: number
  gestor: { nombre: string; email: string } | null
}

const ESTADO_COLOR: Record<string, string> = {
  activo: 'text-[#27AE60] border-[#27AE60]/30 bg-[#27AE60]/10',
  pendiente_verificacion: 'text-[#F39C12] border-[#F39C12]/30 bg-[#F39C12]/10',
  suspendido: 'text-[#B6FF3A] border-[#B6FF3A]/30 bg-[#B6FF3A]/10',
  eliminado: 'text-[#8B8BA8] border-white/15 bg-white/5',
}

export default function AdminLocalVistaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<Vista | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/locales/${id}/vista`).then(r => (r.ok ? r.json() : null)).then((d: Vista | null) => {
      setData(d); setLoading(false)
    }).catch(() => setLoading(false))
    // Toda apertura de la vista de un local queda en auditoría.
    registrarAuditoria({ tipo_accion: 'ver_como_local', entidad_tipo: 'local', entidad_id: id }).catch(() => {})
  }, [id])

  if (loading) {
    return <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}</div>
  }
  if (!data) {
    return (
      <div className="p-6 text-center text-[#8B8BA8]">
        No se pudo cargar la vista del local.
        <div className="mt-4"><Link href="/admin/locales" className="text-[#B6FF3A]">← Volver a Locales</Link></div>
      </div>
    )
  }

  const { local, equipo } = data
  const kpis = [
    { icon: Users, label: 'Suscriptores', valor: local.num_suscriptores ?? 0 },
    { icon: Megaphone, label: 'RRPP activos', valor: data.rrpp_activos },
    { icon: Calendar, label: 'Eventos publicados', valor: data.eventos_publicados },
    { icon: LifeBuoy, label: 'Tickets abiertos', valor: data.tickets_abiertos },
  ]

  return (
    <div className="pb-10">
      {/* Banner permanente de solo lectura */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#7C5CFF]/25 bg-[#7C5CFF]/[0.1] px-4 py-2.5 backdrop-blur-md">
        <Eye size={16} className="shrink-0 text-[#9B82FF]" />
        <p className="text-xs text-[#C9BCFF] sm:text-sm">
          <span className="font-semibold text-white">Vista de soporte (solo lectura).</span> Estás viendo el local sin cambiar de sesión; no puedes editar desde aquí.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <Link href={`/admin/locales/${id}`} className="inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white">
          <ArrowLeft size={16} /> Volver a la ficha
        </Link>

        {/* Cabecera del local */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/5 border border-white/10">
            {local.imagenes?.[0]
              ? <img src={local.imagenes[0]} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <div className="flex h-full w-full items-center justify-center text-[#6B6B85]"><Store size={22} /></div>}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-white">{local.nombre}</h1>
            <p className="text-sm text-[#8B8BA8]">{getLabelTipoLocal(local.tipo_local as Parameters<typeof getLabelTipoLocal>[0])} · {local.ciudad}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize', ESTADO_COLOR[local.estado] || ESTADO_COLOR.eliminado)}>{local.estado.replace('_', ' ')}</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium capitalize text-[#B8B8CC]">Tier {local.tier}</span>
              {local.instagram_handle && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-[#B8B8CC]"><AtSign size={11} /> {local.instagram_handle}</span>
              )}
            </div>
          </div>
        </div>

        {/* KPIs operativos */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {kpis.map(({ icon: Icon, label, valor }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
              <Icon size={16} className="text-[#9B82FF]" />
              <p className="mt-2 text-xl font-black text-white">{valor}</p>
              <p className="text-[11px] text-[#8B8BA8]">{label}</p>
            </div>
          ))}
        </div>

        {/* Equipo */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]"><UserCog size={14} /> Equipo del local</p>
          {equipo.length === 0 ? (
            <p className="text-sm text-[#6B6B85]">Sin miembros de equipo todavía.</p>
          ) : (
            <div className="space-y-1.5">
              {equipo.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-white">{m.nombre || m.email}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[11px] text-[#B8B8CC]">{ROL_LABEL[m.rol as RolLocal] ?? m.rol}</span>
                    {!m.activo && <span className="text-[11px] text-[#B6FF3A]">inactivo</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Módulos + gestor + cobros */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8]"><Boxes size={14} /> Módulos activos</p>
            {local.modulos_activos && local.modulos_activos.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {local.modulos_activos.map(m => <span key={m} className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[11px] capitalize text-[#B8B8CC]">{m.replace('_', ' ')}</span>)}
              </div>
            ) : <p className="text-sm text-[#6B6B85]">Ninguno.</p>}
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#8B8BA8]"><UserCog size={14} /> Gestor</span>
              <span className="truncate text-white">{data.gestor?.nombre || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#8B8BA8]"><CreditCard size={14} /> Cobros</span>
              <span className={cn('text-xs font-medium', local.stripe_account_id ? 'text-[#27AE60]' : 'text-[#6B6B85]')}>{local.stripe_account_id ? 'Stripe conectado' : 'Sin conectar'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
