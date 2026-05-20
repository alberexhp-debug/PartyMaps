'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Usuario, EstadoUsuario } from '@/types'
import { calcularEdad, formatearFecha } from '@/lib/utils'
import { Search, UserX, UserCheck, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AdminUsuariosPage() {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<EstadoUsuario | 'todos'>('todos')

  useEffect(() => { cargar() }, [filtro])

  async function cargar() {
    let query = supabase.from('usuarios').select('*').order('created_at', { ascending: false }).limit(100)
    if (filtro !== 'todos') query = query.eq('estado_cuenta', filtro)
    const { data } = await query
    if (data) setUsuarios(data)
    setLoading(false)
  }

  const cambiarEstado = async (id: string, estado: EstadoUsuario) => {
    await supabase.from('usuarios').update({ estado_cuenta: estado }).eq('id', id)
    toast.success('Estado actualizado')
    cargar()
  }

  const filtrados = usuarios.filter(u =>
    !busqueda || u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.telefono?.includes(busqueda)
  )

  const estadoColor: Record<EstadoUsuario, string> = {
    activa: 'text-green-400',
    suspendida_temporal: 'text-[#F39C12]',
    suspendida_permanente: 'text-red-400',
    eliminada: 'text-[#505065]',
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <h1 className="text-2xl font-black text-white">Gestión de usuarios</h1>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl px-3 py-2">
          <Search size={14} className="text-[#505065]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-[#505065]" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['todos', 'activa', 'suspendida_temporal', 'suspendida_permanente'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                filtro === f ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white' : 'border-[#2A2A3E] text-[#505065]')}>
              {f === 'todos' ? 'Todos' : f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[#505065]">{filtrados.length} usuarios</p>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-[#1A1A2E] rounded-xl animate-pulse" />)
        ) : filtrados.map(u => (
          <div key={u.id} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A2A3E] overflow-hidden flex-shrink-0 flex items-center justify-center">
              {u.foto_perfil_url
                ? <img src={u.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-bold text-sm">{u.nombre[0]}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white text-sm truncate">{u.nombre}</p>
                <span className={cn('text-xs', estadoColor[u.estado_cuenta])}>●</span>
              </div>
              <p className="text-xs text-[#505065]">
                {calcularEdad(u.fecha_nacimiento)} años · {u.telefono || 'Sin teléfono'}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              {u.estado_cuenta === 'activa' ? (
                <button onClick={() => cambiarEstado(u.id, 'suspendida_temporal')}
                  className="p-1.5 text-[#F39C12] hover:bg-[#F39C12]/10 rounded-lg">
                  <UserX size={14} />
                </button>
              ) : (
                <button onClick={() => cambiarEstado(u.id, 'activa')}
                  className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg">
                  <UserCheck size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
