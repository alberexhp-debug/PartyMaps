'use client'
import { useEffect, useState } from 'react'
import { Sparkles, UserPlus, Pause, Play, Archive, ExternalLink } from 'lucide-react'

// Tipos relajados aquí: vienen del endpoint con joins. Eviten cargar el de
// tipos estricto para no atar la UI a una forma exacta cambiante.
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
  }
}

export default function RRPPPanelLocal() {
  const [relaciones, setRelaciones] = useState<Relacion[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvitar, setShowInvitar] = useState(false)

  useEffect(() => { void cargar() }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/local-panel/rrpp', { credentials: 'include' })
    const j = await r.json()
    setRelaciones(j.relaciones ?? [])
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
            Gestiona quién promociona tu local y cuánto cobra por venta atribuida.
          </p>
        </div>
        <button
          onClick={() => setShowInvitar(true)}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" /> Invitar RRPP
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
          {relaciones.length === 0 && (
            <div className="card-premium p-8 text-center">
              <Sparkles className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-display text-xl mb-1">Aún no tienes RRPPs</p>
              <p className="text-secondary text-sm">
                Invita a alguien por su slug (<code>partymaps.com/r/&lt;slug&gt;</code>) y empezad a colaborar.
              </p>
            </div>
          )}
        </>
      )}

      {showInvitar && (
        <ModalInvitar onClose={() => setShowInvitar(false)} onCreado={() => { setShowInvitar(false); void cargar() }} />
      )}
    </div>
  )
}

function Grupo({
  titulo, relaciones, onPausar, onReanudar, onArchivar,
}: {
  titulo: string
  relaciones: Relacion[]
  onPausar?: (id: string) => void
  onReanudar?: (id: string) => void
  onArchivar?: (id: string) => void
}) {
  return (
    <section>
      <h2 className="eyebrow eyebrow-rose mb-3">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {relaciones.map(r => (
          <div key={r.id} className="card-premium p-4 flex gap-3">
            {r.rrpp.foto_url ? (
              <img src={r.rrpp.foto_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-rose-400/20 flex items-center justify-center text-display">
                {r.rrpp.nombre_publico.slice(0, 1)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-display text-lg leading-tight">{r.rrpp.nombre_publico}</p>
                  <a href={`/r/${r.rrpp.slug}`} target="_blank" rel="noreferrer"
                    className="text-secondary text-xs inline-flex items-center gap-1 hover:underline">
                    @{r.rrpp.slug} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-right">
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

function TriggerChip({ children }: { children: React.ReactNode }) {
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-400/15 text-rose-200">{children}</span>
}

function ModalInvitar({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const [slug, setSlug] = useState('')
  const [comision, setComision] = useState(10)
  const [tope, setTope] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function enviar() {
    setError(null); setSending(true)
    const r = await fetch('/api/local-panel/rrpp', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rrpp_slug: slug.trim().toLowerCase(),
        comision_pct: comision,
        tope_por_venta: tope === '' ? null : tope,
      }),
    })
    const j = await r.json()
    setSending(false)
    if (!r.ok) { setError(j.error || 'Error'); return }
    onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="card-premium w-full max-w-md p-5 space-y-4">
        <h3 className="text-display text-2xl">Invitar a un RRPP</h3>
        <p className="text-secondary text-sm">
          Introduce el slug del RRPP (lo encuentras en su página, ej. <code>leo-noches</code>).
        </p>
        <label className="block">
          <span className="text-xs eyebrow eyebrow-rose">Slug del RRPP</span>
          <input value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="leo-noches"
            className="input mt-1 w-full" />
        </label>
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
            placeholder="sin tope"
            className="input mt-1 w-full" />
        </label>
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={enviar} disabled={!slug || sending} className="btn-primary">
            {sending ? 'Invitando...' : 'Enviar invitación'}
          </button>
        </div>
      </div>
    </div>
  )
}
