'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RrppNav } from '@/components/rrpp/RrppNav'
import { HeroBanner } from '@/components/local-panel/ui'
import { LABEL_CATEGORIA, CATEGORIAS_DESCUENTO, type CategoriaDescuento } from '@/lib/rrppCodigos'
import { Ticket, Plus, X, Copy, Check, Power, Store, QrCode, Clock, Download, User } from '@/components/todh/iconosTorneum'
import { Share2 } from 'lucide-react'

type Venue = { local_id: string; estado: string; locales?: { id: string; nombre: string } | null }
type Codigo = {
  id: string; codigo: string; etiqueta: string | null; local_id: string; local_nombre: string
  usos_max: number | null; usos_actuales: number; descuentos: Record<string, number>
  activo: boolean; expira_at: string | null; created_at: string
}

/** Estado derivado de un código para mostrar al RRPP (vocabulario de canje). */
function estadoCodigo(c: Codigo): { label: string; color: string; vivo: boolean } {
  const agotado = c.usos_max != null && c.usos_actuales >= c.usos_max
  if (agotado) return { label: 'Canjeado', color: '#27AE60', vivo: false }
  if (!c.activo) return { label: 'Desactivado', color: '#6B6B85', vivo: false }
  if (c.expira_at && new Date(c.expira_at) < new Date()) return { label: 'Caducado', color: '#B6FF3A', vivo: false }
  if (c.usos_actuales > 0) return { label: 'Canjeado en parte', color: '#F39C12', vivo: true }
  return { label: 'Pendiente de canje', color: '#4F8EF7', vivo: true }
}

/** "caduca en 5 h 12 min" / "caducó". */
function restante(expira_at: string | null): string {
  if (!expira_at) return ''
  const ms = new Date(expira_at).getTime() - Date.now()
  if (ms <= 0) return 'caducado'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `caduca en ${h} h ${m} min` : `caduca en ${m} min`
}

export default function RrppCodigosPage() {
  const router = useRouter()
  const [activos, setActivos] = useState<{ id: string; nombre: string }[]>([])
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [abrir, setAbrir] = useState(false)
  const [qr, setQr] = useState<Codigo | null>(null)

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

  const vivos = codigos.filter(c => estadoCodigo(c).vivo).length

  return (
    <div className="min-h-screen bg-[#0D0F15] text-white pb-24">
      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-5">
        <HeroBanner acento="rose" bleed="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6"
          eyebrow="Tus códigos" titulo="Códigos por persona"
          subtitulo="Genera un QR para cada persona. Caduca a las 24h y comisionas por ella."
          heroLabel="Códigos activos" heroValue={vivos} heroUnit=""
          pillLabel="Locales" pillValue={activos.length} />
        {activos.length > 0 && (
          <button onClick={() => setAbrir(true)}
            className="w-full btn-primary inline-flex items-center justify-center gap-1.5"><Plus size={16} /> Generar código para una persona</button>
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
            <p className="text-sm text-[#8B8BA8] mt-1">Genera tu primer código justo cuando se lo vayas a dar a alguien.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {codigos.map(c => {
              const est = estadoCodigo(c)
              const usado = c.usos_actuales > 0
              return (
                <div key={c.id} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQr(c)} title="Ver QR"
                      className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center shrink-0 hover:opacity-90">
                      <QrCode size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-display text-base tracking-[0.12em] text-white">{c.codigo}</code>
                        <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ color: est.color, background: `${est.color}1F` }}>{est.label}</span>
                      </div>
                      <p className="text-xs text-[#B8B8CC] truncate mt-0.5 flex items-center gap-1">
                        {c.etiqueta ? <><User size={11} /> {c.etiqueta} · </> : null}{c.local_nombre}
                      </p>
                    </div>
                    <button onClick={() => toggle(c)} title={c.activo ? 'Desactivar' : 'Activar'}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${c.activo ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300' : 'bg-white/5 border-white/10 text-[#6B6B85]'}`}>
                      <Power size={14} />
                    </button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B8BA8]">
                    <span>{c.usos_max == null ? `${c.usos_actuales} usos` : `${c.usos_actuales}/${c.usos_max} usos`}</span>
                    <span className={usado ? 'text-emerald-300' : 'text-[#6B6B85]'}>· {usado ? 'Utilizado' : 'Sin usar'}</span>
                    {est.vivo && c.expira_at && <span className="flex items-center gap-1"><Clock size={11} /> {restante(c.expira_at)}</span>}
                    {CATEGORIAS_DESCUENTO.filter(cat => (c.descuentos?.[cat] ?? 0) > 0).map(cat => (
                      <span key={cat} className="text-[#B6FF3A]">· {LABEL_CATEGORIA[cat]} -{c.descuentos[cat]}%</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {abrir && <CrearCodigoModal locales={activos} onClose={() => setAbrir(false)} onCreado={(nuevo) => { setAbrir(false); cargar(); if (nuevo) setQr(nuevo) }} />}
      {qr && <QrModal codigo={qr} onClose={() => setQr(null)} />}
      <RrppNav />
    </div>
  )
}

function CrearCodigoModal({ locales, onClose, onCreado }: {
  locales: { id: string; nombre: string }[]; onClose: () => void; onCreado: (nuevo: Codigo | null) => void
}) {
  const [localId, setLocalId] = useState(locales[0]?.id ?? '')
  const [etiqueta, setEtiqueta] = useState('')
  const [usos, setUsos] = useState('1')
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
      body: JSON.stringify({ local_id: localId, etiqueta: etiqueta || undefined, usos_max: usos ? Number(usos) : 1 }),
    })
    const j = await r.json().catch(() => ({}))
    setCreando(false)
    if (!r.ok) { setError(j.error || 'No se pudo crear'); return }
    const nombre = locales.find(l => l.id === localId)?.nombre ?? 'Local'
    onCreado(j.codigo ? { ...j.codigo, local_nombre: nombre } : null)
  }

  const hayDescuento = (CATEGORIAS_DESCUENTO as CategoriaDescuento[]).some(c => (descuentos[c] ?? 0) > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white text-display">Código para una persona</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Local</label>
            <select value={localId} onChange={e => setLocalId(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-[#B6FF3A]/60">
              {locales.map(l => <option key={l.id} value={l.id} className="bg-[#181D28]">{l.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Persona (para que sepas de quién es)</label>
            <input value={etiqueta} onChange={e => setEtiqueta(e.target.value.slice(0, 60))} placeholder="Ej. Laura · grupo de 4"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Número de usos</label>
            <input type="number" min={1} value={usos} onChange={e => setUsos(e.target.value)} placeholder="1"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />
            <p className="text-xs text-[#6B6B85] mt-1">Cuántas veces vale este código (p. ej. 4 si entra con su grupo).</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3.5">
            <p className="text-xs font-semibold text-[#A0A0B8] mb-2 flex items-center gap-1.5"><Clock size={12} /> Caduca a las 24h de generarlo</p>
            {hayDescuento ? (
              <div className="flex flex-wrap gap-2">
                {(CATEGORIAS_DESCUENTO as CategoriaDescuento[]).map(c => (descuentos[c] ?? 0) > 0 && (
                  <span key={c} className="text-xs font-semibold text-[#B6FF3A] bg-[#B6FF3A]/10 rounded-full px-2.5 py-1">
                    {LABEL_CATEGORIA[c]} −{descuentos[c]}%
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B6B85]">Este local todavía no ha fijado descuentos para ti. El código funcionará igual (atribuye la venta), pero sin descuento.</p>
            )}
          </div>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
          <button onClick={crear} disabled={!localId || creando} className="btn-primary w-full">{creando ? 'Generando…' : 'Generar QR'}</button>
        </div>
      </div>
    </div>
  )
}

/** Muestra el QR + dígitos de un código, con descargar y compartir. */
function QrModal({ codigo, onClose }: { codigo: Codigo; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const est = estadoCodigo(codigo)

  useEffect(() => {
    let vivo = true
    import('qrcode').then(async ({ default: QRCode }) => {
      const url = await QRCode.toDataURL(codigo.codigo, {
        width: 320, margin: 2, color: { dark: '#000000', light: '#FFFFFF' },
      })
      if (vivo) setQrUrl(url)
    }).catch(() => {})
    return () => { vivo = false }
  }, [codigo.codigo])

  async function compartir() {
    try {
      if (qrUrl && navigator.share) {
        const blob = await (await fetch(qrUrl)).blob()
        const file = new File([blob], `codigo-${codigo.codigo}.png`, { type: 'image/png' })
        await navigator.share({ title: 'Tu código Torneum', text: `Código: ${codigo.codigo}`, files: [file] })
      } else if (navigator.share) {
        await navigator.share({ title: 'Tu código Torneum', text: `Código: ${codigo.codigo}` })
      }
    } catch { /* cancelado */ }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-xs rounded-3xl p-6 animate-slide-up text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ color: est.color, background: `${est.color}1F` }}>{est.label}</span>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        {codigo.etiqueta && <p className="text-sm text-white font-semibold mb-1 flex items-center justify-center gap-1.5"><User size={13} /> {codigo.etiqueta}</p>}
        <p className="text-xs text-[#8B8BA8] mb-3">{codigo.local_nombre}</p>

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
