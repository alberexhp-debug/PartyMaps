'use client'
import { useEffect, useState, useCallback } from 'react'
import { HeroBanner, SectionCard, SectionTitle, EmptyState } from '@/components/local-panel/ui'
import { CATEGORIAS_DESCUENTO, LABEL_CATEGORIA, type CategoriaDescuento } from '@/lib/rrppCodigos'
import { Megaphone, Store, Percent, X } from 'lucide-react'

type RrppRel = {
  rrpp_venue_id: string; comision_pct: number; descuentos: Record<string, number>
  rrpp: { id: string; slug: string; nombre_publico: string; foto_url: string | null }
}
type LocalConRrpp = { local_id: string; local_nombre: string; rrpps: RrppRel[] }

export default function GrupoRrppPage() {
  const [locales, setLocales] = useState<LocalConRrpp[]>([])
  const [loading, setLoading] = useState(true)
  const [editar, setEditar] = useState<{ rel: RrppRel; localNombre: string } | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/grupo/rrpp')
    const j = await r.json().catch(() => ({}))
    if (r.ok) setLocales(j.locales ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const totalRrpp = locales.reduce((s, l) => s + l.rrpps.length, 0)

  return (
    <div className="space-y-6">
      <HeroBanner acento="blue" eyebrow="Tu grupo" titulo="RRPP y descuentos"
        subtitulo="Fija el % de descuento que aplican los códigos de cada RRPP, por local y categoría." />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>
      ) : totalRrpp === 0 ? (
        <EmptyState icon={Megaphone} acento="blue" titulo="Sin RRPP activos"
          descripcion="Cuando los locales de tu grupo tengan RRPP activos, podrás fijar aquí sus descuentos." />
      ) : (
        <div className="space-y-5">
          {locales.map(l => (
            <SectionCard key={l.local_id}>
              <SectionTitle icon={Store} acento="violet">{l.local_nombre}</SectionTitle>
              <div className="space-y-2">
                {l.rrpps.map(rel => (
                  <button key={rel.rrpp_venue_id} onClick={() => setEditar({ rel, localNombre: l.local_nombre })}
                    className="w-full text-left rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                    {rel.rrpp.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rel.rrpp.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#4F8EF7]/20 flex items-center justify-center font-semibold text-[#4F8EF7]">{rel.rrpp.nombre_publico.slice(0, 1)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{rel.rrpp.nombre_publico}</p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {CATEGORIAS_DESCUENTO.some(c => (rel.descuentos?.[c] ?? 0) > 0)
                          ? (CATEGORIAS_DESCUENTO as CategoriaDescuento[]).map(c => (rel.descuentos?.[c] ?? 0) > 0 && (
                              <span key={c} className="text-[11px] font-semibold text-[#E0455E] bg-[#E0455E]/10 rounded-full px-2 py-0.5">{LABEL_CATEGORIA[c]} −{rel.descuentos[c]}%</span>
                            ))
                          : <span className="text-[11px] text-[#6B6B85]">Sin descuentos · pulsa para fijar</span>}
                      </div>
                    </div>
                    <Percent size={15} className="text-[#6B6B85] shrink-0" />
                  </button>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {editar && <DescuentosModal rel={editar.rel} localNombre={editar.localNombre}
        onClose={() => setEditar(null)} onGuardado={() => { setEditar(null); cargar() }} />}
    </div>
  )
}

function DescuentosModal({ rel, localNombre, onClose, onGuardado }: {
  rel: RrppRel; localNombre: string; onClose: () => void; onGuardado: () => void
}) {
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(CATEGORIAS_DESCUENTO.map(c => [c, Number(rel.descuentos?.[c]) || 0])))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setGuardando(true); setError(null)
    const r = await fetch('/api/grupo/rrpp', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rrpp_venue_id: rel.rrpp_venue_id, descuentos: vals }),
    })
    setGuardando(false)
    if (!r.ok) { const j = await r.json().catch(() => ({})); setError(j.error || 'No se pudo guardar'); return }
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-display text-xl">Descuentos · {rel.rrpp.nombre_publico}</h3>
            <p className="text-tertiary text-xs">{localNombre} · % que aplicarán sus códigos</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-2.5">
          {(CATEGORIAS_DESCUENTO as CategoriaDescuento[]).map(c => (
            <label key={c} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white flex items-center gap-2"><Percent size={13} className="text-[#E0455E]" /> {LABEL_CATEGORIA[c]}</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={vals[c] ?? 0}
                  onChange={e => setVals(v => ({ ...v, [c]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                  className="w-20 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-white text-right outline-none focus:border-[#4F8EF7]/60" />
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
