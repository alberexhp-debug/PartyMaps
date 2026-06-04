'use client'
import { useEffect, useState, useCallback } from 'react'
import { PageHeader, SectionCard } from '@/components/local-panel/ui'
import { useToast } from '@/components/ui/Toast'
import { Search, Star, X, Ticket, Beer, Wallet, Clock, Phone, Save } from 'lucide-react'

type Cliente = {
  usuario_id: string; nombre: string; edad: number | null; foto: string | null; telefono: string | null
  visitas: number; entradas: number; consumiciones: number; gasto: number; ultima: string | null
  vip: boolean; notas: string | null
}
const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(/\.00$/, '')} €`
const fecha = (s: string | null) => s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [soloVip, setSoloVip] = useState(false)
  const [detalle, setDetalle] = useState<Cliente | null>(null)

  const cargar = useCallback(async () => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (soloVip) params.set('filtro', 'vip')
    const r = await fetch(`/api/local-panel/clientes?${params}`).then(x => x.ok ? x.json() : { clientes: [] }).catch(() => ({ clientes: [] }))
    setClientes(r.clientes ?? [])
    setLoading(false)
  }, [q, soloVip])

  useEffect(() => { const t = setTimeout(cargar, q ? 300 : 0); return () => clearTimeout(t) }, [cargar, q])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <PageHeader eyebrow="Audiencia" titulo="Clientes" subtitulo="Tu base de clientes: quién viene, cuánto gasta y quién es VIP." />

      {/* Buscador + filtro */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2 flex-1 rounded-xl bg-white/5 border border-white/10 px-3">
          <Search size={15} className="text-[#6B6B85]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono…"
            className="flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-[#6B6B85]" />
        </div>
        <button onClick={() => setSoloVip(v => !v)}
          className={`px-3.5 rounded-xl border text-sm font-medium inline-flex items-center gap-1.5 transition-colors ${
            soloVip ? 'border-[#F39C12] bg-[#F39C12]/12 text-[#F39C12]' : 'border-white/10 text-[#8B8BA8] hover:text-white'
          }`}>
          <Star size={14} className={soloVip ? 'fill-[#F39C12]' : ''} /> VIP
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}</div>
      ) : clientes.length === 0 ? (
        <SectionCard>
          <p className="text-center text-[#8B8BA8] py-6 text-sm">
            {q || soloVip ? 'Ningún cliente con esos filtros.' : 'Aún no tienes clientes registrados. Aparecerán cuando alguien compre una entrada o pida en la barra.'}
          </p>
        </SectionCard>
      ) : (
        <>
          <p className="text-xs text-[#6B6B85]">{clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}</p>
          <div className="space-y-2">
            {clientes.map(c => (
              <button key={c.usuario_id} onClick={() => setDetalle(c)}
                className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                <div className="w-11 h-11 rounded-full bg-[#E94560]/15 flex items-center justify-center shrink-0 text-white font-semibold overflow-hidden">
                  {c.foto
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.foto} alt="" className="w-full h-full object-cover" />
                    : c.nombre.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-white truncate">{c.nombre}</p>
                    {c.vip && <Star size={13} className="text-[#F39C12] fill-[#F39C12] shrink-0" />}
                    {c.edad != null && <span className="text-[11px] text-[#6B6B85]">· {c.edad}</span>}
                  </div>
                  <p className="text-[11px] text-[#8B8BA8]">{c.visitas} {c.visitas === 1 ? 'visita' : 'visitas'} · última {fecha(c.ultima)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white text-numeric">{eur(c.gasto)}</p>
                  <p className="text-[10px] text-[#6B6B85]">gastado</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {detalle && <ClienteDetalle cliente={detalle} onClose={() => setDetalle(null)} onSaved={(c) => { setDetalle(null); setClientes(prev => prev.map(x => x.usuario_id === c.usuario_id ? c : x)) }} />}
    </div>
  )
}

function ClienteDetalle({ cliente, onClose, onSaved }: { cliente: Cliente; onClose: () => void; onSaved: (c: Cliente) => void }) {
  const toast = useToast()
  const [vip, setVip] = useState(cliente.vip)
  const [notas, setNotas] = useState(cliente.notas ?? '')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    const r = await fetch('/api/local-panel/clientes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: cliente.usuario_id, vip, notas }),
    })
    const j = await r.json().catch(() => ({}))
    setGuardando(false)
    if (!r.ok) { toast.error(j.error || 'No se pudo guardar'); return }
    toast.success('Cliente actualizado')
    onSaved({ ...cliente, vip, notas: notas.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[#E94560]/15 flex items-center justify-center shrink-0 text-white font-semibold overflow-hidden">
              {cliente.foto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cliente.foto} alt="" className="w-full h-full object-cover" />
                : cliente.nombre.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate flex items-center gap-1.5">{cliente.nombre} {vip && <Star size={14} className="text-[#F39C12] fill-[#F39C12]" />}</p>
              <p className="text-xs text-[#8B8BA8]">
                {cliente.edad != null ? `${cliente.edad} años` : 'Edad n/d'}
                {cliente.telefono && <span className="inline-flex items-center gap-1 ml-2"><Phone size={11} /> {cliente.telefono}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white shrink-0"><X size={20} /></button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Metric icon={Ticket} label="Entradas" valor={cliente.entradas} />
          <Metric icon={Beer} label="Consumiciones" valor={cliente.consumiciones} />
          <Metric icon={Wallet} label="Gastado" valor={eur(cliente.gasto)} />
        </div>
        <p className="text-xs text-[#8B8BA8] mb-4 flex items-center gap-1.5"><Clock size={12} /> Última visita: {fecha(cliente.ultima)}</p>

        {/* VIP + notas */}
        <button onClick={() => setVip(v => !v)}
          className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 mb-3 transition-colors ${
            vip ? 'border-[#F39C12]/40 bg-[#F39C12]/10' : 'border-white/10 bg-white/[0.03]'
          }`}>
          <span className="text-sm font-semibold text-white flex items-center gap-2"><Star size={15} className={vip ? 'text-[#F39C12] fill-[#F39C12]' : 'text-[#8B8BA8]'} /> Cliente VIP</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vip ? 'bg-[#F39C12]/20 text-[#F39C12]' : 'bg-white/8 text-[#8B8BA8]'}`}>{vip ? 'Sí' : 'No'}</span>
        </button>
        <textarea value={notas} onChange={e => setNotas(e.target.value.slice(0, 500))} rows={3} placeholder="Notas internas (bebida favorita, alergias, incidencias…)"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E94560]/60 resize-none placeholder:text-[#6B6B85]" />

        <button onClick={guardar} disabled={guardando} className="mt-4 w-full btn-primary inline-flex items-center justify-center gap-2">
          <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, valor }: { icon: React.ElementType; label: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
      <Icon size={15} className="mx-auto text-[#8B8BA8] mb-1" />
      <p className="text-sm font-bold text-white text-numeric">{valor}</p>
      <p className="text-[10px] text-[#6B6B85]">{label}</p>
    </div>
  )
}
