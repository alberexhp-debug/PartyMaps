'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RrppNav } from '@/components/rrpp/RrppNav'
import { HeroBanner } from '@/components/local-panel/ui'
import { LABEL_CATEGORIA, CATEGORIAS_DESCUENTO, type CategoriaDescuento } from '@/lib/rrppCodigos'
import { Ticket, Plus, X, Copy, Check, Power, Store } from 'lucide-react'

type Venue = { local_id: string; estado: string; locales?: { id: string; nombre: string } | null }
type Codigo = {
  id: string; codigo: string; local_id: string; local_nombre: string
  usos_max: number | null; usos_actuales: number; descuentos: Record<string, number>; activo: boolean
}

export default function RrppCodigosPage() {
  const router = useRouter()
  const [activos, setActivos] = useState<{ id: string; nombre: string }[]>([])
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [abrir, setAbrir] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [p, c] = await Promise.all([
      fetch('/api/rrpp/perfil', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/rrpp/codigos').then(r => r.ok ? r.json() : { codigos: [] }),
    ])
    if (!p?.rrpp || p.rrpp.estado_alta !== 'completo') { router.replace('/rrpp'); return }
    const venues: Venue[] = (p.venues ?? []).filter((v: Venue) => v.estado === 'activa')
    setActivos(venues.map(v => ({ id: v.local_id, nombre: v.locales?.nombre ?? 'Local' })))
    setCodigos(c.codigos ?? [])
    setLoading(false)
  }, [router])
  useEffect(() => { cargar() }, [cargar])

  async function toggle(c: Codigo) {
    await fetch('/api/rrpp/codigos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, activo: !c.activo }) })
    cargar()
  }

  return (
    <div className="min-h-screen bg-[#07070D] text-white pb-24">
      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-5">
        <HeroBanner acento="rose" bleed="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6"
          eyebrow="Tus códigos" titulo="Códigos de referido"
          subtitulo="Genera un código por local. El descuento lo fija cada local."
          heroLabel="Códigos activos" heroValue={codigos.filter(c => c.activo).length} heroUnit=""
          pillLabel="Locales" pillValue={activos.length} />
        {activos.length > 0 && (
          <button onClick={() => setAbrir(true)}
            className="w-full btn-primary inline-flex items-center justify-center gap-1.5"><Plus size={16} /> Crear código</button>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}</div>
        ) : activos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center">
            <Store className="w-10 h-10 mx-auto text-[#6B6B85] mb-3" />
            <p className="font-semibold text-white">Aún no trabajas con ningún local</p>
            <p className="text-sm text-[#8B8BA8] mt-1">Cuando un local te active, podrás generar códigos para él.</p>
          </div>
        ) : codigos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center">
            <Ticket className="w-10 h-10 mx-auto text-[#6B6B85] mb-3" />
            <p className="font-semibold text-white">Sin códigos todavía</p>
            <p className="text-sm text-[#8B8BA8] mt-1">Crea tu primer código para un local.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {codigos.map(c => (
              <div key={c.id} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <code className="text-display text-lg tracking-[0.15em] text-white bg-white/5 rounded-lg px-3 py-1.5">{c.codigo}</code>
                  <button onClick={() => { navigator.clipboard?.writeText(c.codigo); setCopiado(c.id); setTimeout(() => setCopiado(null), 1500) }}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#B8B8CC] hover:text-white">
                    {copiado === c.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <button onClick={() => toggle(c)} title={c.activo ? 'Desactivar' : 'Activar'}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center ${c.activo ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300' : 'bg-white/5 border-white/10 text-[#6B6B85]'}`}>
                    <Power size={14} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B8BA8]">
                  <span className="text-[#B8B8CC]">{c.local_nombre}</span>
                  <span>· {c.usos_max == null ? 'Usos ilimitados' : `${c.usos_actuales}/${c.usos_max} usos`}</span>
                  {CATEGORIAS_DESCUENTO.filter(cat => (c.descuentos?.[cat] ?? 0) > 0).map(cat => (
                    <span key={cat} className="text-[#E0455E]">· {LABEL_CATEGORIA[cat]} -{c.descuentos[cat]}%</span>
                  ))}
                  {!c.activo && <span className="text-[#E94560]">· inactivo</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {abrir && <CrearCodigoModal locales={activos} onClose={() => setAbrir(false)} onCreado={() => { setAbrir(false); cargar() }} />}
      <RrppNav />
    </div>
  )
}

function CrearCodigoModal({ locales, onClose, onCreado }: {
  locales: { id: string; nombre: string }[]; onClose: () => void; onCreado: () => void
}) {
  const [localId, setLocalId] = useState(locales[0]?.id ?? '')
  const [usos, setUsos] = useState('')
  const [descuentos, setDescuentos] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  // Al elegir local, mostramos el descuento que aplicará (lo fija el local).
  useEffect(() => {
    if (!localId) return
    fetch(`/api/rrpp/local/${localId}`).then(r => r.ok ? r.json() : null)
      .then(j => setDescuentos(j?.relacion?.descuentos ?? {})).catch(() => setDescuentos({}))
  }, [localId])

  async function crear() {
    setError(null); setCreando(true)
    const r = await fetch('/api/rrpp/codigos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: localId, usos_max: usos ? Number(usos) : null }),
    })
    const j = await r.json().catch(() => ({}))
    setCreando(false)
    if (!r.ok) { setError(j.error || 'No se pudo crear'); return }
    onCreado()
  }

  const hayDescuento = (CATEGORIAS_DESCUENTO as CategoriaDescuento[]).some(c => (descuentos[c] ?? 0) > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white text-display">Crear código</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Local</label>
            <select value={localId} onChange={e => setLocalId(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-[#E0455E]/60">
              {locales.map(l => <option key={l.id} value={l.id} className="bg-[#15151F]">{l.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Número de usos (vacío = ilimitado)</label>
            <input type="number" min={1} value={usos} onChange={e => setUsos(e.target.value)} placeholder="Ej. 50"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#E0455E]/60" />
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3.5">
            <p className="text-xs font-semibold text-[#A0A0B8] mb-2">Descuento que aplicará (lo fija el local)</p>
            {hayDescuento ? (
              <div className="flex flex-wrap gap-2">
                {(CATEGORIAS_DESCUENTO as CategoriaDescuento[]).map(c => (descuentos[c] ?? 0) > 0 && (
                  <span key={c} className="text-xs font-semibold text-[#E0455E] bg-[#E0455E]/10 rounded-full px-2.5 py-1">
                    {LABEL_CATEGORIA[c]} −{descuentos[c]}%
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B6B85]">Este local todavía no ha fijado descuentos para ti. El código funcionará igual (atribuye la venta), pero sin descuento.</p>
            )}
          </div>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
          <button onClick={crear} disabled={!localId || creando} className="btn-primary w-full">{creando ? 'Creando…' : 'Generar código'}</button>
        </div>
      </div>
    </div>
  )
}
