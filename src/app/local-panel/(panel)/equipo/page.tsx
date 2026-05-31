'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { UsuarioLocal, RolLocal } from '@/types'
import { Users, Plus, Trash2, Mail, Shield, Gift, Lock, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader, EmptyState, SkeletonCard } from '@/components/local-panel/ui'
import { CORTESIA_LABEL, cortesiaPermitidaPorPlan, NIVELES_CORTESIA, type PermisosCortesia } from '@/lib/cortesias'

const ROLES: { value: RolLocal; label: string; desc: string }[] = [
  { value: 'gestor', label: 'Encargado', desc: 'Gestión completa sin facturación' },
  { value: 'barman', label: 'Barman', desc: 'Barra, mesas y scanner' },
  { value: 'puerta', label: 'Puerta', desc: 'Solo scanner y afluencia' },
]

export default function EquipoPage() {
  const toast = useToast()
  const { local, trabajador } = useLocalPanelStore()
  const [equipo, setEquipo] = useState<UsuarioLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoRol, setNuevoRol] = useState<RolLocal>('gestor')
  const [guardando, setGuardando] = useState(false)
  const [cortesiasDe, setCortesiasDe] = useState<UsuarioLocal | null>(null)

  const puedoGestionar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'
  const esDueno = trabajador?.rol === 'dueno' // solo el dueño configura cortesías

  const onCortesiasGuardadas = (actualizado: UsuarioLocal) => {
    setEquipo(prev => prev.map(m => (m.id === actualizado.id ? { ...m, ...actualizado } : m)))
    setCortesiasDe(null)
  }

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
          descripcion="Invita a encargados, barra o puerta para repartir el trabajo." />
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
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs px-2 py-0.5 bg-[#2A2A3E] rounded-full text-[#A0A0B8] inline-block">
                    {rol?.label || m.rol}
                  </span>
                  {m.rol !== 'dueno' && resumenCortesias(m) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#7C5CFF]/15 text-[#9B82FF] inline-flex items-center gap-1">
                      <Gift size={10} /> {resumenCortesias(m)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {esDueno && m.rol !== 'dueno' && (
                  <button onClick={() => setCortesiasDe(m)} aria-label="Configurar cortesías"
                    className="text-[#9B82FF] hover:text-white p-2" title="Cortesías">
                    <Gift size={16} />
                  </button>
                )}
                {puedoGestionar && !esMio && (
                  <button onClick={() => desactivar(m.id, m.nombre)} className="text-red-400 hover:text-red-300 p-2" aria-label="Eliminar del equipo">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}

      {cortesiasDe && (
        <CortesiasModal
          worker={cortesiasDe}
          tier={local?.tier}
          onClose={() => setCortesiasDe(null)}
          onSaved={onCortesiasGuardadas}
        />
      )}
    </div>
  )
}

/** Resumen corto de qué puede regalar un trabajador (para el badge). */
function resumenCortesias(m: UsuarioLocal): string | null {
  const tipos: string[] = []
  if (m.cortesia_consumiciones) tipos.push('consumiciones')
  if (m.cortesia_descuentos) tipos.push('descuentos')
  if (m.cortesia_entradas_gratis) tipos.push('entradas')
  if (tipos.length === 0) return null
  if (tipos.length === 3) return 'Todo'
  return tipos.join(' · ')
}

function CortesiasModal({ worker, tier, onClose, onSaved }: {
  worker: UsuarioLocal
  tier: import('@/types').TierLocal | undefined
  onClose: () => void
  onSaved: (m: UsuarioLocal) => void
}) {
  const toast = useToast()
  const [perm, setPerm] = useState<PermisosCortesia>({
    cortesia_consumiciones: !!worker.cortesia_consumiciones,
    cortesia_descuentos: !!worker.cortesia_descuentos,
    cortesia_entradas_gratis: !!worker.cortesia_entradas_gratis,
  })
  const [nivel, setNivel] = useState<number>(worker.nivel_cortesia ?? 0)
  const [maxDia, setMaxDia] = useState<string>(String(worker.cortesia_max_dia ?? 0))
  const [guardando, setGuardando] = useState(false)

  const tipos = [
    { key: 'cortesia_consumiciones' as const, tipo: 'consumicion' as const },
    { key: 'cortesia_descuentos' as const, tipo: 'descuento' as const },
    { key: 'cortesia_entradas_gratis' as const, tipo: 'entrada_gratis' as const },
  ]

  // Aplica un preset de nivel, respetando el gating por plan.
  const aplicarNivel = (n: number) => {
    setNivel(n)
    const base = NIVELES_CORTESIA.find(x => x.nivel === n)!.permisos
    setPerm({
      cortesia_consumiciones: base.cortesia_consumiciones && cortesiaPermitidaPorPlan(tier, 'consumicion'),
      cortesia_descuentos: base.cortesia_descuentos && cortesiaPermitidaPorPlan(tier, 'descuento'),
      cortesia_entradas_gratis: base.cortesia_entradas_gratis && cortesiaPermitidaPorPlan(tier, 'entrada_gratis'),
    })
  }

  const toggle = (key: keyof PermisosCortesia) => {
    setNivel(-1) // override manual: ya no coincide con un preset
    setPerm(p => ({ ...p, [key]: !p[key] }))
  }

  const guardar = async () => {
    setGuardando(true)
    const patch = {
      nivel_cortesia: nivel < 0 ? null : nivel,
      cortesia_consumiciones: perm.cortesia_consumiciones,
      cortesia_descuentos: perm.cortesia_descuentos,
      cortesia_entradas_gratis: perm.cortesia_entradas_gratis,
      cortesia_max_dia: Math.max(0, parseInt(maxDia, 10) || 0),
    }
    const { error } = await supabase.from('usuario_local').update(patch).eq('id', worker.id)
    setGuardando(false)
    if (error) { toast.error('No se pudo guardar'); return }
    toast.success('Cortesías actualizadas')
    onSaved({ ...worker, ...patch, nivel_cortesia: patch.nivel_cortesia ?? undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl glass-strong p-6 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9B82FF]">Cortesías</p>
            <h2 className="text-lg font-bold text-white">{worker.nombre}</h2>
          </div>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>

        {/* Niveles preset */}
        <p className="text-xs text-[#8B8BA8] mb-2">Nivel rápido</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {NIVELES_CORTESIA.map(n => (
            <button key={n.nivel} onClick={() => aplicarNivel(n.nivel)}
              className={cn('rounded-xl border p-2.5 text-left transition-colors',
                nivel === n.nivel ? 'border-[#7C5CFF] bg-[#7C5CFF]/10' : 'border-white/10 bg-white/5 hover:bg-white/8')}>
              <p className="text-sm font-semibold text-white">{n.label}</p>
              <p className="text-[10px] text-[#8B8BA8] leading-tight mt-0.5">{n.desc}</p>
            </button>
          ))}
        </div>

        {/* Toggles finos (gateados por plan) */}
        <p className="text-xs text-[#8B8BA8] mb-2">Ajuste fino</p>
        <div className="space-y-2 mb-4">
          {tipos.map(({ key, tipo }) => {
            const permitido = cortesiaPermitidaPorPlan(tier, tipo)
            const on = perm[key]
            return (
              <button key={key} disabled={!permitido} onClick={() => toggle(key)}
                className={cn('w-full flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors',
                  !permitido ? 'border-white/8 bg-white/[0.02] opacity-60 cursor-not-allowed'
                    : on ? 'border-[#7C5CFF]/50 bg-[#7C5CFF]/10' : 'border-white/10 bg-white/5')}>
                <div>
                  <p className="text-sm font-medium text-white">{CORTESIA_LABEL[tipo]}</p>
                  {!permitido && <p className="text-[10px] text-[#F39C12] mt-0.5">Requiere plan Pro/Destacado</p>}
                </div>
                {!permitido
                  ? <Lock size={15} className="text-[#6B6B85]" />
                  : <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border',
                      on ? 'border-[#7C5CFF] bg-[#7C5CFF] text-white' : 'border-white/20 text-transparent')}>
                      <Check size={13} />
                    </span>}
              </button>
            )
          })}
        </div>

        {/* Límite diario */}
        <div className="mb-5">
          <label className="text-xs text-[#8B8BA8]">Máximo al día <span className="text-[#6B6B85]">(0 = sin límite)</span></label>
          <input type="number" min={0} value={maxDia} onChange={e => setMaxDia(e.target.value)}
            className="mt-1 w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-white text-sm outline-none focus:border-[#7C5CFF]/60" />
        </div>

        <Button fullWidth loading={guardando} onClick={guardar}>Guardar cortesías</Button>
      </div>
    </div>
  )
}
