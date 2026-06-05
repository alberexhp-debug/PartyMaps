'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { UsuarioLocal, RolLocal } from '@/types'
import { Users, Plus, Shield, Gift, ChevronRight, ShieldCheck, ShieldAlert, AtSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader, EmptyState, SkeletonCard } from '@/components/local-panel/ui'
import { CredencialesModal } from '@/components/local-panel/CredencialesModal'
import { DOMINIO_TRABAJADOR, normalizarUsername, esUsernameValido } from '@/lib/equipo'

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
  const [guardando, setGuardando] = useState(false)
  const [credenciales, setCredenciales] = useState<{ username: string; password: string } | null>(null)

  // Campos del alta
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [rol, setRol] = useState<RolLocal>('gestor')
  const [telefono, setTelefono] = useState('')
  const [emailContacto, setEmailContacto] = useState('')
  const [dni, setDni] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')

  const puedoGestionar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'
  const userNorm = normalizarUsername(username)

  const cargar = () => {
    if (!local) return
    supabase.from('usuario_local').select('*').eq('local_id', local.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setEquipo(data); setLoading(false) })
  }

  useEffect(cargar, [local])

  const resetForm = () => {
    setNombre(''); setUsername(''); setRol('gestor'); setTelefono(''); setEmailContacto(''); setDni(''); setFechaNacimiento('')
  }

  const darDeAlta = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!esUsernameValido(userNorm)) { toast.error('Usuario no válido: 3-30 caracteres (letras, números, . _ -)'); return }
    setGuardando(true)
    const res = await fetch('/api/local-panel/equipo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(), username: userNorm, rol,
        telefono, email_contacto: emailContacto, dni, fecha_nacimiento: fechaNacimiento,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setGuardando(false)
    if (!res.ok) { toast.error(data.error || 'No se pudo dar de alta'); return }
    toast.success(`${nombre.trim()} dado de alta`)
    setShowForm(false)
    resetForm()
    cargar()
    if (data.credenciales) setCredenciales(data.credenciales)
  }

  return (
    <div className="relative space-y-4 overflow-hidden p-4 pb-24 md:p-8 md:pb-8">
      <PageHeader
        eyebrow="Negocio" titulo="Equipo" subtitulo="Da de alta a tu equipo y gestiona sus accesos" acento="blue"
        acciones={puedoGestionar && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Dar de alta
          </Button>
        )}
      />

      {/* Form de alta */}
      {showForm && (
        <div className="glass space-y-3 rounded-2xl p-4">
          <h2 className="font-bold text-white">Nuevo miembro del equipo</h2>
          <Input label="Nombre y apellidos" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />

          <div>
            <Input label="Nombre de usuario" value={username} onChange={e => setUsername(e.target.value)} placeholder="p.ej. juan.barra" autoComplete="off" />
            {username && (
              <p className={cn('mt-1 text-xs', esUsernameValido(userNorm) ? 'text-[#8B8BA8]' : 'text-[#F39C12]')}>
                {esUsernameValido(userNorm)
                  ? <>Entrará con el usuario <span className="font-mono text-white">{userNorm}</span> <span className="text-[#6B6B85]">(interno: {userNorm}@{DOMINIO_TRABAJADOR})</span></>
                  : 'Usa 3-30 caracteres: letras, números, punto, guion o guion bajo'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0B8]">Rol</label>
            <div className="space-y-1.5">
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setRol(r.value)}
                  className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    rol === r.value ? 'border-[#E94560] bg-[#E94560]/10' : 'border-white/10 bg-white/5')}>
                  <Shield size={14} className={rol === r.value ? 'text-[#E94560]' : 'text-[#6B6B85]'} />
                  <div>
                    <p className="text-sm font-semibold text-white">{r.label}</p>
                    <p className="text-xs text-[#6B6B85]">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="600 000 000" />
            <Input label="DNI/NIE" value={dni} onChange={e => setDni(e.target.value)} placeholder="00000000A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email de contacto" type="email" value={emailContacto} onChange={e => setEmailContacto(e.target.value)} placeholder="opcional" />
            <Input label="Fecha de nacimiento" type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button loading={guardando} onClick={darDeAlta}>Dar de alta</Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
          </div>
          <p className="text-xs text-[#6B6B85]">Se generará una contraseña por defecto. El trabajador la cambiará y configurará su authenticator en el primer acceso.</p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} className="h-20" />)
      ) : equipo.length === 0 ? (
        <EmptyState icon={Users} acento="blue" titulo="Aún no hay equipo"
          descripcion="Da de alta a encargados, barra o puerta para repartir el trabajo." />
      ) : (
        equipo.map(m => {
          const rolInfo = ROLES.find(r => r.value === m.rol)
          const esMio = m.id === trabajador?.id
          const esDueno = m.rol === 'dueno'
          const contenido = (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A2A3E]">
                <span className="font-bold text-white">{m.nombre[0]?.toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-white">{m.nombre}</p>
                  {esMio && <span className="text-xs text-[#6B6B85]">(Tú)</span>}
                </div>
                <p className="flex items-center gap-1 truncate text-xs text-[#6B6B85]">
                  {m.username ? <><AtSign size={11} /> {m.username}</> : m.email}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-block rounded-full bg-[#2A2A3E] px-2 py-0.5 text-xs text-[#A0A0B8]">{esDueno ? 'Dueño' : rolInfo?.label || m.rol}</span>
                  {!m.activo && <span className="rounded-full bg-red-500/12 px-2 py-0.5 text-xs text-red-400">Inactivo</span>}
                  {!esDueno && m.username && (
                    m.totp_activado
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/12 px-2 py-0.5 text-xs text-green-400"><ShieldCheck size={10} /> Acceso activo</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-[#F39C12]/12 px-2 py-0.5 text-xs text-[#F39C12]"><ShieldAlert size={10} /> Sin configurar</span>
                  )}
                  {!esDueno && resumenCortesias(m) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#7C5CFF]/15 px-2 py-0.5 text-xs text-[#9B82FF]"><Gift size={10} /> {resumenCortesias(m)}</span>
                  )}
                </div>
              </div>
              {!esDueno && puedoGestionar && <ChevronRight size={18} className="shrink-0 text-[#6B6B85]" />}
            </>
          )
          // El dueño no abre ficha; los trabajadores sí (si puedes gestionar).
          return !esDueno && puedoGestionar ? (
            <Link key={m.id} href={`/local-panel/equipo/${m.id}`} className={cn('glass flex items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-white/[0.04]', !m.activo && 'opacity-60')}>
              {contenido}
            </Link>
          ) : (
            <div key={m.id} className={cn('glass flex items-center gap-3 rounded-2xl p-4', !m.activo && 'opacity-60')}>{contenido}</div>
          )
        })
      )}

      {credenciales && (
        <CredencialesModal username={credenciales.username} password={credenciales.password} onClose={() => setCredenciales(null)} />
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
