'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { PageHeader, SectionCard } from '@/components/local-panel/ui'
import { useToast } from '@/components/ui/Toast'
import { Banknote, CreditCard, Smartphone, Check, Plus, Minus, User, RotateCcw, Download, Coffee } from 'lucide-react'

type Evento = { id: string; nombre: string; fecha_inicio: string; precio_base: number | null }
type EntradaCreada = { id: string; qr_code: string; precio_total: number }
type Metodo = 'efectivo' | 'datafono' | 'bizum'

const METODOS: { key: Metodo; label: string; icon: React.ElementType }[] = [
  { key: 'efectivo', label: 'Efectivo', icon: Banknote },
  { key: 'datafono', label: 'Datáfono', icon: CreditCard },
  { key: 'bizum', label: 'Bizum', icon: Smartphone },
]
const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(/\.00$/, '')} €`

export default function TaquillaPage() {
  const { local } = useLocalPanelStore()
  const toast = useToast()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [precioGeneral, setPrecioGeneral] = useState<number | null>(null)
  const [eventoId, setEventoId] = useState('')
  const [precio, setPrecio] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [metodo, setMetodo] = useState<Metodo>('efectivo')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [verDatos, setVerDatos] = useState(false)
  const [aceptaMarketing, setAceptaMarketing] = useState(false)
  const [consumiciones, setConsumiciones] = useState(0)
  const [consumicionTexto, setConsumicionTexto] = useState('')
  const [vendiendo, setVendiendo] = useState(false)
  const [resultado, setResultado] = useState<EntradaCreada[] | null>(null)
  const [hoy, setHoy] = useState<{ num: number; total: number } | null>(null)
  const [cupoNoche, setCupoNoche] = useState<{ limite: number; quedan: number } | null>(null)

  const cargarHoy = useCallback(async () => {
    const r = await fetch('/api/local-panel/taquilla/vender').then(x => x.ok ? x.json() : null).catch(() => null)
    if (r?.hoy) setHoy(r.hoy)
    setCupoNoche(r?.cupo_noche ?? null)
  }, [])

  useEffect(() => {
    if (!local?.id) return
    ;(async () => {
      const ahora = new Date().toISOString()
      const [{ data: evs }, { data: loc }] = await Promise.all([
        supabase.from('eventos').select('id, nombre, fecha_inicio, precio_base')
          .eq('local_id', local.id).eq('estado', 'publicado').gte('fecha_inicio', ahora)
          .order('fecha_inicio', { ascending: true }).limit(20),
        supabase.from('locales').select('precio_entrada_min').eq('id', local.id).maybeSingle(),
      ])
      setEventos(evs ?? [])
      setPrecioGeneral(loc?.precio_entrada_min ?? null)
    })()
    cargarHoy()
  }, [local?.id, cargarHoy])

  // Al elegir evento, sugiere su precio base (editable).
  function elegirEvento(id: string) {
    setEventoId(id)
    const ev = eventos.find(e => e.id === id)
    if (id === '') { if (precioGeneral != null) setPrecio(String(precioGeneral)) }
    else if (ev?.precio_base != null) setPrecio(String(ev.precio_base))
  }

  async function vender() {
    const p = Number(precio)
    if (!Number.isFinite(p) || p < 0) { toast.error('Pon un precio válido'); return }
    setVendiendo(true)
    const res = await fetch('/api/local-panel/taquilla/vender', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento_id: eventoId || undefined, precio: p, cantidad, metodo_pago: metodo,
        comprador_nombre: nombre.trim() || undefined, comprador_telefono: telefono.trim() || undefined,
        consentimiento_marketing: aceptaMarketing,
        consumiciones_incluidas: consumiciones,
        consumiciones_descripcion: consumicionTexto.trim() || undefined,
      }),
    })
    const j = await res.json().catch(() => ({}))
    setVendiendo(false)
    if (!res.ok) { toast.error(j.error || 'No se pudo vender'); return }
    setResultado(j.entradas ?? [])
    cargarHoy()
  }

  function nuevaVenta() {
    setResultado(null); setCantidad(1); setNombre(''); setTelefono(''); setVerDatos(false)
    setConsumiciones(0); setConsumicionTexto('')
  }

  // ─── Pantalla de resultado: QR(s) generados ───
  if (resultado) {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-center mb-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-2">
            <Check className="text-emerald-400" size={26} />
          </div>
          <p className="text-white font-bold text-lg">Venta registrada</p>
          <p className="text-[#8B8BA8] text-sm">{resultado.length} {resultado.length === 1 ? 'entrada' : 'entradas'} · {eur(resultado.reduce((s, e) => s + Number(e.precio_total), 0))} en {metodo}</p>
          {consumiciones > 0 && (
            <p className="text-[#B6FF3A] text-xs mt-1.5 flex items-center justify-center gap-1.5">
              <Coffee size={12} /> Incluye {consumiciones} {consumiciones === 1 ? 'extra' : 'extras'}{consumicionTexto.trim() ? ` · ${consumicionTexto.trim()}` : ''}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {resultado.map((e, i) => <QrEntrada key={e.id} code={e.qr_code} idx={i + 1} total={resultado.length} />)}
        </div>
        <button onClick={nuevaVenta} className="mt-4 w-full btn-primary inline-flex items-center justify-center gap-2">
          <RotateCcw size={16} /> Nueva venta
        </button>
        <p className="mt-2 text-center text-xs text-[#6B6B85]">Enséñale el QR al cliente o escanéalo en puerta para validar la entrada.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5">
      <PageHeader eyebrow="Inscripciones" titulo="Taquilla" subtitulo="Vende entradas en puerta y genera el QR al momento." />

      {hoy && hoy.num > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-3">
          <span className="text-sm text-[#B8B8CC]">Vendido hoy en taquilla</span>
          <span className="text-sm font-bold text-white">{hoy.num} · {eur(hoy.total)}</span>
        </div>
      )}

      {!eventoId && cupoNoche && (
        <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${cupoNoche.quedan <= Math.max(5, cupoNoche.limite * 0.1) ? 'bg-[#F39C12]/10 border-[#F39C12]/30' : 'bg-white/[0.03] border-white/[0.07]'}`}>
          <span className="text-sm text-[#B8B8CC]">Cupo del torneo</span>
          <span className="text-sm font-bold text-white">Quedan {cupoNoche.quedan} de {cupoNoche.limite}</span>
        </div>
      )}

      <SectionCard>
        <div className="space-y-4">
          {/* Evento */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Evento</label>
            <select value={eventoId} onChange={e => elegirEvento(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-[#B6FF3A]/60">
              <option value="" className="bg-[#181D28]">Entrada general (sin evento)</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id} className="bg-[#181D28]">
                  {ev.nombre} · {new Date(ev.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </option>
              ))}
            </select>
          </div>

          {/* Precio + cantidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Precio por entrada</label>
              <div className="relative">
                <input type="number" min={0} step="0.5" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-4 pr-8 text-white text-lg font-bold outline-none focus:border-[#B6FF3A]/60" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8BA8]">€</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Cantidad</label>
              <div className="flex items-center gap-2 h-12">
                <button onClick={() => setCantidad(c => Math.max(1, c - 1))} className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10"><Minus size={16} /></button>
                <span className="flex-1 text-center text-lg font-bold text-white">{cantidad}</span>
                <button onClick={() => setCantidad(c => Math.min(20, c + 1))} className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10"><Plus size={16} /></button>
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Cobro en</label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setMetodo(key)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm transition-colors ${
                    metodo === key ? 'border-[#B6FF3A] bg-[#B6FF3A]/10 text-[#0A0A0F]' : 'border-white/10 text-[#8B8BA8] hover:border-white/25'
                  }`}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Datos del comprador (opcional) */}
          {verDatos ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 80))} placeholder="Nombre (opcional)"
                  className="h-11 rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
                <input value={telefono} onChange={e => setTelefono(e.target.value.slice(0, 30))} placeholder="Teléfono (opcional)"
                  className="h-11 rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
              </div>
              {telefono.trim() && (
                <button type="button" onClick={() => setAceptaMarketing(v => !v)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-left">
                  <span>
                    <span className="block text-sm text-white">¿Acepta promos del local?</span>
                    <span className="block text-[11px] text-[#8B8BA8]">Marca solo si el cliente da su consentimiento para recibir promociones.</span>
                  </span>
                  <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aceptaMarketing ? 'bg-[#B6FF3A]' : 'bg-white/15'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${aceptaMarketing ? 'left-[22px]' : 'left-0.5'}`} />
                  </span>
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setVerDatos(true)} className="text-sm text-[#A0A0B8] hover:text-white inline-flex items-center gap-1.5">
              <User size={14} /> Añadir nombre del cliente (opcional)
            </button>
          )}

          {/* Extras incluidos con la entrada (van DENTRO del QR: anti-falsificación) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white flex items-center gap-2">
                <Coffee size={15} className="text-[#B6FF3A]" /> Extras incluidos
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setConsumiciones(c => Math.max(0, c - 1))} disabled={consumiciones === 0}
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-40"><Minus size={14} /></button>
                <span className="w-6 text-center text-base font-bold text-white">{consumiciones}</span>
                <button type="button" onClick={() => setConsumiciones(c => Math.min(5, c + 1))} disabled={consumiciones === 5}
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-40"><Plus size={14} /></button>
              </div>
            </div>
            {consumiciones > 0 && (
              <>
                <input value={consumicionTexto} onChange={e => setConsumicionTexto(e.target.value.slice(0, 120))}
                  placeholder="Qué incluye (ej. bebida o snack)"
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
                <p className="text-[11px] text-[#8B8BA8]">Van dentro del QR de la entrada y se canjean en el mostrador una a una. Sin papelitos: imposible de falsificar.</p>
              </>
            )}
          </div>

          {/* Total + cobrar */}
          <div className="flex items-center justify-between pt-2 border-t border-white/8">
            <span className="text-[#B8B8CC]">Total a cobrar</span>
            <span className="text-2xl font-bold text-white">{eur((Number(precio) || 0) * cantidad)}</span>
          </div>
          <button onClick={vender} disabled={vendiendo || !precio}
            className="w-full btn-primary inline-flex items-center justify-center gap-2 h-12 text-base">
            <Check size={18} /> {vendiendo ? 'Generando…' : 'Cobrar y generar entrada'}
          </button>
          <p className="text-center text-[11px] text-[#6B6B85]">El dinero lo cobras tú en mano. Sin comisión de TODH en taquilla.</p>
        </div>
      </SectionCard>
    </div>
  )
}

/** QR de una entrada de taquilla, con descarga. */
function QrEntrada({ code, idx, total }: { code: string; idx: number; total: number }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    import('qrcode').then(async ({ default: QRCode }) => {
      const u = await QRCode.toDataURL(code, { width: 320, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      if (vivo) setUrl(u)
    }).catch(() => {})
    return () => { vivo = false }
  }, [code])
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 text-center">
      {total > 1 && <p className="text-xs text-[#8B8BA8] mb-2">Entrada {idx} de {total}</p>}
      <div className="bg-white rounded-xl p-2.5 mx-auto w-fit">
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="QR entrada" width={180} height={180} className="block" />
          : <div className="w-[180px] h-[180px] skeleton rounded-lg" />}
      </div>
      {url && (
        <a href={url} download={`entrada-${idx}.png`} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/8 border border-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/12">
          <Download size={13} /> Guardar
        </a>
      )}
    </div>
  )
}
