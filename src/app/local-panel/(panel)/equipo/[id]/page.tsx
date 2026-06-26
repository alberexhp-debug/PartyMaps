'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { UsuarioLocal, RolLocal } from '@/types'
import { ROLES_PERMISOS, ZONAS_ASIGNABLES, ZONA_LABEL, zonasDeTrabajador, type ZonaPanel } from '@/lib/permisosLocal'
import {
  ArrowLeft, Shield, Gift, MessageSquare, KeyRound, ShieldCheck, ShieldAlert,
  Save, Trash2, Power, AtSign, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { CortesiasModal } from '@/components/local-panel/CortesiasModal'
import { CredencialesModal } from '@/components/local-panel/CredencialesModal'
import { fetchLocal } from '@/lib/local-panel/fetchLocal'

const ROLES: { value: RolLocal; label: string; desc: string }[] = [
  { value: 'gestor', label: 'Encargado', desc: 'Gestión completa sin facturación' },
  { value: 'barman', label: 'Árbitro', desc: 'Arbitraje y check-in' },
  { value: 'puerta', label: 'Check-in', desc: 'Check-in de jugadores' },
]

export default function FichaTrabajadorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { local, trabajador } = useLocalPanelStore()
  const [worker, setWorker] = useState<UsuarioLocal | null>(null)
  const [form, setForm] = useState<Partial<UsuarioLocal>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showCortesias, setShowCortesias] = useState(false)
  const [credenciales, setCredenciales] = useState<{ username: string; password: string } | null>(null)
  const [permisos, setPermisos] = useState<Set<string>>(new Set())

  const esDueno = trabajador?.rol === 'dueno'
  const puedoGestionar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'

  const cargar = useCallback(() => {
    if (!local || !id) return
    supabase.from('usuario_local').select('*').eq('id', id).eq('local_id', local.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWorker(data); setForm(data)
          setPermisos(new Set(zonasDeTrabajador(data).filter(z => ZONAS_ASIGNABLES.includes(z))))
        }
        setLoading(false)
      })
  }, [local, id])

  useEffect(cargar, [cargar])

  // Solo dueño/gestor acceden a la ficha.
  useEffect(() => {
    if (trabajador && !puedoGestionar) router.replace('/local-panel/dashboard')
  }, [trabajador, puedoGestionar, router])

  const set = (k: keyof UsuarioLocal, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre?.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setGuardando(true)
    // Permisos a medida (§2.1): diferencia respecto al rol base seleccionado.
    const baseRol = ROLES_PERMISOS[(form.rol ?? worker!.rol) as RolLocal]
    const extra = [...permisos].filter(z => ZONAS_ASIGNABLES.includes(z as ZonaPanel) && !baseRol.includes(z as ZonaPanel))
    const quitar = baseRol.filter(z => ZONAS_ASIGNABLES.includes(z) && !permisos.has(z))
    const res = await fetchLocal('/api/local-panel/equipo', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, nombre: form.nombre, rol: form.rol,
        telefono: form.telefono ?? '', email_contacto: form.email_contacto ?? '',
        dni: form.dni ?? '', fecha_nacimiento: form.fecha_nacimiento ?? '',
        permisos_override: { extra, quitar },
      }),
    })
    const data = await res.json().catch(() => ({}))
    setGuardando(false)
    if (!res.ok) { toast.error(data.error || 'No se pudo guardar'); return }
    toast.success('Datos guardados')
    if (data.trabajador) {
      setWorker(data.trabajador); setForm(data.trabajador)
      setPermisos(new Set(zonasDeTrabajador(data.trabajador).filter(z => ZONAS_ASIGNABLES.includes(z))))
    }
  }

  const resetPassword = async () => {
    if (!confirm('¿Generar una nueva contraseña por defecto? La contraseña actual dejará de funcionar.')) return
    const res = await fetchLocal('/api/local-panel/equipo/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(data.error || 'No se pudo resetear'); return }
    cargar()
    if (data.credenciales) setCredenciales(data.credenciales)
  }

  const resetTotp = async () => {
    if (!confirm('¿Reiniciar el authenticator? En su próximo acceso tendrá que volver a escanear el QR.')) return
    const res = await fetchLocal('/api/local-panel/equipo/reset-totp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    if (!res.ok) { toast.error('No se pudo reiniciar'); return }
    toast.success('Authenticator reiniciado')
    cargar()
  }

  const toggleActivo = async () => {
    const nuevo = !worker?.activo
    const res = await fetchLocal('/api/local-panel/equipo', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, activo: nuevo }),
    })
    if (!res.ok) { toast.error('No se pudo cambiar el estado'); return }
    toast.success(nuevo ? 'Trabajador reactivado' : 'Trabajador desactivado')
    cargar()
  }

  const eliminar = async () => {
    if (!confirm(`¿Eliminar a ${worker?.nombre}? Se borrará su cuenta y dejará de poder acceder.`)) return
    const res = await fetchLocal(`/api/local-panel/equipo?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'No se pudo eliminar'); return }
    toast.success('Trabajador eliminado')
    router.push('/local-panel/equipo')
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#B6FF3A]" /></div>
  }
  if (!worker) {
    return (
      <div className="p-6">
        <Link href="/local-panel/equipo" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white"><ArrowLeft size={15} /> Volver al equipo</Link>
        <p className="text-[#A0A0B8]">Trabajador no encontrado.</p>
      </div>
    )
  }

  const cortesiasResumen = [
    worker.cortesia_consumiciones && 'Bonos',
    worker.cortesia_descuentos && 'Descuentos',
    worker.cortesia_entradas_gratis && 'Entradas gratis',
  ].filter(Boolean).join(' · ') || 'Sin cortesías'

  return (
    <div className="relative space-y-4 p-4 pb-24 md:p-8 md:pb-8">
      <Link href="/local-panel/equipo" className="inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white"><ArrowLeft size={15} /> Volver al equipo</Link>

      {/* Cabecera */}
      <div className="glass flex items-center gap-4 rounded-2xl p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2A2A3E] text-xl font-bold text-white">{worker.nombre[0]?.toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-display truncate text-xl font-bold text-white">{worker.nombre}</h1>
          {worker.username && <p className="flex items-center gap-1 text-sm text-[#8B8BA8]"><AtSign size={12} /> {worker.username}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#2A2A3E] px-2 py-0.5 text-xs text-[#A0A0B8]">{ROLES.find(r => r.value === worker.rol)?.label || worker.rol}</span>
            {!worker.activo && <span className="rounded-full bg-red-500/12 px-2 py-0.5 text-xs text-red-400">Inactivo</span>}
            {worker.username && (worker.totp_activado
              ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/12 px-2 py-0.5 text-xs text-green-400"><ShieldCheck size={10} /> Authenticator activo</span>
              : <span className="inline-flex items-center gap-1 rounded-full bg-[#F39C12]/12 px-2 py-0.5 text-xs text-[#F39C12]"><ShieldAlert size={10} /> Pendiente de configurar</span>)}
          </div>
        </div>
      </div>

      {/* Datos */}
      <Section titulo="Datos del trabajador">
        <Input label="Nombre y apellidos" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#A0A0B8]">Rol</label>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {ROLES.map(r => (
              <button key={r.value} onClick={() => set('rol', r.value)}
                className={cn('rounded-xl border p-2.5 text-left transition-colors',
                  form.rol === r.value ? 'border-[#B6FF3A] bg-[#B6FF3A]/10' : 'border-white/10 bg-white/5')}>
                <div className="flex items-center gap-1.5"><Shield size={12} className={form.rol === r.value ? 'text-[#B6FF3A]' : 'text-[#6B6B85]'} /><p className="text-sm font-semibold text-white">{r.label}</p></div>
                <p className="mt-0.5 text-[10px] leading-tight text-[#6B6B85]">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Teléfono" value={form.telefono ?? ''} onChange={e => set('telefono', e.target.value)} placeholder="600 000 000" />
          <Input label="DNI/NIE" value={form.dni ?? ''} onChange={e => set('dni', e.target.value)} placeholder="00000000A" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email de contacto" type="email" value={form.email_contacto ?? ''} onChange={e => set('email_contacto', e.target.value)} placeholder="opcional" />
          <Input label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento ?? ''} onChange={e => set('fecha_nacimiento', e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#6B6B85]">
          <span className="inline-flex items-center gap-1"><AtSign size={12} /> Usuario: <span className="font-mono text-[#A0A0B8]">{worker.username || '—'}</span></span>
          <span className="inline-flex items-center gap-1"><Calendar size={12} /> Alta: {worker.fecha_alta || '—'}</span>
        </div>
        <Button loading={guardando} onClick={guardar}><Save size={15} /> Guardar cambios</Button>
      </Section>

      {/* Permisos por módulos (§2.1 avanzado) */}
      <Section titulo="Permisos del puesto">
        <p className="text-sm text-[#A0A0B8]">Marca los módulos que verá esta persona en su panel. Los de su rol vienen marcados; ajústalos a la carta. El dueño y el encargado tienen acceso completo por su rol.</p>
        <div className="flex flex-wrap gap-1.5">
          {ZONAS_ASIGNABLES.map(z => {
            const on = permisos.has(z)
            return (
              <button key={z} type="button"
                onClick={() => setPermisos(prev => { const n = new Set(prev); if (n.has(z)) n.delete(z); else n.add(z); return n })}
                className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  on ? 'border-[#B6FF3A] bg-[#B6FF3A]/12 text-[#0A0A0F]' : 'border-white/10 bg-white/5 text-[#8B8BA8] hover:text-[#0A0A0F]')}>
                {ZONA_LABEL[z]}
              </button>
            )
          })}
        </div>
        <Button loading={guardando} onClick={guardar}><Save size={15} /> Guardar permisos</Button>
      </Section>

      {/* Comunicación */}
      <Section titulo="Comunicación">
        <Button variant="secondary" onClick={() => setShowChat(true)}><MessageSquare size={15} /> Abrir chat con {worker.nombre.split(' ')[0]}</Button>
      </Section>

      {/* Cortesías (solo dueño) */}
      {esDueno && (
        <Section titulo="Cortesías">
          <p className="text-sm text-[#A0A0B8]">{cortesiasResumen}{worker.cortesia_max_dia ? ` · máx ${worker.cortesia_max_dia}/día` : ''}</p>
          <Button variant="secondary" onClick={() => setShowCortesias(true)}><Gift size={15} /> Configurar cortesías</Button>
        </Section>
      )}

      {/* Acceso y seguridad */}
      <Section titulo="Acceso y seguridad">
        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
          {worker.totp_activado ? <ShieldCheck size={16} className="mt-0.5 text-green-400" /> : <ShieldAlert size={16} className="mt-0.5 text-[#F39C12]" />}
          <p className="text-sm text-[#B8B8CC]">
            {worker.totp_activado ? 'Tiene su authenticator configurado.' : 'Aún no ha configurado el authenticator (lo hará en su primer acceso).'}
            {worker.debe_cambiar_password && ' Tiene una contraseña por defecto pendiente de cambiar.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={resetPassword}><KeyRound size={15} /> Resetear contraseña</Button>
          <Button variant="ghost" onClick={resetTotp}><ShieldAlert size={15} /> Reiniciar authenticator</Button>
        </div>
      </Section>

      {/* Zona peligrosa */}
      <Section titulo="Estado">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={toggleActivo}><Power size={15} /> {worker.activo ? 'Desactivar' : 'Reactivar'}</Button>
          <button onClick={eliminar} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/30 px-4 text-sm text-red-400 transition-colors hover:bg-red-500/10">
            <Trash2 size={15} /> Eliminar del equipo
          </button>
        </div>
      </Section>

      {showChat && (
        <ChatRrpp
          titulo={worker.nombre}
          subtitulo={worker.username ? `@${worker.username}` : undefined}
          getUrl={`/api/local-panel/equipo/chat?trabajador_id=${worker.id}`}
          postUrl="/api/local-panel/equipo/chat"
          postBody={{ trabajador_id: worker.id }}
          yo="local"
          onClose={() => setShowChat(false)}
        />
      )}
      {showCortesias && (
        <CortesiasModal worker={worker} tier={local?.tier} onClose={() => setShowCortesias(false)}
          onSaved={(m) => { setWorker(m); setForm(m); setShowCortesias(false) }} />
      )}
      {credenciales && (
        <CredencialesModal titulo="Nuevas credenciales" username={credenciales.username} password={credenciales.password} onClose={() => setCredenciales(null)} />
      )}
    </div>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="glass space-y-3 rounded-2xl p-4 md:p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#6B6B85]">{titulo}</h2>
      {children}
    </div>
  )
}
