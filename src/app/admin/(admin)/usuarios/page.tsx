'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Usuario, EstadoUsuario } from '@/types'
import { calcularEdad } from '@/lib/utils'
import { Search, AlertCircle, Shield } from '@/components/todh/iconosTorneum'
import { UserX, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registrarAuditoria } from '@/lib/auditoria'

// Doc5 §6.1: no hay listado general de usuarios paginado. La búsqueda requiere
// un criterio + un motivo justificado que queda en el log de auditoría.

export default function AdminUsuariosPage() {
  const toast = useToast()
  const [criterio, setCriterio] = useState('')
  const [motivo, setMotivo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [haBuscado, setHaBuscado] = useState(false)

  async function buscar() {
    const q = criterio.trim()
    if (q.length < 3) { toast.error('Introduce al menos 3 caracteres'); return }
    if (motivo.trim().length < 5) { toast.error('Indica un motivo justificado (≥5 caracteres)'); return }

    setBuscando(true)
    // Detectamos si es UUID, teléfono o nombre
    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)
    const esTelefono = /^[+\d\s]+$/.test(q) && q.replace(/\s/g, '').length >= 6

    let query = supabase.from('usuarios').select('*').limit(20)
    if (esUuid) query = query.eq('id', q)
    else if (esTelefono) query = query.ilike('telefono', `%${q.replace(/\s/g, '')}%`)
    else query = query.ilike('nombre', `%${q}%`)

    const { data, error } = await query
    setBuscando(false)
    setHaBuscado(true)
    if (error) { toast.error(error.message); return }

    setResultados(data ?? [])
    await registrarAuditoria({
      tipo_accion: 'busqueda_usuarios',
      entidad_tipo: 'usuario',
      motivo: motivo.trim(),
      datos_nuevos: { criterio: q, num_resultados: data?.length ?? 0 },
    })
  }

  async function cambiarEstado(id: string, estado: EstadoUsuario) {
    const previo = resultados.find(u => u.id === id)
    await supabase.from('usuarios').update({ estado_cuenta: estado }).eq('id', id)
    await registrarAuditoria({
      tipo_accion: `usuario_${estado}`,
      entidad_tipo: 'usuario',
      entidad_id: id,
      datos_anteriores: previo ? { estado_cuenta: previo.estado_cuenta } : null,
      datos_nuevos: { estado_cuenta: estado },
      motivo: motivo.trim(),
    })
    toast.success('Estado actualizado')
    setResultados(prev => prev.map(u => u.id === id ? { ...u, estado_cuenta: estado } : u))
  }

  const estadoColor: Record<EstadoUsuario, string> = {
    activa: 'text-green-400',
    suspendida_temporal: 'text-[#F39C12]',
    suspendida_permanente: 'text-red-400',
    eliminada: 'text-[#6B6B85]',
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <h1 className="text-2xl font-black text-white">Gestión de usuarios</h1>

      <div className="bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-xl p-3 flex items-start gap-2">
        <Shield size={14} className="text-[#F39C12] shrink-0 mt-0.5" />
        <p className="text-xs text-[#F39C12] leading-relaxed">
          La búsqueda exige un motivo justificado. Cada consulta queda registrada en el log de auditoría con tu ID, el motivo y el resultado. Solo accede a datos de usuarios cuando sea estrictamente necesario.
        </p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs text-[#6B6B85]">Motivo de la consulta *</label>
          <input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Ticket #1234, reembolso entrada"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#4F8EF7]/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#6B6B85]">Búsqueda por nombre, teléfono o UUID *</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Search size={14} className="text-[#6B6B85]" />
              <input
                value={criterio}
                onChange={e => setCriterio(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') buscar() }}
                placeholder="Mínimo 3 caracteres"
                className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-[#6B6B85]"
              />
            </div>
            <button onClick={buscar} disabled={buscando}
              className="px-4 py-2 bg-[#4F8EF7] rounded-xl text-sm font-semibold text-white disabled:opacity-50">
              Buscar
            </button>
          </div>
        </div>
      </div>

      {haBuscado && (
        <>
          <p className="text-xs text-[#6B6B85]">{resultados.length} resultados</p>
          {resultados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <AlertCircle size={28} className="text-[#6B6B85]" />
              <p className="text-sm text-[#6B6B85]">Sin resultados para esa búsqueda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resultados.map(u => (
                <div key={u.id} className="glass rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2A2A3E] overflow-hidden shrink-0 flex items-center justify-center">
                    {u.foto_perfil_url
                      ? <img src={u.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white font-bold text-sm">{u.nombre[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{u.nombre}</p>
                      <span className={cn('text-xs', estadoColor[u.estado_cuenta])}>●</span>
                    </div>
                    <p className="text-xs text-[#6B6B85]">
                      {calcularEdad(u.fecha_nacimiento)} años · {u.telefono || 'sin teléfono'}
                    </p>
                    <p className="text-[10px] text-[#6B6B85] font-mono">{u.id.slice(0, 8)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {u.estado_cuenta === 'activa' ? (
                      <button onClick={() => cambiarEstado(u.id, 'suspendida_temporal')}
                        aria-label="Suspender temporalmente"
                        title="Suspender temporalmente"
                        className="p-1.5 text-[#F39C12] hover:bg-[#F39C12]/10 rounded-lg">
                        <UserX size={14} />
                      </button>
                    ) : (
                      <button onClick={() => cambiarEstado(u.id, 'activa')}
                        aria-label="Reactivar"
                        title="Reactivar"
                        className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg">
                        <UserCheck size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
