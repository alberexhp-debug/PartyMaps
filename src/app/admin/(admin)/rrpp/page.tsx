'use client'
import { useEffect, useState } from 'react'
import { Sparkles, UserPlus, Search, Copy, Check, ShieldOff, Shield, EyeOff, Eye, ExternalLink, Mail, KeyRound, RotateCcw } from 'lucide-react'
import { CredencialesModal } from '@/components/local-panel/CredencialesModal'
import { normalizarUsername, esUsernameValido } from '@/lib/equipo'

type Usuario = { id: string; nombre: string; telefono: string | null; foto_perfil_url: string | null }
type RRPP = {
  id: string; slug: string; nombre_publico: string; foto_url: string | null;
  username: string | null;
  bio: string | null; instagram: string | null; tiktok: string | null;
  activo: boolean; visible_en_busqueda: boolean;
  estado_alta: 'invitado' | 'completo';
  invitado_por_local_id: string | null;
  invitado_por_admin_id: string | null;
  invitado_at: string | null;
  completado_at: string | null;
  created_at: string;
  num_venues_activos: number;
  usuarios: Usuario | null;
}

type Invitacion = {
  id: string; email: string; nombre: string | null; estado: string;
  token: string; expira_at: string; created_at: string;
  comision_pct_sugerida: number | null;
  invitado_por_local_id: string | null; invitado_por_admin_id: string | null;
  locales: { id: string; nombre: string } | null;
}

export default function AdminRRPP() {
  const [tab, setTab] = useState<'rrpps' | 'invitaciones'>('rrpps')
  const [q, setQ] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'invitado' | 'completo'>('todos')
  const [rrpps, setRrpps] = useState<RRPP[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [showCrear, setShowCrear] = useState(false)
  const [credReset, setCredReset] = useState<{ username: string; password: string } | null>(null)

  useEffect(() => { void cargar() }, [q, filtroEstado])

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim().length >= 2) params.set('q', q.trim())
    if (filtroEstado !== 'todos') params.set('estado_alta', filtroEstado)
    const [r1, r2] = await Promise.all([
      fetch(`/api/admin/rrpp?${params}`, { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/rrpp/invitaciones', { credentials: 'include' }).then(r => r.json()),
    ])
    setRrpps(r1.rrpps ?? [])
    setInvitaciones(r2.invitaciones ?? [])
    setLoading(false)
  }

  async function toggleActivo(r: RRPP) {
    await fetch(`/api/admin/rrpp/${r.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !r.activo }),
    })
    void cargar()
  }
  async function toggleVisibilidad(r: RRPP) {
    await fetch(`/api/admin/rrpp/${r.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_en_busqueda: !r.visible_en_busqueda }),
    })
    void cargar()
  }

  async function resetPassword(r: RRPP) {
    if (!confirm(`¿Generar una nueva contraseña por defecto para ${r.nombre_publico}? La actual dejará de funcionar.`)) return
    const res = await fetch('/api/admin/rrpp/reset-password', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rrpp_id: r.id }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { alert(j.error || 'No se pudo resetear'); return }
    if (j.credenciales) setCredReset(j.credenciales)
  }
  async function resetTotp(r: RRPP) {
    if (!confirm(`¿Reiniciar el authenticator de ${r.nombre_publico}? En su próximo acceso volverá a configurarlo.`)) return
    const res = await fetch('/api/admin/rrpp/reset-totp', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rrpp_id: r.id }),
    })
    if (!res.ok) { alert('No se pudo reiniciar'); return }
    void cargar()
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#4F8EF7]" /> Organizadores del sistema
          </h1>
          <p className="text-[#A0A0B8] mt-1 text-sm">
            Supervisa a los organizadores (TOs), da de alta nuevos y emite invitaciones.
          </p>
        </div>
        <button onClick={() => setShowCrear(true)}
          className="px-3 py-2 rounded-xl bg-[#4F8EF7] text-white text-sm font-semibold inline-flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" /> Dar de alta
        </button>
      </header>

      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        <button onClick={() => setTab('rrpps')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'rrpps' ? 'bg-[#4F8EF7]/20 text-white' : 'text-[#A0A0B8]'}`}>
          RRPPs ({rrpps.length})
        </button>
        <button onClick={() => setTab('invitaciones')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'invitaciones' ? 'bg-[#4F8EF7]/20 text-white' : 'text-[#A0A0B8]'}`}>
          Invitaciones ({invitaciones.length})
        </button>
      </div>

      {tab === 'rrpps' && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B85]" />
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar por slug, nombre o Instagram"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[#6B6B85]" />
            </div>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as 'todos' | 'invitado' | 'completo')}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
              <option value="todos">Todos los estados</option>
              <option value="invitado">Solo invitados (sin completar)</option>
              <option value="completo">Solo completos</option>
            </select>
          </div>

          {loading ? (
            <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          ) : rrpps.length === 0 ? (
            <p className="text-[#6B6B85] text-sm text-center py-8">No hay RRPPs con esos filtros.</p>
          ) : (
            <ul className="space-y-2">
              {rrpps.map(r => (
                <li key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
                  {r.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.foto_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#4F8EF7]/20 flex items-center justify-center text-white font-bold">
                      {r.nombre_publico.slice(0, 1)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{r.nombre_publico}</p>
                      {r.estado_alta === 'invitado' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300">sin completar</span>
                      )}
                      {!r.activo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-400/15 text-rose-300">suspendido</span>
                      )}
                      {!r.visible_en_busqueda && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-[#A0A0B8]">oculto</span>
                      )}
                    </div>
                    <p className="text-xs text-[#A0A0B8] truncate">
                      {r.estado_alta === 'completo' && <span className="mr-2">@{r.slug}</span>}
                      {r.num_venues_activos} venue{r.num_venues_activos === 1 ? '' : 's'} activos
                      {r.invitado_por_admin_id && <span className="ml-2">· alta admin</span>}
                      {r.invitado_por_local_id && <span className="ml-2">· alta local</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.estado_alta === 'completo' && (
                      <a href={`/r/${r.slug}`} target="_blank" rel="noreferrer"
                        className="p-2 rounded-lg hover:bg-white/5 text-[#A0A0B8]" title="Ver página pública">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => toggleVisibilidad(r)}
                      className="p-2 rounded-lg hover:bg-white/5 text-[#A0A0B8]"
                      title={r.visible_en_busqueda ? 'Ocultar del buscador' : 'Mostrar en buscador'}>
                      {r.visible_en_busqueda ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => toggleActivo(r)}
                      className={`p-2 rounded-lg hover:bg-white/5 ${r.activo ? 'text-emerald-400' : 'text-rose-400'}`}
                      title={r.activo ? 'Suspender' : 'Reactivar'}>
                      {r.activo ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                    </button>
                    {r.username && (
                      <>
                        <button onClick={() => resetPassword(r)} className="p-2 rounded-lg hover:bg-white/5 text-[#A0A0B8]" title="Resetear contraseña">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => resetTotp(r)} className="p-2 rounded-lg hover:bg-white/5 text-[#A0A0B8]" title="Reiniciar authenticator">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'invitaciones' && (
        <InvitacionesList invitaciones={invitaciones} loading={loading} />
      )}

      {showCrear && (
        <ModalCrear onClose={() => setShowCrear(false)} onCreado={() => { setShowCrear(false); void cargar() }} />
      )}
      {credReset && (
        <CredencialesModal titulo="Nueva contraseña del RRPP" username={credReset.username} password={credReset.password} onClose={() => setCredReset(null)} />
      )}
    </div>
  )
}

function InvitacionesList({ invitaciones, loading }: { invitaciones: Invitacion[]; loading: boolean }) {
  const [copiado, setCopiado] = useState<string | null>(null)
  async function copiar(token: string) {
    await navigator.clipboard.writeText(`${location.origin}/r/invitacion/${token}`)
    setCopiado(token)
    setTimeout(() => setCopiado(null), 1500)
  }
  if (loading) return <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
  if (invitaciones.length === 0) {
    return <p className="text-[#6B6B85] text-sm text-center py-8">No hay invitaciones.</p>
  }
  return (
    <ul className="space-y-2">
      {invitaciones.map(inv => (
        <li key={inv.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 flex items-center gap-3">
          <Mail className={`w-5 h-5 ${inv.estado === 'aceptada' ? 'text-emerald-400' : 'text-amber-400'} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{inv.nombre || inv.email}</p>
            <p className="text-xs text-[#A0A0B8] truncate">
              {inv.email} · {inv.estado}
              {inv.locales && <span className="ml-2">· para {inv.locales.nombre}</span>}
              {!inv.locales && inv.invitado_por_admin_id && <span className="ml-2">· free agent</span>}
              <span className="ml-2">· expira {new Date(inv.expira_at).toLocaleDateString('es-ES')}</span>
            </p>
          </div>
          {inv.estado === 'pendiente' && (
            <button onClick={() => copiar(inv.token)}
              className="px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs text-[#A0A0B8] inline-flex items-center gap-1 shrink-0">
              {copiado === inv.token ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado === inv.token ? 'Copiado' : 'Copiar link'}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function ModalCrear({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [cred, setCred] = useState<{ username: string; password: string } | null>(null)
  const userNorm = normalizarUsername(username)

  async function crear() {
    if (!nombre.trim()) { setError('Pon el nombre'); return }
    if (!esUsernameValido(userNorm)) { setError('Usuario no válido: 3-30 caracteres (letras, números, . _ -)'); return }
    setError(null); setEnviando(true)
    const r = await fetch('/api/admin/rrpp', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crear_cuenta: true, nombre: nombre.trim(), username: userNorm,
        email_contacto: email.trim().toLowerCase() || undefined,
      }),
    })
    const j = await r.json()
    setEnviando(false)
    if (!r.ok) { setError(j.error || 'Error'); return }
    if (j.credenciales) setCred(j.credenciales)
  }

  if (cred) return <CredencialesModal titulo="Acceso del RRPP" username={cred.username} password={cred.password} onClose={onCreado} />

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0D0D1A] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Dar de alta RRPP (free agent)</h3>
          <button onClick={onClose} className="text-xs text-[#A0A0B8] hover:text-white">Cerrar</button>
        </div>
        <p className="text-xs text-[#6B6B85]">
          El RRPP nace sin local asociado. Entrará con usuario + contraseña y configurará su authenticator en
          el primer acceso. Cuando un venue lo invite, empezará a trabajar.
        </p>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[#A0A0B8] font-semibold">Nombre *</span>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Leo García"
            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[#6B6B85]" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[#A0A0B8] font-semibold">Nombre de usuario *</span>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="leo.noches" autoComplete="off"
            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[#6B6B85]" />
          {username && (
            <p className={`mt-1 text-xs ${esUsernameValido(userNorm) ? 'text-[#6B6B85]' : 'text-amber-300'}`}>
              {esUsernameValido(userNorm) ? <>Usuario: <span className="font-mono text-white">{userNorm}</span></> : '3-30 caracteres: letras, números, . _ -'}
            </p>
          )}
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[#A0A0B8] font-semibold">Email de contacto (opcional)</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="leo@example.com"
            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[#6B6B85]" />
        </label>
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        <button onClick={crear} disabled={!nombre || !username || enviando}
          className="w-full py-2.5 rounded-xl bg-[#4F8EF7] text-white font-semibold text-sm disabled:opacity-50">
          {enviando ? 'Creando...' : 'Dar de alta RRPP'}
        </button>
      </div>
    </div>
  )
}
