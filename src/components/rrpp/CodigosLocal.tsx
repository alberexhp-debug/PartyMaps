'use client'
import { useEffect, useState, useCallback } from 'react'
import { QrCode, Plus, X, Copy, Check, Download, Share2, User, Clock, Power } from 'lucide-react'
import { LABEL_CATEGORIA, CATEGORIAS_DESCUENTO, type CategoriaDescuento } from '@/lib/rrppCodigos'

export type Codigo = {
  id: string; codigo: string; etiqueta: string | null; local_id: string
  usos_max: number | null; usos_actuales: number; descuentos: Record<string, number>
  activo: boolean; expira_at: string | null; created_at: string
}

/** Estado de canje de un código, con el vocabulario del RRPP. */
export function estadoCodigo(c: Codigo): { label: string; color: string; vivo: boolean } {
  const agotado = c.usos_max != null && c.usos_actuales >= c.usos_max
  if (agotado) return { label: 'Canjeado', color: '#27AE60', vivo: false }
  if (!c.activo) return { label: 'Desactivado', color: '#6B6B85', vivo: false }
  if (c.expira_at && new Date(c.expira_at) < new Date()) return { label: 'Caducado', color: '#E94560', vivo: false }
  if (c.usos_actuales > 0) return { label: 'Canjeado en parte', color: '#F39C12', vivo: true }
  return { label: 'Pendiente de canje', color: '#4F8EF7', vivo: true }
}

function restante(expira_at: string | null): string {
  if (!expira_at) return ''
  const ms = new Date(expira_at).getTime() - Date.now()
  if (ms <= 0) return 'caducado'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `caduca en ${h} h ${m} min` : `caduca en ${m} min`
}

/**
 * Generador + lista de códigos del RRPP para UN local concreto. Se usa dentro
 * de la ficha del local (LocalDetalleRRPP). Cada código es para una persona
 * (nombre y apellidos), caduca a las 24h, con nº de usos configurable, y el RRPP
 * ve su estado (pendiente de canje / canjeado / caducado).
 */
export function CodigosLocal({ localId, descuentos }: { localId: string; descuentos: Record<string, number> }) {
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [usos, setUsos] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<Codigo | null>(null)

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/rrpp/codigos?local_id=${localId}`).then(x => x.ok ? x.json() : { codigos: [] }).catch(() => ({ codigos: [] }))
    setCodigos(r.codigos ?? [])
    setLoading(false)
  }, [localId])
  useEffect(() => { cargar() }, [cargar])

  async function generar() {
    if (nombre.trim().length < 2) { setError('Pon el nombre y apellidos'); return }
    setError(null); setGenerando(true)
    const r = await fetch('/api/rrpp/codigos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: localId, etiqueta: nombre.trim(), usos_max: usos ? Number(usos) : 1 }),
    })
    const j = await r.json().catch(() => ({}))
    setGenerando(false)
    if (!r.ok) { setError(j.error || 'No se pudo generar'); return }
    setNombre(''); setUsos('1')
    if (j.codigo) { setCodigos(c => [j.codigo, ...c]); setQr(j.codigo) }
    else cargar()
  }

  async function toggle(c: Codigo) {
    await fetch('/api/rrpp/codigos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, activo: !c.activo }) })
    cargar()
  }

  const hayDescuento = (CATEGORIAS_DESCUENTO as CategoriaDescuento[]).some(c => (descuentos?.[c] ?? 0) > 0)

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5">
      <p className="eyebrow eyebrow-rose mb-2.5 flex items-center gap-1.5"><QrCode size={12} /> Generar código para una persona</p>

      {/* Formulario de generación */}
      <div className="space-y-2.5">
        <input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 60))} placeholder="Nombre y apellidos (ej. Laura Gómez)"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#E0455E]/60 placeholder:text-[#6B6B85]" />
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B8BA8]">Usos</span>
            <input type="number" min={1} value={usos} onChange={e => setUsos(e.target.value)}
              className="h-11 w-20 rounded-xl border border-white/10 bg-white/5 px-3 text-white text-sm outline-none focus:border-[#E0455E]/60" />
          </div>
          <button onClick={generar} disabled={generando}
            className="flex-1 btn-primary inline-flex items-center justify-center gap-1.5 h-11">
            <Plus size={15} /> {generando ? 'Generando…' : 'Generar QR'}
          </button>
        </div>
        {hayDescuento ? (
          <div className="flex flex-wrap gap-1.5">
            {(CATEGORIAS_DESCUENTO as CategoriaDescuento[]).map(c => (descuentos[c] ?? 0) > 0 && (
              <span key={c} className="text-[11px] font-semibold text-[#E0455E] bg-[#E0455E]/10 rounded-full px-2 py-0.5">{LABEL_CATEGORIA[c]} −{descuentos[c]}%</span>
            ))}
            <span className="text-[11px] text-[#6B6B85] flex items-center gap-1"><Clock size={10} /> caduca a las 24h</span>
          </div>
        ) : (
          <p className="text-[11px] text-[#6B6B85]">Sin descuento fijado por el local (el código atribuye igual). Caduca a las 24h.</p>
        )}
        {error && <p className="text-rose-300 text-xs">{error}</p>}
      </div>

      {/* Lista de códigos generados para este local */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-[#A0A0B8]">Tus códigos aquí ({codigos.length})</p>
        {loading ? (
          <div className="h-12 rounded-xl skeleton" />
        ) : codigos.length === 0 ? (
          <p className="text-xs text-[#6B6B85]">Aún no has generado códigos para este local.</p>
        ) : (
          codigos.map(c => {
            const est = estadoCodigo(c)
            return (
              <div key={c.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
                <button onClick={() => setQr(c)} title="Ver QR"
                  className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center shrink-0 hover:opacity-90"><QrCode size={16} /></button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm tracking-[0.1em] text-white">{c.codigo}</code>
                    <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5" style={{ color: est.color, background: `${est.color}1F` }}>{est.label}</span>
                  </div>
                  <p className="text-[11px] text-[#8B8BA8] truncate flex items-center gap-1">
                    {c.etiqueta ? <><User size={10} /> {c.etiqueta} · </> : null}
                    {c.usos_max == null ? `${c.usos_actuales} usos` : `${c.usos_actuales}/${c.usos_max} usos`}
                    {est.vivo && c.expira_at ? ` · ${restante(c.expira_at)}` : ''}
                  </p>
                </div>
                <button onClick={() => toggle(c)} title={c.activo ? 'Desactivar' : 'Activar'}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${c.activo ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300' : 'bg-white/5 border-white/10 text-[#6B6B85]'}`}>
                  <Power size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {qr && <QrModal codigo={qr} onClose={() => setQr(null)} />}
    </div>
  )
}

/** Muestra el QR + dígitos de un código, con descargar y compartir. */
export function QrModal({ codigo, onClose }: { codigo: Codigo; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const est = estadoCodigo(codigo)

  useEffect(() => {
    let vivo = true
    import('qrcode').then(async ({ default: QRCode }) => {
      const url = await QRCode.toDataURL(codigo.codigo, { width: 320, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      if (vivo) setQrUrl(url)
    }).catch(() => {})
    return () => { vivo = false }
  }, [codigo.codigo])

  async function compartir() {
    try {
      if (qrUrl && navigator.share) {
        const blob = await (await fetch(qrUrl)).blob()
        const file = new File([blob], `codigo-${codigo.codigo}.png`, { type: 'image/png' })
        await navigator.share({ title: 'Tu código Rumbo', text: `Código: ${codigo.codigo}`, files: [file] })
      } else if (navigator.share) {
        await navigator.share({ title: 'Tu código Rumbo', text: `Código: ${codigo.codigo}` })
      }
    } catch { /* cancelado */ }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-xs rounded-3xl p-6 animate-slide-up text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ color: est.color, background: `${est.color}1F` }}>{est.label}</span>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        {codigo.etiqueta && <p className="text-sm text-white font-semibold mb-3 flex items-center justify-center gap-1.5"><User size={13} /> {codigo.etiqueta}</p>}

        <div className="bg-white rounded-2xl p-3 mx-auto w-fit">
          {qrUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={qrUrl} alt="QR del código" width={220} height={220} className="block" />
            : <div className="w-[220px] h-[220px] skeleton rounded-lg" />}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <code className="text-display text-2xl tracking-[0.18em] text-white">{codigo.codigo}</code>
          <button onClick={() => { navigator.clipboard?.writeText(codigo.codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#B8B8CC] hover:text-white">
            {copiado ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
        <p className="text-xs text-[#8B8BA8] mt-2">
          {codigo.usos_max == null ? `${codigo.usos_actuales} usos` : `${codigo.usos_actuales}/${codigo.usos_max} usos`}
          {est.vivo && codigo.expira_at ? ` · ${restante(codigo.expira_at)}` : ''}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {qrUrl && (
            <a href={qrUrl} download={`codigo-${codigo.codigo}.png`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/8 border border-white/10 py-2.5 text-sm text-white hover:bg-white/12">
              <Download size={15} /> Guardar
            </a>
          )}
          <button onClick={compartir}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/8 border border-white/10 py-2.5 text-sm text-white hover:bg-white/12 ${qrUrl ? '' : 'col-span-2'}`}>
            <Share2 size={15} /> Compartir
          </button>
        </div>
      </div>
    </div>
  )
}
