'use client'
import { useEffect, useState, useCallback } from 'react'
import { useGrupoStore } from '@/lib/stores/useGrupoStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { PageHeader, SectionCard, EmptyState } from '@/components/local-panel/ui'
import { Users, Plus, X, Mail, Check, Copy, ShieldOff, Crown, Power, Trash2 } from 'lucide-react'

type LocalMin = { id: string; nombre: string }
type Miembro = {
  id: string; email: string; nombre: string | null; rol: 'propietario' | 'manager'
  locales_asignados: string[] | null; activo: boolean
}

export default function GrupoEquipoPage() {
  const toast = useToast()
  const miembro = useGrupoStore(s => s.miembro)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [locales, setLocales] = useState<LocalMin[]>([])
  const [loading, setLoading] = useState(true)
  const [abrir, setAbrir] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/grupo/equipo')
    if (r.status === 403) { setForbidden(true); setLoading(false); return }
    const j = await r.json().catch(() => ({}))
    if (r.ok) { setMiembros(j.miembros ?? []); setLocales(j.locales ?? []) }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const nombreLocal = (id: string) => locales.find(l => l.id === id)?.nombre ?? '—'

  async function toggleActivo(m: Miembro) {
    await fetch('/api/grupo/equipo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, activo: !m.activo }) })
    cargar()
  }
  async function quitar(m: Miembro) {
    if (!confirm(`¿Quitar a ${m.nombre || m.email} del grupo?`)) return
    await fetch(`/api/grupo/equipo?id=${m.id}`, { method: 'DELETE' })
    cargar()
  }

  if (forbidden || (miembro && miembro.rol !== 'propietario')) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Equipo" acento="blue" titulo="Equipo del grupo" />
        <EmptyState icon={ShieldOff} acento="neutral" titulo="Sección solo del propietario"
          descripcion="La gestión de managers está reservada al propietario del grupo." />
      </div>
    )
  }

  const managers = miembros.filter(m => m.rol === 'manager')
  const propietarios = miembros.filter(m => m.rol === 'propietario')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Equipo" acento="blue" titulo="Equipo del grupo"
        subtitulo="Da de alta managers y decide a qué locales acceden."
        acciones={<Button size="sm" onClick={() => setAbrir(true)}><Plus size={16} /> Añadir manager</Button>} />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}</div>
      ) : (
        <>
          {propietarios.length > 0 && (
            <SectionCard>
              <div className="space-y-2">
                {propietarios.map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#D4A84B]/15 flex items-center justify-center shrink-0"><Crown size={16} className="text-[#D4A84B]" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{m.nombre || m.email}</p>
                      <p className="text-xs text-[#8B8BA8] truncate">{m.email}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-[#D4A84B] font-semibold">Propietario</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {managers.length === 0 ? (
            <EmptyState icon={Users} acento="blue" titulo="Aún no tienes managers"
              descripcion="Añade personas que gestionen uno o varios de tus locales sin ver tu facturación."
              accion={<Button size="sm" onClick={() => setAbrir(true)}><Plus size={16} /> Añadir manager</Button>} />
          ) : (
            <div className="space-y-2">
              {managers.map(m => (
                <div key={m.id} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#4F8EF7]/15 flex items-center justify-center shrink-0 font-semibold text-[#4F8EF7]">
                      {(m.nombre || m.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{m.nombre || m.email}</p>
                      <p className="text-xs text-[#8B8BA8] truncate">{m.email}</p>
                    </div>
                    {!m.activo && <span className="text-[10px] text-[#B6FF3A] font-semibold">Pausado</span>}
                    <button onClick={() => toggleActivo(m)} title={m.activo ? 'Pausar' : 'Reactivar'}
                      className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#B8B8CC] hover:text-white"><Power size={14} /></button>
                    <button onClick={() => quitar(m)} title="Quitar"
                      className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#B8B8CC] hover:text-[#B6FF3A]"><Trash2 size={14} /></button>
                  </div>
                  <div className="mt-2 pl-12 text-xs text-[#9DA0B5]">
                    {m.locales_asignados && m.locales_asignados.length > 0
                      ? <>Acceso a: {m.locales_asignados.map(nombreLocal).join(', ')}</>
                      : <>Acceso a <span className="text-[#B8B8CC]">todos</span> los locales del grupo</>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {abrir && <NuevoManagerModal locales={locales} onClose={() => setAbrir(false)}
        onHecho={() => { setAbrir(false); cargar() }} toastError={toast.error} />}
    </div>
  )
}

function NuevoManagerModal({ locales, onClose, onHecho, toastError }: {
  locales: LocalMin[]; onClose: () => void; onHecho: () => void; toastError: (m: string) => void
}) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [todos, setTodos] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [cred, setCred] = useState<{ email: string; password: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  async function crear() {
    if (!email.includes('@')) { toastError('Email inválido'); return }
    setEnviando(true)
    const r = await fetch('/api/grupo/equipo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, locales_asignados: todos ? [] : sel }),
    })
    const j = await r.json().catch(() => ({}))
    setEnviando(false)
    if (!r.ok) { toastError(j.error || 'No se pudo crear'); return }
    if (j.credenciales) { setCred(j.credenciales); return }
    onHecho()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {cred ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 text-green-400"><Check size={26} /></div>
            <div>
              <h2 className="text-lg font-bold text-white">Manager añadido</h2>
              <p className="mt-1 text-sm text-[#A0A0B8]">Entrega estas credenciales. Que cambie la contraseña al entrar en /grupo/login.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-white">
              <p className="flex items-center gap-2"><Mail size={14} className="text-[#4F8EF7]" /> {cred.email}</p>
              <p className="mt-2 font-mono">{cred.password}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => { navigator.clipboard?.writeText(`Acceso TODH (Grupo)\nEmail: ${cred.email}\nContraseña: ${cred.password}\n/grupo/login`); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}>
                {copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar</>}
              </Button>
              <Button fullWidth onClick={onHecho}>Hecho</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white text-display">Añadir manager</h2>
              <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <Input label="Email del manager" type="email" icon={<Mail size={16} />} value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@email.com" />
              <Input label="Nombre (opcional)" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre y apellidos" />
              <div>
                <p className="text-sm font-medium text-[#A0A0B8] mb-2">¿A qué locales accede?</p>
                <label className="flex items-center gap-2 text-sm text-white mb-2">
                  <input type="checkbox" checked={todos} onChange={e => setTodos(e.target.checked)} />
                  Todos los locales del grupo
                </label>
                {!todos && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-xl border border-white/8 p-2">
                    {locales.length === 0 && <p className="text-xs text-[#8B8BA8] px-1">No hay locales en el grupo todavía.</p>}
                    {locales.map(l => (
                      <label key={l.id} className="flex items-center gap-2 text-sm text-[#B8B8CC] px-1 py-1">
                        <input type="checkbox" checked={sel.includes(l.id)} onChange={() => toggle(l.id)} />
                        {l.nombre}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <Button fullWidth size="lg" loading={enviando} onClick={crear}>Añadir manager</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
