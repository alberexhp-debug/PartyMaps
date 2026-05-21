'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Local, EstadoLocal, TierLocal } from '@/types'
import { getLabelTipoLocal, formatearFecha } from '@/lib/utils'
import { Search, Check, X, Star, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registrarAuditoria } from '@/lib/auditoria'

export default function AdminLocalesPage() {
  const toast = useToast()
  const [locales, setLocales] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoLocal | 'todos'>('todos')
  const [accionando, setAccionando] = useState<string | null>(null)

  useEffect(() => { cargar() }, [filtroEstado])

  async function cargar() {
    let query = supabase.from('locales').select('*').order('created_at', { ascending: false }).limit(100)
    if (filtroEstado !== 'todos') query = query.eq('estado', filtroEstado)
    const { data } = await query
    if (data) setLocales(data)
    setLoading(false)
  }

  const cambiarEstado = async (id: string, estado: EstadoLocal, motivoOpcional?: string) => {
    setAccionando(id)
    const previo = locales.find(l => l.id === id)
    // Si se suspende o rechaza, pedimos motivo si no lo hemos recibido por argumento
    let motivo = motivoOpcional
    if (!motivo && estado === 'suspendido') {
      motivo = window.prompt('Motivo (visible para el equipo en el log, no se envía al local automáticamente):') ?? undefined
      if (motivo === '') motivo = undefined
    }
    await supabase.from('locales').update({ estado }).eq('id', id)
    await registrarAuditoria({
      tipo_accion: `local_${estado}`,
      entidad_tipo: 'local',
      entidad_id: id,
      datos_anteriores: previo ? { estado: previo.estado } : null,
      datos_nuevos: { estado },
      motivo,
    })
    toast.success(`Local ${estado.replace('_', ' ')}`)
    cargar()
    setAccionando(null)
  }

  const cambiarTier = async (id: string, tier: TierLocal) => {
    const previo = locales.find(l => l.id === id)
    await supabase.from('locales').update({
      tier,
      tier_fecha_inicio: new Date().toISOString(),
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

  const filtrados = locales.filter(l =>
    !busqueda || l.nombre.toLowerCase().includes(busqueda.toLowerCase()) || l.ciudad.toLowerCase().includes(busqueda.toLowerCase())
  )

  const estadoColor: Record<EstadoLocal, string> = {
    activo: 'text-green-400 bg-green-400/10 border-green-400/30',
    pendiente_verificacion: 'text-[#F39C12] bg-[#F39C12]/10 border-[#F39C12]/30',
    suspendido: 'text-red-400 bg-red-400/10 border-red-400/30',
    eliminado: 'text-[#505065] bg-[#1A1A2E] border-[#2A2A3E]',
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <h1 className="text-2xl font-black text-white">Gestión de locales</h1>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl px-3 py-2 min-w-48">
          <Search size={14} className="text-[#505065]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar local..."
            className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-[#505065]" />
        </div>
        {(['todos', 'pendiente_verificacion', 'activo', 'suspendido'] as const).map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
              filtroEstado === e ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white' : 'border-[#2A2A3E] text-[#505065]')}>
            {e === 'todos' ? 'Todos' : e.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Contador */}
      <p className="text-xs text-[#505065]">{filtrados.length} locales</p>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 bg-[#1A1A2E] rounded-2xl animate-pulse" />)
        ) : filtrados.map(local => (
          <div key={local.id} className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#2A2A3E] shrink-0">
                <img src={local.imagenes?.[0] || ''} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-white truncate">{local.nombre}</h3>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', estadoColor[local.estado])}>
                    {local.estado.replace('_', ' ')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[#F39C12]/30 text-[#F39C12] capitalize">
                    {local.tier}
                  </span>
                </div>
                <p className="text-xs text-[#505065]">{getLabelTipoLocal(local.tipo_local)} · {local.ciudad}</p>
                <p className="text-xs text-[#505065]">{formatearFecha(local.created_at)}</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2">
              {local.estado === 'pendiente_verificacion' && (
                <>
                  <button
                    onClick={() => cambiarEstado(local.id, 'activo')}
                    disabled={accionando === local.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-green-400 hover:bg-green-500/20"
                  >
                    <Check size={12} /> Verificar
                  </button>
                  <button
                    onClick={() => cambiarEstado(local.id, 'suspendido')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 hover:bg-red-500/20"
                  >
                    <X size={12} /> Rechazar
                  </button>
                </>
              )}
              {local.estado === 'activo' && (
                <button
                  onClick={() => cambiarEstado(local.id, 'suspendido')}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 rounded-xl text-xs text-red-400 hover:bg-red-500/10"
                >
                  <AlertCircle size={12} /> Suspender
                </button>
              )}
              {local.estado === 'suspendido' && (
                <button
                  onClick={() => cambiarEstado(local.id, 'activo')}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-green-500/30 rounded-xl text-xs text-green-400 hover:bg-green-500/10"
                >
                  <Check size={12} /> Reactivar
                </button>
              )}

              {/* Cambiar tier */}
              <div className="relative">
                <select
                  value={local.tier}
                  onChange={e => cambiarTier(local.id, e.target.value as TierLocal)}
                  className="px-3 py-1.5 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-xs text-[#A0A0B8] outline-none cursor-pointer appearance-none pr-6"
                >
                  <option value="basico">Básico</option>
                  <option value="pro">Pro</option>
                  <option value="destacado">Destacado</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 top-2.5 text-[#505065] pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
