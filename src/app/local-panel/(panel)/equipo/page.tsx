'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { UsuarioLocal, RolLocal } from '@/types'
import { Users, Plus, Trash2, Mail, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader, EmptyState, SkeletonCard } from '@/components/local-panel/ui'

const ROLES: { value: RolLocal; label: string; desc: string }[] = [
  { value: 'dueno', label: 'Dueño', desc: 'Acceso total' },
  { value: 'gestor', label: 'Gestor', desc: 'Gestión completa sin facturación' },
  { value: 'operador_noche', label: 'Operador de noche', desc: 'Scanner, notificaciones, reviews' },
  { value: 'puerta', label: 'Puerta', desc: 'Solo scanner QR' },
]

export default function EquipoPage() {
  const toast = useToast()
  const { local, trabajador } = useLocalPanelStore()
  const [equipo, setEquipo] = useState<UsuarioLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoRol, setNuevoRol] = useState<RolLocal>('operador_noche')
  const [guardando, setGuardando] = useState(false)

  const puedoGestionar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'

  useEffect(() => {
    if (!local) return
    supabase.from('usuario_local').select('*').eq('local_id', local.id).eq('activo', true)
      .then(({ data }) => { if (data) setEquipo(data); setLoading(false) })
  }, [local])

  const invitar = async () => {
    if (!nuevoEmail || !nuevoNombre) { toast.error('Email y nombre son obligatorios'); return }
    setGuardando(true)

    // Create auth user and usuario_local record
    const { error } = await supabase.from('usuario_local').insert({
      local_id: local!.id,
      email: nuevoEmail.trim().toLowerCase(),
      nombre: nuevoNombre.trim(),
      rol: nuevoRol,
      activo: true,
    })

    if (error?.code === '23505') {
      toast.error('Este email ya está en el equipo')
    } else if (error) {
      toast.error('Error al añadir miembro')
    } else {
      toast.success(`${nuevoNombre} añadido al equipo`)
      setShowForm(false)
      setNuevoEmail('')
      setNuevoNombre('')
      const { data } = await supabase.from('usuario_local').select('*').eq('local_id', local!.id).eq('activo', true)
      if (data) setEquipo(data)
    }
    setGuardando(false)
  }

  const desactivar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre} del equipo?`)) return
    await supabase.from('usuario_local').update({ activo: false }).eq('id', id)
    setEquipo(prev => prev.filter(m => m.id !== id))
    toast.success(`${nombre} eliminado del equipo`)
  }

  return (
    <div className="relative p-4 md:p-8 pb-24 md:pb-8 space-y-4 overflow-hidden">
      <PageHeader
        eyebrow="Negocio" titulo="Equipo" subtitulo="Quién gestiona tu local" acento="blue"
        acciones={puedoGestionar && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Añadir
          </Button>
        )}
      />

      {/* Form añadir */}
      {showForm && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-white">Nuevo miembro</h2>
          <Input label="Nombre" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre completo" />
          <Input label="Email" type="email" icon={<Mail size={14} />}
            value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} placeholder="email@local.com" />
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0B8]">Rol</label>
            <div className="space-y-1.5">
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setNuevoRol(r.value)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                    nuevoRol === r.value ? 'border-[#E94560] bg-[#E94560]/10' : 'border-white/10 bg-white/5')}>
                  <Shield size={14} className={nuevoRol === r.value ? 'text-[#E94560]' : 'text-[#6B6B85]'} />
                  <div>
                    <p className="text-sm font-semibold text-white">{r.label}</p>
                    <p className="text-xs text-[#6B6B85]">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button loading={guardando} onClick={invitar}>Añadir al equipo</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Lista equipo */}
      {loading ? (
        Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} className="h-20" />)
      ) : equipo.length === 0 ? (
        <EmptyState icon={Users} acento="blue" titulo="Aún no hay equipo"
          descripcion="Invita a gestores, operadores, puerta o barra para repartir el trabajo." />
      ) : (
        equipo.map(m => {
          const rol = ROLES.find(r => r.value === m.rol)
          const esMio = m.id === trabajador?.id
          return (
            <div key={m.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2A2A3E] flex items-center justify-center">
                <span className="text-white font-bold">{m.nombre[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{m.nombre}</p>
                  {esMio && <span className="text-xs text-[#6B6B85]">(Tú)</span>}
                </div>
                <p className="text-xs text-[#6B6B85] truncate">{m.email}</p>
                <span className="text-xs px-2 py-0.5 bg-[#2A2A3E] rounded-full text-[#A0A0B8] mt-1 inline-block">
                  {rol?.label || m.rol}
                </span>
              </div>
              {puedoGestionar && !esMio && (
                <button onClick={() => desactivar(m.id, m.nombre)} className="text-red-400 hover:text-red-300 p-2">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
