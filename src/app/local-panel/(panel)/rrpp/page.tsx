'use client'
import { useEffect, useState } from 'react'
import { Sparkles, UserPlus, Pause, Play, Archive, ExternalLink, Search, Mail, Copy, Check, MessageCircle, Percent, Handshake, X, KeyRound, RotateCcw } from 'lucide-react'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { PagosRRPP } from '@/components/local-panel/PagosRRPP'
import { CredencialesModal } from '@/components/local-panel/CredencialesModal'
import { CATEGORIAS_DESCUENTO, LABEL_CATEGORIA, type CategoriaDescuento } from '@/lib/rrppCodigos'
import { normalizarUsername, esUsernameValido } from '@/lib/equipo'

// Tipos relajados para no atar a la forma exacta del join del endpoint
type Relacion = {
  id: string
  rrpp_id: string
  comision_pct: number
  tope_por_venta: number | null
  estado: 'pendiente' | 'activa' | 'pausada' | 'archivada'
  triggers_activos: Record<string, boolean>
  descuentos?: Record<string, number> | null
  rrpp: {
    id: string; slug: string; nombre_publico: string; foto_url: string | null;
    bio: string | null; instagram: string | null; tiktok: string | null;
    estado_alta: 'invitado' | 'completo';
    username?: string | null;
  }
}

type Solicitud = {
  id: string; rrpp_id: string; mensaje: string | null; created_at: string;
  rrpp: { id: string; slug: string; nombre_publico: string; foto_url: string | null; instagram: string | null; bio: string | null };
}

type Invitacion = {
  id: string; email: string; nombre: string | null; telefono: string | null;
  token: string; estado: string; expira_at: string; created_at: string;
}

export default function RRPPPanelLocal() {
  const [relaciones, setRelaciones] = useState<Relacion[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvitar, setShowInvitar] = useState(false)
  const [chatCon, setChatCon] = useState<{ id: string; nombre_publico: string; slug: string } | null>(null)
  const [editarDescuentos, setEditarDescuentos] = useState<Relacion | null>(null)
  const [credReset, setCredReset] = useState<{ username: string; password: string } | null>(null)

  useEffect(() => { void cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [r, s] = await Promise.all([
      fetch('/api/local-panel/rrpp', { credentials: 'include' }),
      fetch('/api/local-panel/rrpp/solicitudes', { credentials: 'include' }),
    ])
    const j = await r.json()
    setRelaciones(j.relaciones ?? [])
    setInvitaciones(j.invitaciones ?? [])
    const js = await s.json().catch(() => ({}))
    setSolicitudes(js.solicitudes ?? [])
    setLoading(false)
  }

  async function responderSolicitud(id: string, accion: 'aceptar' | 'rechazar', comision_pct?: number) {
    await fetch('/api/local-panel/rrpp/solicitudes', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion, comision_pct }),
    })
    void cargar()
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
  async function resetPassRrpp(rrppId: string) {
    if (!confirm('¿Generar una nueva contraseña por defecto para este RRPP? La actual dejará de servir.')) return
    const r = await fetch('/api/local-panel/rrpp/reset-password', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rrpp_id: rrppId }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { alert(j.error || 'No se pudo resetear'); return }
    if (j.credenciales) setCredReset(j.credenciales)
  }
  async function resetTotpRrpp(rrppId: string) {
    if (!confirm('¿Reiniciar el authenticator de este RRPP? En su próximo acceso lo reconfigurará.')) return
    const r = await fetch('/api/local-panel/rrpp/reset-totp', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rrpp_id: rrppId }) })
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || 'No se pudo'); return }
    alert('Authenticator reiniciado')
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
            Tus organizadores (TOs). Busca alguien existente o crea una invitación nueva.
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
          {solicitudes.length > 0 && (
            <SolicitudesInteres solicitudes={solicitudes} onResponder={responderSolicitud} />
          )}
          <Grupo titulo={`Activos (${activos.length})`} relaciones={activos}
            onPausar={(id) => cambiarEstado(id, 'pausada')}
            onArchivar={archivar} onChat={setChatCon} onDescuentos={setEditarDescuentos}
            onResetPass={resetPassRrpp} onResetTotp={resetTotpRrpp} />
          {pendientes.length > 0 && (
            <Grupo titulo={`Pendientes de aceptación (${pendientes.length})`} relaciones={pendientes}
              onArchivar={archivar} onChat={setChatCon}
              onResetPass={resetPassRrpp} onResetTotp={resetTotpRrpp} />
          )}
          {pausados.length > 0 && (
            <Grupo titulo={`Pausados (${pausados.length})`} relaciones={pausados}
              onReanudar={(id) => cambiarEstado(id, 'activa')}
              onArchivar={archivar} onChat={setChatCon}
              onResetPass={resetPassRrpp} onResetTotp={resetTotpRrpp} />
          )}
          {invitaciones.length > 0 && (
            <InvitacionesPendientes invitaciones={invitaciones} />
          )}

          {/* Pagos a RRPP (liquidaciones por mes; marcar pagado) */}
          <PagosRRPP />

          {relaciones.length === 0 && invitaciones.length === 0 && (
            <div className="card-premium p-8 text-center">
              <Sparkles className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-display text-xl mb-1">Aún no tienes RRPPs</p>
              <p className="text-secondary text-sm">
                Pulsa <strong>Añadir RRPP</strong>: busca a alguien ya en TODH
                o crea una invitación con su email para mandar por WhatsApp.
              </p>
            </div>
          )}
        </>
      )}

      {showInvitar && (
        <ModalAnadir
          onClose={() => setShowInvitar(false)}
          onCreado={() => { setShowInvitar(false); void cargar() }}
          onContactar={(r) => { setShowInvitar(false); setChatCon(r) }}
        />
      )}

      {chatCon && (
        <ChatRrpp
          titulo={chatCon.nombre_publico}
          subtitulo={`@${chatCon.slug}`}
          getUrl={`/api/local-panel/rrpp/chat?rrpp_id=${chatCon.id}`}
          postUrl="/api/local-panel/rrpp/chat"
          postBody={{ rrpp_id: chatCon.id }}
          yo="local"
          onClose={() => setChatCon(null)}
        />
      )}

      {editarDescuentos && (
        <DescuentosModal relacion={editarDescuentos}
          onClose={() => setEditarDescuentos(null)}
          onGuardado={() => { setEditarDescuentos(null); void cargar() }} />
      )}

      {credReset && (
        <CredencialesModal titulo="Nueva contraseña del RRPP" username={credReset.username} password={credReset.password} onClose={() => setCredReset(null)} />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Solicitudes de RRPP interesados (desde el mapa de descubrimiento)
// ════════════════════════════════════════════════════════════════
function SolicitudesInteres({ solicitudes, onResponder }: {
  solicitudes: Solicitud[]; onResponder: (id: string, accion: 'aceptar' | 'rechazar', comision_pct?: number) => void
}) {
  return (
    <section>
      <h2 className="eyebrow eyebrow-rose mb-3 flex items-center gap-1.5">
        <Handshake className="w-4 h-4" /> RRPP interesados en trabajar contigo ({solicitudes.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {solicitudes.map(s => (
          <div key={s.id} className="card-premium p-4">
            <div className="flex items-center gap-3">
              {s.rrpp.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.rrpp.foto_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-rose-400/20 flex items-center justify-center text-display">{s.rrpp.nombre_publico.slice(0, 1)}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-display text-base truncate">{s.rrpp.nombre_publico}</p>
                <a href={`/r/${s.rrpp.slug}`} target="_blank" rel="noreferrer" className="text-tertiary text-xs inline-flex items-center gap-1 hover:underline">
                  @{s.rrpp.slug} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            {s.mensaje && <p className="text-secondary text-sm mt-2 line-clamp-2">{s.mensaje}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => onResponder(s.id, 'aceptar', 10)} className="btn-primary flex-1 text-sm inline-flex items-center justify-center gap-1">
                <Check className="w-4 h-4" /> Aceptar (10%)
              </button>
              <button onClick={() => onResponder(s.id, 'rechazar')} className="btn-ghost text-sm inline-flex items-center gap-1">
                <X className="w-4 h-4" /> Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// Modal: descuentos por RRPP por categoría (inscripción/bono)
// ════════════════════════════════════════════════════════════════
function DescuentosModal({ relacion, onClose, onGuardado }: {
  relacion: Relacion; onClose: () => void; onGuardado: () => void
}) {
  const [vals, setVals] = useState<Record<string, number>>(() => {
    const d = relacion.descuentos ?? {}
    return Object.fromEntries(CATEGORIAS_DESCUENTO.map(c => [c, Number(d[c]) || 0]))
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setGuardando(true); setError(null)
    const r = await fetch(`/api/local-panel/rrpp/${relacion.id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descuentos: vals }),
    })
    setGuardando(false)
    if (!r.ok) { const j = await r.json().catch(() => ({})); setError(j.error || 'No se pudo guardar (¿migración 030 aplicada?)'); return }
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-display text-xl">Descuentos para {relacion.rrpp.nombre_publico}</h3>
            <p className="text-tertiary text-xs">% que aplicarán los códigos de este RRPP.</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-2.5">
          {(CATEGORIAS_DESCUENTO as CategoriaDescuento[]).map(c => (
            <label key={c} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white flex items-center gap-2"><Percent size={13} className="text-[#B6FF3A]" /> {LABEL_CATEGORIA[c]}</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={vals[c] ?? 0}
                  onChange={e => setVals(v => ({ ...v, [c]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                  className="w-20 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-white text-right outline-none focus:border-[#B6FF3A]/60" />
                <span className="text-tertiary text-sm">%</span>
              </div>
            </label>
          ))}
        </div>
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="btn-primary w-full">{guardando ? 'Guardando…' : 'Guardar descuentos'}</button>
      </div>
    </div>
  )
}

function Grupo({
  titulo, relaciones, onPausar, onReanudar, onArchivar, onChat, onDescuentos, onResetPass, onResetTotp,
}: {
  titulo: string; relaciones: Relacion[];
  onPausar?: (id: string) => void; onReanudar?: (id: string) => void; onArchivar?: (id: string) => void;
  onChat?: (r: { id: string; nombre_publico: string; slug: string }) => void;
  onDescuentos?: (r: Relacion) => void;
  onResetPass?: (rrppId: string) => void; onResetTotp?: (rrppId: string) => void;
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
                {r.triggers_activos?.entrada_vendida && <TriggerChip>Inscripción</TriggerChip>}
                {r.triggers_activos?.escaneada_en_puerta && <TriggerChip>Acceso</TriggerChip>}
                {r.triggers_activos?.consumo_bar && <TriggerChip>Bono</TriggerChip>}
              </div>
              <div className="mt-2 flex gap-1.5">
                {onChat && (
                  <button onClick={() => onChat({ id: r.rrpp.id, nombre_publico: r.rrpp.nombre_publico, slug: r.rrpp.slug })}
                    className="btn-ghost text-xs inline-flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </button>
                )}
                {onDescuentos && (
                  <button onClick={() => onDescuentos(r)} className="btn-ghost text-xs inline-flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" /> Descuentos
                  </button>
                )}
                {onResetPass && r.rrpp.username && (
                  <button onClick={() => onResetPass(r.rrpp.id)} className="btn-ghost text-xs inline-flex items-center gap-1" title="Resetear contraseña">
                    <KeyRound className="w-3.5 h-3.5" /> Contraseña
                  </button>
                )}
                {onResetTotp && r.rrpp.username && (
                  <button onClick={() => onResetTotp(r.rrpp.id)} className="btn-ghost text-xs inline-flex items-center gap-1" title="Reiniciar authenticator">
                    <RotateCcw className="w-3.5 h-3.5" /> Authenticator
                  </button>
                )}
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
function ModalAnadir({ onClose, onCreado, onContactar }: { onClose: () => void; onCreado: () => void; onContactar: (r: { id: string; nombre_publico: string; slug: string }) => void }) {
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
        {tab === 'buscar' ? <TabBuscar onCreado={onCreado} onContactar={onContactar} /> : <TabCrear onCreado={onCreado} />}
      </div>
    </div>
  )
}

type ResultadoBusqueda = {
  id: string; slug: string; nombre_publico: string;
  foto_url: string | null; bio: string | null; instagram: string | null; tiktok: string | null;
}

function TabBuscar({ onCreado, onContactar }: { onCreado: () => void; onContactar: (r: { id: string; nombre_publico: string; slug: string }) => void }) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [seleccionado, setSeleccionado] = useState<ResultadoBusqueda | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [comision, setComision] = useState(10)
  const [tope, setTope] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
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
    }, q ? 250 : 0)
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
      {buscando && resultados.length === 0 ? (
        <p className="text-tertiary text-xs">Cargando directorio...</p>
      ) : resultados.length === 0 ? (
        <p className="text-tertiary text-xs">No hay RRPP públicos {q ? 'que coincidan' : 'disponibles'}. Prueba la pestaña <strong>Crear nuevo</strong>.</p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {resultados.map(r => (
            <li key={r.id} className="card-premium p-2.5 flex items-center gap-3">
              {r.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-rose-400/20 flex items-center justify-center text-sm shrink-0">
                  {r.nombre_publico.slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-display text-sm truncate">{r.nombre_publico}</p>
                <p className="text-tertiary text-xs truncate">@{r.slug}{r.instagram ? ` · IG @${r.instagram}` : ''}</p>
              </div>
              <button onClick={() => onContactar({ id: r.id, nombre_publico: r.nombre_publico, slug: r.slug })}
                className="btn-ghost text-xs px-2.5 py-1.5 shrink-0" title="Contactar por chat">
                <MessageCircle className="w-4 h-4" />
              </button>
              <button onClick={() => setSeleccionado(r)} className="btn-primary text-xs px-3 py-1.5 shrink-0">Invitar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TabCrear({ onCreado }: { onCreado: () => void }) {
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [comision, setComision] = useState(10)
  const [tope, setTope] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [cred, setCred] = useState<{ username: string; password: string } | null>(null)
  const userNorm = normalizarUsername(username)

  async function enviar() {
    if (!nombre.trim()) { setError('Pon el nombre del RRPP'); return }
    if (!esUsernameValido(userNorm)) { setError('Usuario no válido: 3-30 caracteres (letras, números, . _ -)'); return }
    setError(null); setSending(true)
    const r = await fetch('/api/local-panel/rrpp', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crear_cuenta: true,
        nombre: nombre.trim(), username: userNorm,
        email_contacto: email.trim().toLowerCase() || undefined,
        comision_pct: comision,
        tope_por_venta: tope === '' ? null : tope,
      }),
    })
    const j = await r.json()
    setSending(false)
    if (!r.ok) { setError(j.error || 'Error'); return }
    if (j.credenciales) setCred(j.credenciales)
  }

  if (cred) {
    return <CredencialesModal titulo="Acceso del RRPP" username={cred.username} password={cred.password} onClose={onCreado} />
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Nombre *</span>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Leo García" className="input mt-1 w-full" />
      </label>
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Nombre de usuario *</span>
        <input value={username} onChange={e => setUsername(e.target.value)}
          placeholder="leo.noches" autoComplete="off" className="input mt-1 w-full" />
        {username && (
          <p className={`mt-1 text-xs ${esUsernameValido(userNorm) ? 'text-tertiary' : 'text-amber-300'}`}>
            {esUsernameValido(userNorm)
              ? <>Entrará con el usuario <span className="font-mono text-white">{userNorm}</span></>
              : 'Usa 3-30 caracteres: letras, números, punto, guion o guion bajo'}
          </p>
        )}
      </label>
      <label className="block">
        <span className="text-xs eyebrow eyebrow-rose">Email de contacto (opcional)</span>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="leo@example.com" className="input mt-1 w-full" />
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
      {error && <p className="text-rose-300 text-sm">{error}</p>}
      <button onClick={enviar} disabled={!nombre || !username || sending} className="btn-primary w-full">
        {sending ? 'Creando...' : 'Dar de alta RRPP'}
      </button>
      <p className="text-tertiary text-xs">
        Se genera una contraseña por defecto. El RRPP la cambiará y configurará su authenticator en el primer acceso.
      </p>
    </div>
  )
}
