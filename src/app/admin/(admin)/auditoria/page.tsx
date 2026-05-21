'use client'
import { useEffect, useState } from 'react'
import { FileText, Filter, RefreshCw, User } from 'lucide-react'
import { tiempoRelativo } from '@/lib/utils'

interface Entry {
  id: string
  admin_id: string
  tipo_accion: string
  entidad_tipo: string | null
  entidad_id: string | null
  datos_anteriores: unknown
  datos_nuevos: unknown
  motivo: string | null
  ip: string | null
  created_at: string
}

interface AdminInfo { nombre: string; email: string }

export default function AdminAuditoriaPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [admins, setAdmins] = useState<Record<string, AdminInfo>>({})
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEntidad, setFiltroEntidad] = useState('')

  async function cargar() {
    setLoading(true)
    const sp = new URLSearchParams()
    if (filtroTipo) sp.set('tipo', filtroTipo)
    if (filtroEntidad) sp.set('entidad_tipo', filtroEntidad)
    const res = await fetch(`/api/admin/auditoria?${sp.toString()}`)
    const data = await res.json()
    if (res.ok) {
      setEntries(data.entries || [])
      setAdmins(data.admins || {})
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroTipo, filtroEntidad])

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <FileText size={22} className="text-[#4F8EF7]" /> Log de auditoría
        </h1>
        <button onClick={cargar} className="p-2 text-[#A0A0B8] hover:text-white" title="Refrescar">
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="text-xs text-[#505065]">
        Inmutable. Cada acción del panel de administración queda registrada con timestamp, admin e IP.
      </p>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl px-3 py-2">
          <Filter size={12} className="text-[#505065]" />
          <input
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            placeholder="Tipo (ej: local_suspender)"
            className="bg-transparent text-white text-sm outline-none placeholder:text-[#505065]"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl px-3 py-2">
          <Filter size={12} className="text-[#505065]" />
          <input
            value={filtroEntidad}
            onChange={e => setFiltroEntidad(e.target.value)}
            placeholder="Entidad (local, usuario...)"
            className="bg-transparent text-white text-sm outline-none placeholder:text-[#505065]"
          />
        </div>
      </div>

      <p className="text-xs text-[#505065]">{entries.length} entradas</p>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#1A1A2E] rounded-xl animate-pulse" />
          ))
        ) : entries.length === 0 ? (
          <p className="text-center text-[#505065] py-12">Sin entradas para estos filtros</p>
        ) : entries.map(e => {
          const admin = admins[e.admin_id]
          return (
            <details key={e.id} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-3 group">
              <summary className="cursor-pointer flex items-start justify-between gap-3 list-none">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[#0D0D1A] text-[#4F8EF7]">
                      {e.tipo_accion}
                    </span>
                    {e.entidad_tipo && (
                      <span className="text-[10px] text-[#505065]">
                        {e.entidad_tipo}{e.entidad_id ? `:${e.entidad_id.slice(0, 8)}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#A0A0B8] mt-1 flex items-center gap-2">
                    <User size={10} />
                    {admin ? `${admin.nombre} (${admin.email})` : e.admin_id.slice(0, 8)}
                    {e.ip && <span className="text-[#505065]">· {e.ip}</span>}
                  </p>
                </div>
                <span className="text-[10px] text-[#505065] shrink-0">{tiempoRelativo(e.created_at)}</span>
              </summary>
              {(e.datos_anteriores || e.datos_nuevos || e.motivo) && (
                <div className="mt-3 pt-3 border-t border-[#2A2A3E] space-y-2 text-xs">
                  {e.motivo && (
                    <div>
                      <p className="text-[#505065]">Motivo</p>
                      <p className="text-white">{e.motivo}</p>
                    </div>
                  )}
                  {e.datos_anteriores != null && (
                    <div>
                      <p className="text-[#505065]">Antes</p>
                      <pre className="text-[10px] text-[#A0A0B8] bg-[#0D0D1A] rounded-lg p-2 overflow-x-auto">
                        {JSON.stringify(e.datos_anteriores, null, 2)}
                      </pre>
                    </div>
                  )}
                  {e.datos_nuevos != null && (
                    <div>
                      <p className="text-[#505065]">Después</p>
                      <pre className="text-[10px] text-[#A0A0B8] bg-[#0D0D1A] rounded-lg p-2 overflow-x-auto">
                        {JSON.stringify(e.datos_nuevos, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </details>
          )
        })}
      </div>
    </div>
  )
}
