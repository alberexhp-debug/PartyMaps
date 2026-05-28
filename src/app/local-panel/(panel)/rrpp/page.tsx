'use client'
import { useEffect, useState } from 'react'
import { Sparkles, UserPlus, Pause, Play, Archive, ExternalLink, Search, Mail, Copy, Check } from 'lucide-react'

// Tipos relajados para no atar a la forma exacta del join del endpoint
type Relacion = {
  id: string
  rrpp_id: string
  comision_pct: number
  tope_por_venta: number | null
  estado: 'pendiente' | 'activa' | 'pausada' | 'archivada'
  triggers_activos: Record<string, boolean>
  rrpp: {
    id: string; slug: string; nombre_publico: string; foto_url: string | null;
    bio: string | null; instagram: string | null; tiktok: string | null;
    estado_alta: 'invitado' | 'completo';
  }
}

type Invitacion = {
  id: string; email: string; nombre: string | null; telefono: string | null;
  token: string; estado: string; expira_at: string; created_at: string;
}

export default function RRPPPanelLocal() {
  const [relaciones, setRelaciones] = useState<Relacion[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvitar, setShowInvitar] = useState(false)

  useEffect(() => { void cargar() }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/local-panel/rrpp', { credentials: 'include' })
    const j = await r.json()
    setRelaciones(j.relaciones ?? [])
    setInvitaciones(j.invitaciones ?? [])
    setLoading(false)
  }

  async function cambiarEstado(id: string, estado: Relacion['estado']) {
    await fetch(`/api/local-panel/rrpp/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    void cargar()
  }
  async function archivar(id: string) {
    if (!confirm('¿Archivar esta relación? El histórico se conserva.')) return
    await fetch(`/api/local-panel/rrpp/${id}`, { method: 'DELETE', credentials: 'include' })
    void cargar()
  }

  const activos = relaciones.filter(r => r.estado === 'activa')
  const pendientes = relaciones.filter(r => r.estado === 'pendiente')
  const pausados = relaciones.filter(r => r.estado === 'pausada')

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display text-3xl sm:text-4xl flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-rose-400" /> RRPP del local
          </h1>
          <p className="text-secondary mt-1 text-sm">
            Tu equipo de promotores. Busca alguien existente o crea una invitación nueva.
          </p>
        </div>
        <button onClick={() => setShowInvitar(true)} className="btn-primary inline-flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" /> Añadir RRPP
        </button>
      </header>

      {loading ? (
        <div className="skeleton h-32 rounded-2xl" />
      ) : (
        <>
          <Grupo titulo={`Activos (${activos.length})`} relaciones={activos}
            onPausar={(id) => cambiarEstado(id, 'pausada')}
            onArchivar={archivar} />
          {pendientes.length > 0 && (
            <Grupo titulo={`Pendientes de aceptación (${pendientes.length})`} relaciones={pendientes}
              onArchivar={archivar} />
          )}
          {pausados.length > 0 && (
            <Grupo titulo={`Pausados (${pausados.length})`} relaciones={pausados}
              onReanudar={(id) => cambiarEstado(id, 'activa')}
              onArchivar={archivar} />
          )}
          {invitaciones.length > 0 && (
            <InvitacionesPendientes invitaciones={invitaciones} />
          )}
          {relaciones.length === 0 && invitaciones.length === 0 && (
            <div className="card-premium p-8 text-center">
              <Sparkles className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-display text-xl mb-1">Aún no tienes RRPPs</p>
              <p className="text-secondary text-sm">
                Pulsa <strong>Añadir RRPP</strong>: busca a alguien ya en PartyMaps
                o crea una invitación con su email para mandar por WhatsApp.
              </p>
            </div>
          )}
        </>
      )}

      {showInvitar && (
        <ModalAnadir onClose={() => setShowInvitar(false)} onCreado={() => { setShowInvitar(false); void cargar() }} />
      )}
    </div>
  )
}

function Grupo({
  titulo, relaciones, onPausar, onReanudar, onArchivar,
}: {
  titulo: string; relaciones: Relacion[];
  onPausar?: (id: string) => void; onReanudar?: (id: string) => void; onArchivar?: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="eyebrow eyebrow-rose mb-3">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {relaciones.map(r => (
          <div key={r.id} className="card-premium p-4 flex gap-3">
            {r.rrpp.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.rrpp.foto_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-rose-400/20 flex items-center justify-center text-display">
                {r.rrpp.nombre_publico.slice(0, 1)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-display text-lg leading-tight truncate">
                    {r.rrpp.nombre_publico}
                    {r.rrpp.estado_alta === 'invitado' && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 align-middle">
                        sin completar
                      </span>
                    )}
                  </p>
                  {r.rrpp.estado_alta === 'completo' && (
                    <a href={`/r/${r.rrpp.slug}`} target="_blank" rel="noreferrer"
                      className="text-secondary text-xs inline-flex items-center gap-1 hover:underline">
                      @{r.rrpp.slug} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-display text-xl">{r.comision_pct}%</div>
                  {r.tope_por_venta && (
                    <div className="text-tertiary text-xs">tope {r.tope_por_venta}€</div>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {r.triggers_activos?.entrada_vendida && <TriggerChip>Entrada</TriggerChip>}
                {r.triggers_activos?.escaneada_en_puerta && <TriggerChip>Puerta</TriggerChip>}
                {r.triggers_activos?.consumo_bar && <TriggerChip>Bar</TriggerChip>}
              </div>
              <div className="mt-2 flex gap-1.5">
                {onReanudar && (
                  <button onClick={() => onReanudar(r.id)} className="btn-ghost text-xs inline-flex items-center gap-1">
                    <Play className="w-3.5 h-3.5" /> Reanudar
                  </button>
                )}
                {onPausar && (
                  <button onClick={() => onPausar(r.id)} className="btn-ghost text-xs inline-flex items-center gap-1">
                    <Pause className="w-3.5 h-3.5" /> Pausar
                  </button>
                )}
                {onArchivar && (
                  <button onClick={() => onArchivar(r.id)} className="btn-ghost text-xs inline-flex items-center gap-1 text-rose-300">
                    <Archive className="w-3.5 h-3.5" /> Archivar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function InvitacionesPendientes({ invitaciones }: { invitaciones: Invitacion[] }) {
  const [copiado, setCopiado] = useState<string | null>(null)
  async function copiarLink(token: string) {
    const link = `${location.origin}/r/invitacion/${token}`
    await navigator.clipboard.writeText(link)
    setCopiado(token)
    setTimeout(() => setCopiado(null), 1500)
  }
  return (
    <section>
      <h2 className="eyebrow eyebrow-rose mb-3">Invitaciones por email pendientes ({invitaciones.length})</h2>
      <div className="space-y-2">
        {invitaciones.map(inv => (
          <div key={inv.id} className="card-premium p-3 flex items-center gap-3">
            <Mail className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-display text-base truncate">{inv.nombre || inv.email}</p>
              <p className="text-tertiary text-xs">{inv.email} · expira {new Date(inv.expira_at).toLocaleDateString('es-ES')}</p>
            </div>
            <button onClick={() => copiarLink(inv.token)} className="btn-ghost text-xs inline-flex items-center gap-1">
              {copiado === inv.token ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado === inv.token ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function TriggerChip({ children }: { children: React.ReactNode }) {
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-400/15 text-rose-200">{children}</span>
}

// ════════════════════════════════════════════════════════════════
// Modal "Añadir RRPP" con dos pestañas: Buscar / Crear nuevo
// ════════════════════════════════════════════════════════════════
function ModalAnadir({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [tab, setTab] = useState<'buscar' | 'crear'>('buscar')

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="card-premium w-full max-w-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-display text-2xl">Añadir RRPP</h3>
          <button onClick={onClose} className="btn-ghost text-xs">Cerrar</button>
        </div>
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setTab('buscar')}
            className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${tab === 'buscar' ? 'bg-rose-500/20 text-white' : 'text-secondary'}`}>
            Buscar
          </button>
          <button
            onClick={() => setTab('crear')}
            className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${tab === 'crear' ? 'bg-rose-500/20 text-white' : 'text-secondary'}`}>
            Crear nuevo
          </button>
        </div>
        {tab === 'buscar' ? <TabBuscar onCreado={onCreado} /> : <TabCrear onCreado={onCreado} />}
      </div>
    </div>
  )
}

type ResultadoBusqueda = {
  id: string; slug: string; nombre_publico: string;
  foto_url: string | null; bio: string | null; instagram: string | null; tiktok: string | null;
}

function TabBuscar({ onCreado }: { onCreado: () => void }) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [seleccionado, setSeleccionado] = useState<ResultadoBusqueda | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [comision, setComision] = useState(10)
  const [tope, setTope] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResultados([]); return }
    const ctrl = new AbortController()
    const tid = setTimeout(async () => {
      setBuscando(true)
      try {
        const r = await fetch(`/api/local-panel/rrpp/buscar?q=${encodeURIComponent(q.trim())}`, {
          credentials: 'include', signal: ctrl.signal,
        })
        const j = await r.json()
        setResultados(j.rrpps ?? [])
      } catch { /* abort */ } finally { setBuscando(false) }
    }, 250)
    return () => { clearTimeout(tid); ctrl.abort() }
  }, [q])

  async function invitar() {
    if (!seleccionado) return
    setError(null); setSending(true)
    const r = await fetch('/api/local-panel/rrpp', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rrpp_id: seleccionado.id,
        comision_pct: comision,
        tope_por_venta: tope === '' ? null : tope,
      }),
    })
    const j = await r.json()
    setSending(false)
    if (!r.ok) { setError(j.error || 'Error'); return }
    onCreado()
  }

  if (seleccionado) {
    return (
      <div className="space-y-3">
        <button onClick={() => setSeleccionado(null)} className="btn-ghost text-xs">← Volver a buscar</button>
        <div className="card-premium p-3 flex items-center gap-3">
          {seleccionado.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={seleccionado.foto_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-rose-400/20 flex items-center justify-center">
              {seleccionado.nombre_publico.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-display text-base">{seleccionado.nombre_publico}</p>
            <p className="text-tertiary text-xs">@{seleccionado.slug}</p>
          </div>
        </div>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Comisión (%)</span>
          <input type="number" step="0.5" min="0" max="100"
            value={comision} onChange={e => setComision(parseFloat(e.target.value) || 0)}
            className="input mt-1 w-full" />
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Tope por venta (€, opcional)</span>
          <input type="number" step="0.5" min="0"
            value={tope} onChange={e => setTope(e.target.value === '' ? '' : parseFloat(e.target.value))}
            placeholder="sin tope" className="input mt-1 w-full" />
        </label>
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        <button onClick={invitar} disabled={sending} className="btn-primary w-full">
          {sending ? 'Invitando...' : 'Enviar invitación'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Buscar por slug, nombre o Instagram</span>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="leo, @leonoches, leo-noches..."
            className="input pl-9 w-full" />
        </div>
      </label>
      {q.trim().length < 2 ? (
        <p className="text-tertiary text-xs">Escribe al menos 2 caracteres.</p>
      ) : buscando ? (
        <p className="text-tertiary text-xs">Buscando...</p>
      ) : resultados.length === 0 ? (
        <p className="text-tertiary text-xs">No hay coincidencias. Prueba la pestaña <strong>Crear nuevo</strong>.</p>
      ) : (
        <ul className="space-y-1.5 max-h-64 overflow-y-auto">
          {resultados.map(r => (
            <li key={r.id}>
              <button onClick={() => setSeleccionado(r)}
                className="w-full card-premium p-2.5 flex items-center gap-3 text-left hover:bg-white/[0.04]">
                {r.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-rose-400/20 flex items-center justify-center text-sm">
                    {r.nombre_publico.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-display text-sm truncate">{r.nombre_publico}</p>
                  <p className="text-tertiary text-xs">@{r.slug}{r.instagram ? ` · IG @${r.instagram}` : ''}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TabCrear({ onCreado }: { onCreado: () => void }) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [comision, setComision] = useState(10)
  const [tope, setTope] = useState<number | ''>('')
  const [mensaje, setMensaje] = useState('')
  const [linkInvitacion, setLinkInvitacion] = useState<string | null>(null)
  const [via, setVia] = useState<'usuario_existente' | 'nuevo_lead' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function enviar() {
    setError(null); setSending(true); setLinkInvitacion(null)
    const r = await fetch('/api/local-panel/rrpp', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        nombre: nombre.trim() || undefined,
        telefono: telefono.trim() || undefined,
        comision_pct: comision,
        tope_por_venta: tope === '' ? null : tope,
        mensaje: mensaje.trim() || undefined,
      }),
    })
    const j = await r.json()
    setSending(false)
    if (!r.ok) { setError(j.error || 'Error'); return }
    setVia(j.via ?? null)
    if (j.link_invitacion) setLinkInvitacion(j.link_invitacion)
    if (!j.link_invitacion) onCreado()  // si era usuario existente, ya está
  }

  async function copiarLink() {
    if (!linkInvitacion) return
    await navigator.clipboard.writeText(linkInvitacion)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  if (linkInvitacion) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          Invitación creada para <strong>{email}</strong>. Comparte este link por WhatsApp:
        </p>
        <div className="card-premium p-3 flex items-center gap-2">
          <code className="text-xs text-secondary break-all flex-1">{linkInvitacion}</code>
          <button onClick={copiarLink} className="btn-ghost text-xs inline-flex items-center gap-1 shrink-0">
            {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <p className="text-tertiary text-xs">
          Expira en 30 días. Cuando la persona lo acepte aparecerá automáticamente en tu lista.
        </p>
        <button onClick={onCreado} className="btn-primary w-full">Listo</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Email *</span>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="leo@example.com" className="input mt-1 w-full" />
      </label>
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Nombre</span>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Leo García" className="input mt-1 w-full" />
      </label>
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Teléfono (opcional)</span>
        <input value={telefono} onChange={e => setTelefono(e.target.value)}
          placeholder="+34 666 ..." className="input mt-1 w-full" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Comisión %</span>
          <input type="number" step="0.5" min="0" max="100"
            value={comision} onChange={e => setComision(parseFloat(e.target.value) || 0)}
            className="input mt-1 w-full" />
        </label>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Tope €</span>
          <input type="number" step="0.5" min="0"
            value={tope} onChange={e => setTope(e.target.value === '' ? '' : parseFloat(e.target.value))}
            placeholder="sin tope" className="input mt-1 w-full" />
        </label>
      </div>
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Mensaje (opcional)</span>
        <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={2}
          placeholder="Hola Leo, te invito a llevar nuestras fiestas..."
          className="input mt-1 w-full" />
      </label>
      {error && <p className="text-rose-300 text-sm">{error}</p>}
      <button onClick={enviar} disabled={!email || sending} className="btn-primary w-full">
        {sending ? 'Procesando...' : 'Crear invitación'}
      </button>
      {via === 'usuario_existente' && (
        <p className="text-emerald-300 text-xs">Esta persona ya está en PartyMaps. Le ha llegado la invitación a su panel.</p>
      )}
    </div>
  )
}
