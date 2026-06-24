'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RrppNav } from '@/components/rrpp/RrppNav'
import { HeroBanner } from '@/components/local-panel/ui'
import { ClipboardList, Plus, X, Store, Calendar, Users, UserPlus, Check } from 'lucide-react'

type Venue = { local_id: string; estado: string; locales?: { id: string; nombre: string } | null }
type Lista = {
  id: string; local_id: string; evento_id: string; nombre: string
  tipo: 'cerrada' | 'abierta'; cupo_max: number | null; precio: number
  hora_limite: string | null; num_invitados: number
}
type Evento = { id: string; nombre: string; fecha_inicio: string }
type ItemLista = {
  id: string; estado: string; created_at: string
  contactos: { id: string; nombre: string | null; email: string | null; telefono: string | null }
}

const ESTADO_ITEM: Record<string, { label: string; color: string }> = {
  invitado: { label: 'Invitado', color: '#4F8EF7' },
  confirmado: { label: 'Confirmado', color: '#7C5CFF' },
  entrado: { label: 'Entró', color: '#27AE60' },
  no_show: { label: 'No vino', color: '#6B6B85' },
}

export default function RrppListasPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<{ id: string; nombre: string }[]>([])
  const [listas, setListas] = useState<Lista[]>([])
  const [loading, setLoading] = useState(true)
  const [crear, setCrear] = useState(false)
  const [detalle, setDetalle] = useState<Lista | null>(null)

  const cargar = useCallback(async () => {
    const [p, l] = await Promise.all([
      fetch('/api/rrpp/perfil', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/rrpp/listas').then(r => r.ok ? r.json() : { listas: [] }),
    ])
    if (!p?.rrpp || p.rrpp.estado_alta !== 'completo') { router.replace('/rrpp'); return }
    const vs: Venue[] = (p.venues ?? []).filter((v: Venue) => v.estado === 'activa')
    setVenues(vs.map(v => ({ id: v.local_id, nombre: v.locales?.nombre ?? 'Local' })))
    setListas(l.listas ?? [])
    setLoading(false)
  }, [router])
  useEffect(() => { cargar() }, [cargar])

  const nombreLocal = (id: string) => venues.find(v => v.id === id)?.nombre ?? 'Local'

  return (
    <div className="min-h-screen bg-[#07070D] text-white pb-24">
      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-5">
        <HeroBanner acento="violet" bleed="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6"
          eyebrow="Tus listas" titulo="Listas de invitados"
          subtitulo="Crea una lista por evento y añade a tu gente. Entran por lista."
          heroLabel="Listas activas" heroValue={listas.length} heroUnit=""
          pillLabel="Locales" pillValue={venues.length} />

        {venues.length > 0 && (
          <button onClick={() => setCrear(true)} className="w-full btn-primary inline-flex items-center justify-center gap-1.5">
            <Plus size={16} /> Nueva lista
          </button>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
        ) : venues.length === 0 ? (
          <Vacio icon={Store} titulo="Aún no trabajas con ningún local" sub="Cuando un local te active, podrás crear listas para sus eventos." />
        ) : listas.length === 0 ? (
          <Vacio icon={ClipboardList} titulo="Sin listas todavía" sub="Crea tu primera lista para un evento." />
        ) : (
          <div className="space-y-2.5">
            {listas.map(l => (
              <button key={l.id} onClick={() => setDetalle(l)}
                className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white truncate">{l.nombre}</p>
                  <span className="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-white/8 text-[#B8B8CC] capitalize">{l.tipo}</span>
                </div>
                <p className="text-xs text-[#8B8BA8] mt-0.5 flex items-center gap-1"><Store size={11} /> {nombreLocal(l.local_id)}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#B8B8CC]">
                  <span className="flex items-center gap-1"><Users size={12} /> {l.num_invitados}{l.cupo_max ? `/${l.cupo_max}` : ''} invitados</span>
                  {l.hora_limite && <span className="flex items-center gap-1"><Calendar size={12} /> hasta {l.hora_limite}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {crear && <CrearListaModal venues={venues} onClose={() => setCrear(false)} onCreada={() => { setCrear(false); cargar() }} />}
      {detalle && <ListaDetalleModal lista={detalle} localNombre={nombreLocal(detalle.local_id)} onClose={() => { setDetalle(null); cargar() }} />}
      <RrppNav />
    </div>
  )
}

function Vacio({ icon: Icon, titulo, sub }: { icon: React.ElementType; titulo: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center">
      <Icon className="w-10 h-10 mx-auto text-[#6B6B85] mb-3" />
      <p className="font-semibold text-white">{titulo}</p>
      <p className="text-sm text-[#8B8BA8] mt-1">{sub}</p>
    </div>
  )
}

function CrearListaModal({ venues, onClose, onCreada }: {
  venues: { id: string; nombre: string }[]; onClose: () => void; onCreada: () => void
}) {
  const [localId, setLocalId] = useState(venues[0]?.id ?? '')
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoId, setEventoId] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'cerrada' | 'abierta'>('cerrada')
  const [cupo, setCupo] = useState('')
  const [horaLimite, setHoraLimite] = useState('')
  const [cargandoEv, setCargandoEv] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (!localId) return
    setCargandoEv(true); setEventoId('')
    fetch(`/api/rrpp/local/${localId}`).then(r => r.ok ? r.json() : null)
      .then(j => setEventos(j?.noche?.eventos ?? []))
      .catch(() => setEventos([]))
      .finally(() => setCargandoEv(false))
  }, [localId])

  async function crear() {
    if (!eventoId) { setError('Elige un evento'); return }
    setError(null); setCreando(true)
    const ev = eventos.find(e => e.id === eventoId)
    const r = await fetch('/api/rrpp/listas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local_id: localId, evento_id: eventoId,
        nombre: nombre.trim() || (ev ? `Lista · ${ev.nombre}` : 'Lista principal'),
        tipo, cupo_max: cupo ? Number(cupo) : undefined,
        hora_limite: horaLimite || undefined,
      }),
    })
    const j = await r.json().catch(() => ({}))
    setCreando(false)
    if (!r.ok) { setError(j.error || 'No se pudo crear'); return }
    onCreada()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white text-display">Nueva lista</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <Campo label="Local">
            <select value={localId} onChange={e => setLocalId(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white text-sm outline-none focus:border-[#B6FF3A]/60">
              {venues.map(v => <option key={v.id} value={v.id} className="bg-[#15151F]">{v.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Evento">
            {cargandoEv ? <p className="text-xs text-[#6B6B85]">Cargando eventos…</p>
              : eventos.length === 0 ? <p className="text-xs text-[#6B6B85]">Este local no tiene eventos próximos publicados.</p>
              : (
                <select value={eventoId} onChange={e => setEventoId(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white text-sm outline-none focus:border-[#B6FF3A]/60">
                  <option value="" className="bg-[#15151F]">Elige un evento…</option>
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id} className="bg-[#15151F]">
                      {ev.nombre} · {new Date(ev.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </option>
                  ))}
                </select>
              )}
          </Campo>
          <Campo label="Nombre de la lista (opcional)">
            <input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 60))} placeholder="Ej. Lista de Leo" className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Tipo">
              <select value={tipo} onChange={e => setTipo(e.target.value as 'cerrada' | 'abierta')} className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white text-sm outline-none focus:border-[#B6FF3A]/60">
                <option value="cerrada" className="bg-[#15151F]">Cerrada</option>
                <option value="abierta" className="bg-[#15151F]">Abierta</option>
              </select>
            </Campo>
            <Campo label="Cupo máx (opcional)">
              <input type="number" min={1} value={cupo} onChange={e => setCupo(e.target.value)} placeholder="Sin límite" className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
            </Campo>
          </div>
          <Campo label="Hora límite de entrada (opcional)">
            <input type="time" value={horaLimite} onChange={e => setHoraLimite(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
          </Campo>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
          <button onClick={crear} disabled={!localId || !eventoId || creando} className="btn-primary w-full">{creando ? 'Creando…' : 'Crear lista'}</button>
        </div>
      </div>
    </div>
  )
}

function ListaDetalleModal({ lista, localNombre, onClose }: { lista: Lista; localNombre: string; onClose: () => void }) {
  const [items, setItems] = useState<ItemLista[]>([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [añadiendo, setAñadiendo] = useState(false)

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/rrpp/listas/${lista.id}/items`).then(x => x.ok ? x.json() : { items: [] }).catch(() => ({ items: [] }))
    setItems(r.items ?? [])
    setLoading(false)
  }, [lista.id])
  useEffect(() => { cargar() }, [cargar])

  async function añadir() {
    if (nombre.trim().length < 2) { setError('Pon el nombre'); return }
    const esEmail = contacto.includes('@')
    if (!contacto.trim()) { setError('Pon email o teléfono'); return }
    setError(null); setAñadiendo(true)
    const r = await fetch(`/api/rrpp/listas/${lista.id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), email: esEmail ? contacto.trim() : undefined, telefono: esEmail ? undefined : contacto.trim() }),
    })
    const j = await r.json().catch(() => ({}))
    setAñadiendo(false)
    if (!r.ok) { setError(j.error || 'No se pudo añadir'); return }
    setNombre(''); setContacto(''); cargar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-white text-display truncate">{lista.nombre}</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white shrink-0"><X size={20} /></button>
        </div>
        <p className="text-xs text-[#8B8BA8] mb-4 flex items-center gap-1"><Store size={11} /> {localNombre} · {items.length}{lista.cupo_max ? `/${lista.cupo_max}` : ''} invitados</p>

        {/* Añadir invitado */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 mb-4">
          <p className="eyebrow eyebrow-violet mb-2.5 flex items-center gap-1.5"><UserPlus size={12} /> Añadir invitado</p>
          <div className="space-y-2.5">
            <input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 60))} placeholder="Nombre y apellidos" className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
            <div className="flex gap-2">
              <input value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Email o teléfono" className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
              <button onClick={añadir} disabled={añadiendo} className="btn-primary px-4 inline-flex items-center gap-1.5">
                <Plus size={15} /> {añadiendo ? '…' : 'Añadir'}
              </button>
            </div>
            {error && <p className="text-rose-300 text-xs">{error}</p>}
          </div>
        </div>

        {/* Invitados */}
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-xl skeleton" />)}</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#8B8BA8] text-center py-4">Aún no hay invitados. Añade al primero arriba.</p>
        ) : (
          <div className="space-y-2">
            {items.map(it => {
              const est = ESTADO_ITEM[it.estado] ?? ESTADO_ITEM.invitado
              return (
                <div key={it.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
                  <div className="w-9 h-9 rounded-full bg-violet-400/15 flex items-center justify-center text-violet-300 shrink-0 font-semibold">
                    {(it.contactos?.nombre ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{it.contactos?.nombre ?? 'Invitado'}</p>
                    <p className="text-[11px] text-[#8B8BA8] truncate">{it.contactos?.email ?? it.contactos?.telefono ?? ''}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 flex items-center gap-1"
                    style={{ color: est.color, background: `${est.color}1F` }}>
                    {it.estado === 'entrado' && <Check size={10} />}{est.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">{label}</label>
      {children}
    </div>
  )
}
