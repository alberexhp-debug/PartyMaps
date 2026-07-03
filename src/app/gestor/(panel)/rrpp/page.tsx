'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/local-panel/ui'
import {
  Megaphone, Plus, Search, Mail, Store, ChevronDown,
  Check, Copy, X, AtSign, Percent, Pause, Play, UserPlus, KeyRound, RotateCcw,
} from 'lucide-react'
import { normalizarUsername, esUsernameValido } from '@/lib/equipo'
import { CredencialesModal } from '@/components/local-panel/CredencialesModal'

type LocalMin = { id: string; nombre: string; ciudad: string }
type Relacion = {
  id: string
  estado: string
  comision_pct: number
  tope_por_venta: number | null
  rrpp: { id: string; slug: string; nombre_publico: string; foto_url: string | null; instagram: string | null; estado_alta: string; username?: string | null }
}
type Invitacion = { id: string; email: string; nombre: string | null; token: string; estado: string; comision_pct_sugerida: number | null }

const ESTADO_BADGE: Record<string, string> = {
  activa: 'text-green-400 bg-green-400/10 border-green-400/30',
  pendiente: 'text-[#F39C12] bg-[#F39C12]/10 border-[#F39C12]/30',
  pausada: 'text-[#8B8BA8] bg-white/6 border-white/12',
  archivada: 'text-[#6B6B85] bg-white/6 border-white/10',
}

export default function GestorRrppPage() {
  const toast = useToast()
  const [locales, setLocales] = useState<LocalMin[]>([])
  const [localId, setLocalId] = useState('')
  const [relaciones, setRelaciones] = useState<Relacion[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'alta' | 'vincular' | 'invitar'>(null)

  useEffect(() => {
    fetch('/api/gestor/locales').then(r => r.json()).then(d => {
      const locs: LocalMin[] = (d.locales || []).map((l: LocalMin) => ({ id: l.id, nombre: l.nombre, ciudad: l.ciudad }))
      setLocales(locs)
      if (locs.length) setLocalId(locs[0].id)
      else setLoading(false)
    })
  }, [])

  const cargar = useCallback(async () => {
    if (!localId) return
    setLoading(true)
    const res = await fetch(`/api/gestor/rrpp?local_id=${localId}`)
    const d = await res.json()
    if (res.ok) { setRelaciones(d.relaciones); setInvitaciones(d.invitaciones) }
    else toast.error(d.error || 'No se pudo cargar')
    setLoading(false)
  }, [localId, toast])

  // Recarga al cambiar de local. NO dependemos de `cargar`: su identidad cambia
  // en cada render (deps con `toast`) y eso provocaba un bucle de fetch que dejaba
  // la lista parpadeando en "cargando".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (localId) cargar() }, [localId])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tu cartera" acento="violet" titulo="RRPP"
        subtitulo="Vincula RRPP a cada local de tu cartera y fija su comisión." />

      {locales.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/12 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-[#9B82FF]"><Store size={24} /></div>
          <p className="text-base font-semibold text-white">Primero da de alta un local</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-[#8B8BA8]">Los RRPP se vinculan a un local concreto de tu cartera.</p>
          <Link href="/gestor/locales"><Button className="mt-5"><Plus size={16} /> Ir a Locales</Button></Link>
        </div>
      ) : (
        <>
          {/* Selector de local */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#A0A0B8]">Local</label>
            <div className="relative">
              <Store size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85]" />
              <select value={localId} onChange={e => setLocalId(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/5 pl-11 pr-10 text-white outline-none focus:border-[#B6FF3A]/60">
                {locales.map(l => <option key={l.id} value={l.id} className="bg-[#181D28]">{l.nombre} · {l.ciudad}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85]" />
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            <Button fullWidth onClick={() => setModal('alta')}><UserPlus size={16} /> Dar de alta un RRPP</Button>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={() => setModal('vincular')}><Search size={16} /> Vincular existente</Button>
              <Button variant="outline" fullWidth onClick={() => setModal('invitar')}><Mail size={16} /> Invitar por email</Button>
            </div>
          </div>

          {/* Relaciones */}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}</div>
          ) : relaciones.length === 0 && invitaciones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
              <Megaphone size={22} className="mx-auto mb-3 text-[#6B6B85]" />
              <p className="text-sm text-[#A0A0B8]">Aún no hay RRPP en este local. Vincula uno o invítalo por email.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {relaciones.map(rel => <RelacionRow key={rel.id} rel={rel} localId={localId} onChange={cargar} />)}
              {invitaciones.map(inv => (
                <div key={inv.id} className="flex items-center gap-3.5 rounded-2xl glass px-4 py-3 opacity-80">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#8B8BA8]"><Mail size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{inv.nombre || inv.email}</p>
                    <p className="truncate text-xs text-[#8B8BA8]">Invitación enviada · {inv.email}</p>
                  </div>
                  <span className="rounded-full border border-[#F39C12]/30 bg-[#F39C12]/10 px-2 py-0.5 text-[10px] font-medium text-[#F39C12]">Pendiente</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modal === 'alta' && <AltaRrppModal localId={localId} onClose={() => setModal(null)} onHecho={() => { setModal(null); cargar() }} />}
      {modal === 'vincular' && <VincularModal localId={localId} onClose={() => setModal(null)} onHecho={() => { setModal(null); cargar() }} />}
      {modal === 'invitar' && <InvitarModal localId={localId} onClose={() => setModal(null)} onHecho={() => { setModal(null); cargar() }} />}
    </div>
  )
}

function RelacionRow({ rel, localId, onChange }: { rel: Relacion; localId: string; onChange: () => void }) {
  const toast = useToast()
  const [pct, setPct] = useState(String(rel.comision_pct ?? 0))
  const [guardando, setGuardando] = useState(false)
  const cambiado = Number(pct) !== rel.comision_pct

  const patch = async (campos: Record<string, unknown>, ok: string) => {
    setGuardando(true)
    const res = await fetch('/api/gestor/rrpp', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: localId, relacion_id: rel.id, ...campos }),
    })
    const d = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(d.error || 'Error'); return }
    toast.success(ok); onChange()
  }

  const [credReset, setCredReset] = useState<{ username: string; password: string } | null>(null)
  async function resetPass() {
    if (!confirm('¿Generar una nueva contraseña por defecto para este RRPP? La actual dejará de servir.')) return
    const res = await fetch('/api/gestor/rrpp/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ local_id: localId, rrpp_id: rel.rrpp.id }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(d.error || 'No se pudo'); return }
    if (d.credenciales) setCredReset(d.credenciales)
  }
  async function resetTotp() {
    if (!confirm('¿Reiniciar el authenticator de este RRPP? En su próximo acceso lo reconfigurará.')) return
    const res = await fetch('/api/gestor/rrpp/reset-totp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ local_id: localId, rrpp_id: rel.rrpp.id }) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'No se pudo'); return }
    toast.success('Authenticator reiniciado')
  }

  return (
    <>
    <div className="rounded-2xl glass px-4 py-3.5">
      <div className="flex items-center gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF]">
          {rel.rrpp.foto_url ? <img src={rel.rrpp.foto_url} alt="" className="h-full w-full object-cover" /> : <Megaphone size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{rel.rrpp.nombre_publico}</p>
          <p className="flex items-center gap-1 truncate text-xs text-[#8B8BA8]">
            {rel.rrpp.instagram ? <><AtSign size={11} /> {rel.rrpp.instagram.replace('@', '')}</> : `@${rel.rrpp.slug}`}
          </p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${ESTADO_BADGE[rel.estado] || ESTADO_BADGE.archivada}`}>{rel.estado}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-white/6 pt-3">
        <div className="relative flex-1">
          <Percent size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B85]" />
          <input type="number" min={0} max={100} value={pct} onChange={e => setPct(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#B6FF3A]/60" />
        </div>
        {cambiado && (
          <Button size="sm" loading={guardando} onClick={() => patch({ comision_pct: Number(pct) }, 'Comisión actualizada')}>
            <Check size={15} /> Guardar
          </Button>
        )}
        {rel.estado === 'activa' && (
          <Button size="sm" variant="outline" loading={guardando} onClick={() => patch({ estado: 'pausada' }, 'RRPP pausado')}><Pause size={15} /></Button>
        )}
        {rel.estado === 'pausada' && (
          <Button size="sm" variant="outline" loading={guardando} onClick={() => patch({ estado: 'activa' }, 'RRPP reactivado')}><Play size={15} /></Button>
        )}
        {rel.rrpp.username && (
          <>
            <Button size="sm" variant="outline" onClick={resetPass} title="Resetear contraseña"><KeyRound size={15} /></Button>
            <Button size="sm" variant="outline" onClick={resetTotp} title="Reiniciar authenticator"><RotateCcw size={15} /></Button>
          </>
        )}
      </div>
    </div>
    {credReset && <CredencialesModal titulo="Nueva contraseña del RRPP" username={credReset.username} password={credReset.password} onClose={() => setCredReset(null)} />}
    </>
  )
}

/* ── Modal: vincular RRPP existente ─────────────────────────────────── */
function VincularModal({ localId, onClose, onHecho }: { localId: string; onClose: () => void; onHecho: () => void }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<{ id: string; slug: string; nombre_publico: string; instagram: string | null }[]>([])
  const [buscando, setBuscando] = useState(false)
  const [comision, setComision] = useState('10')
  const [elegido, setElegido] = useState<{ id: string; nombre_publico: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      const res = await fetch(`/api/gestor/rrpp/buscar?local_id=${localId}&q=${encodeURIComponent(q)}`)
      const d = await res.json()
      setResultados(res.ok ? d.rrpps : [])
      setBuscando(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, localId])

  const vincular = async () => {
    if (!elegido) return
    setGuardando(true)
    const res = await fetch('/api/gestor/rrpp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: localId, rrpp_id: elegido.id, comision_pct: Number(comision) }),
    })
    const d = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(d.error || 'Error'); return }
    toast.success(d.ya_existia ? 'Ese RRPP ya estaba vinculado' : 'RRPP vinculado')
    onHecho()
  }

  return (
    <ModalShell titulo="Vincular RRPP" onClose={onClose}>
      {!elegido ? (
        <div className="space-y-3">
          <Input label="Buscar RRPP" icon={<Search size={16} />} value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre, @ o Instagram" autoFocus />
          {buscando && <p className="text-xs text-[#6B6B85]">Buscando…</p>}
          <div className="space-y-1.5">
            {resultados.map(r => (
              <button key={r.id} onClick={() => setElegido(r)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.07]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C5CFF]/15 text-[#9B82FF]"><Megaphone size={14} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{r.nombre_publico}</p>
                  <p className="truncate text-xs text-[#8B8BA8]">@{r.slug}</p>
                </div>
              </button>
            ))}
            {q.trim().length >= 2 && !buscando && resultados.length === 0 && (
              <p className="px-1 py-3 text-center text-xs text-[#6B6B85]">Sin resultados. Si no está en Tourneum, invítalo por email.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C5CFF]/15 text-[#9B82FF]"><Megaphone size={14} /></span>
            <p className="flex-1 text-sm font-medium text-white">{elegido.nombre_publico}</p>
            <button onClick={() => setElegido(null)} className="text-xs text-[#8B8BA8] hover:text-white">Cambiar</button>
          </div>
          <Input label="Comisión (%)" type="number" icon={<Percent size={16} />} value={comision} onChange={e => setComision(e.target.value)} hint="El RRPP la verá y deberá aceptar la relación." />
          <Button fullWidth size="lg" loading={guardando} onClick={vincular}>Vincular</Button>
        </div>
      )}
    </ModalShell>
  )
}

/* ── Modal: invitar por email ───────────────────────────────────────── */
function InvitarModal({ localId, onClose, onHecho }: { localId: string; onClose: () => void; onHecho: () => void }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [comision, setComision] = useState('10')
  const [guardando, setGuardando] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const invitar = async () => {
    if (!email.trim()) { toast.error('Pon el email'); return }
    setGuardando(true)
    const res = await fetch('/api/gestor/rrpp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: localId, email, nombre, comision_pct: Number(comision) }),
    })
    const d = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(d.error || 'Error'); return }
    if (d.link_invitacion) { setLink(d.link_invitacion); return }
    toast.success('RRPP invitado'); onHecho()
  }

  const copiar = () => { if (link) { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } }

  return (
    <ModalShell titulo="Invitar RRPP por email" onClose={onClose}>
      {link ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 text-green-400"><Check size={26} /></div>
          <p className="text-sm text-[#A0A0B8]">Esta persona aún no está en Tourneum. Envíale este enlace para que acepte:</p>
          <div className="break-all rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs text-[#B8B8CC]">{link}</div>
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={copiar}>{copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar enlace</>}</Button>
            <Button fullWidth onClick={onHecho}>Hecho</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input label="Email del RRPP" type="email" icon={<Mail size={16} />} value={email} onChange={e => setEmail(e.target.value)} placeholder="rrpp@email.com" />
          <Input label="Nombre (opcional)" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Cómo se llama" />
          <Input label="Comisión (%)" type="number" icon={<Percent size={16} />} value={comision} onChange={e => setComision(e.target.value)} />
          <Button fullWidth size="lg" loading={guardando} onClick={invitar}>Enviar invitación</Button>
        </div>
      )}
    </ModalShell>
  )
}

/* ── Modal: dar de alta un RRPP nuevo (crea cuenta + credenciales) ───── */
function AltaRrppModal({ localId, onClose, onHecho }: { localId: string; onClose: () => void; onHecho: () => void }) {
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [comision, setComision] = useState('10')
  const [guardando, setGuardando] = useState(false)
  const [cred, setCred] = useState<{ username: string; password: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const userNorm = normalizarUsername(username)

  const crear = async () => {
    if (!nombre.trim()) { toast.error('Pon el nombre del RRPP'); return }
    if (!esUsernameValido(userNorm)) { toast.error('Usuario no válido: 3-30 caracteres (letras, números, . _ -)'); return }
    setGuardando(true)
    const res = await fetch('/api/gestor/rrpp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: localId, crear_cuenta: true, nombre, username: userNorm, email: email.trim().toLowerCase() || undefined, comision_pct: Number(comision) }),
    })
    const d = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(d.error || 'No se pudo crear'); return }
    toast.success('RRPP creado')
    if (d.credenciales) setCred(d.credenciales)
    else onHecho()
  }

  const copiar = () => {
    if (!cred) return
    navigator.clipboard.writeText(`Acceso RRPP Tourneum\nUsuario: ${cred.username}\nContraseña: ${cred.password}\nEntra en: ${location.origin}/rrpp/login`)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <ModalShell titulo="Dar de alta un RRPP" onClose={onClose}>
      {cred ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15 text-green-400"><Check size={26} /></div>
          <p className="text-sm text-[#A0A0B8]">Entrega estas credenciales al RRPP. Cambiará la contraseña y configurará su authenticator en el primer acceso.</p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-white">
            <div className="flex items-center gap-2"><AtSign size={14} className="text-[#9B82FF]" /> {cred.username}</div>
            <div className="mt-2 font-mono">{cred.password}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={copiar}>{copiado ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar acceso</>}</Button>
            <Button fullWidth onClick={onHecho}>Hecho</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input label="Nombre del RRPP" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre público" />
          <Input label="Nombre de usuario" icon={<AtSign size={16} />} value={username} onChange={e => setUsername(e.target.value)} placeholder="leo.noches"
            hint={username && esUsernameValido(userNorm) ? `Entrará con: ${userNorm}` : 'Con el que iniciará sesión'} />
          <Input label="Email de contacto (opcional)" type="email" icon={<Mail size={16} />} value={email} onChange={e => setEmail(e.target.value)} placeholder="rrpp@email.com" />
          <Input label="Comisión (%)" type="number" icon={<Percent size={16} />} value={comision} onChange={e => setComision(e.target.value)} hint="Queda vinculado y activo en este local con esta comisión." />
          <Button fullWidth size="lg" loading={guardando} onClick={crear}>Crear RRPP</Button>
        </div>
      )}
    </ModalShell>
  )
}

function ModalShell({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card-premium max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white text-display">{titulo}</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
