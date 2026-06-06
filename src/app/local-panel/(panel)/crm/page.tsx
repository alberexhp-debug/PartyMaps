'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { PageHeader, SectionCard, StatCard, EmptyState } from '@/components/local-panel/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  Users, Repeat, Coins, AlertCircle, Search, Star, X, Ticket, Beer, Wallet, Clock,
  Phone, Save, Lock, Mail, Download, ChevronRight,
} from 'lucide-react'

type Cliente = {
  usuario_id: string; nombre: string; edad: number | null; cumple_mes: boolean; foto: string | null; telefono: string | null
  visitas: number; entradas: number; consumiciones: number; gasto: number; ultima: string | null
  vip: boolean; notas: string | null; etiquetas: string[]; contactable: boolean
}
type TabCRM = 'resumen' | 'clientes' | 'segmentos' | 'campanas' | 'ajustes'
const TABS: { id: TabCRM; label: string }[] = [
  { id: 'resumen', label: 'Resumen' }, { id: 'clientes', label: 'Clientes' },
  { id: 'segmentos', label: 'Segmentos' }, { id: 'campanas', label: 'Campañas' }, { id: 'ajustes', label: 'Ajustes' },
]
type Chip = 'todos' | 'vip' | 'riesgo' | 'cumple' | 'sinmkt'

const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(/\.00$/, '')} €`
const fecha = (s: string | null) => s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const diasDesde = (s: string | null) => s ? Math.floor((Date.now() - new Date(s).getTime()) / 86400000) : Infinity
const enRiesgo = (c: Cliente) => c.visitas >= 3 && diasDesde(c.ultima) > 30

export default function CRMPage() {
  return <Suspense fallback={<div className="min-h-screen" />}><CRMContent /></Suspense>
}

function CRMContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { local } = useLocalPanelStore()
  const tier = local?.tier ?? 'visibility'
  const esPro = tier === 'pro' || tier === 'destacado'

  const [tab, setTab] = useState<TabCRM>(() => {
    const t = searchParams.get('tab') as TabCRM | null
    return TABS.some(x => x.id === t) ? t! : 'resumen'
  })
  const irTab = (t: TabCRM) => { setTab(t); router.replace(`/local-panel/crm?tab=${t}`) }

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [chip, setChip] = useState<Chip>('todos')

  const cargar = useCallback(async () => {
    const r = await fetch('/api/local-panel/clientes').then(x => x.ok ? x.json() : { clientes: [] }).catch(() => ({ clientes: [] }))
    setClientes(r.clientes ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const resumen = useMemo(() => {
    const total = clientes.length
    const repiten = clientes.filter(c => c.visitas >= 2).length
    const visitasTot = clientes.reduce((s, c) => s + c.visitas, 0)
    const gastoTot = clientes.reduce((s, c) => s + c.gasto, 0)
    return {
      total,
      repitenPct: total ? Math.round((repiten / total) * 100) : 0,
      gastoMedio: visitasTot ? gastoTot / visitasTot : 0,
      riesgo: clientes.filter(enRiesgo).length,
      cumple: clientes.filter(c => c.cumple_mes).length,
    }
  }, [clientes])

  return (
    <div className="relative p-4 md:p-8 pb-24 md:pb-8 space-y-5 overflow-hidden">
      <PageHeader eyebrow="AUDIENCIA" titulo="CRM" subtitulo="Tu clientela, con datos y con ley" acento="rose" />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/8 -mt-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => irTab(t.id)}
            className={cn('shrink-0 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-[#E0455E] text-[#FAFAFC]' : 'border-transparent text-[#8B8BA8] hover:text-white')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <ResumenTab loading={loading} r={resumen} onVer={(c) => { setChip(c); irTab('clientes') }} />}
      {tab === 'clientes' && <ClientesTab clientes={clientes} loading={loading} chip={chip} setChip={setChip} onActualizar={cargar} />}
      {tab === 'segmentos' && <GateOPlaceholder esPro={esPro} titulo="Segmentos" frase="Con Pro segmentas a tu clientela (recuperar, top gasto, cumpleaños…) y la contactas." />}
      {tab === 'campanas' && <GateOPlaceholder esPro={esPro} titulo="Campañas" frase="Con Pro lanzas push, email y export a tus segmentos — y ves quién volvió." />}
      {tab === 'ajustes' && <AjustesScaffold />}
    </div>
  )
}

function ResumenTab({ loading, r, onVer }: { loading: boolean; r: { total: number; repitenPct: number; gastoMedio: number; riesgo: number; cumple: number }; onVer: (c: Chip) => void }) {
  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>
  if (r.total === 0) return <EmptyState icon={Users} acento="blue" titulo="Tu clientela aparecerá aquí" descripcion="Con cada venta de entrada o pedido de barra se añade un cliente a tu CRM." />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Clientes" value={String(r.total)} acento="blue" />
        <StatCard icon={Repeat} label="Repiten" value={`${r.repitenPct}%`} sublabel="2+ visitas" acento="violet" />
        <StatCard icon={Coins} label="Gasto medio" value={eur(r.gastoMedio)} sublabel="por visita" acento="gold" />
        <StatCard icon={AlertCircle} label="En riesgo" value={String(r.riesgo)} sublabel="30+ días sin venir" acento="rose" />
      </div>
      {(r.riesgo > 0 || r.cumple > 0) && (
        <SectionCard>
          <p className="text-sm font-bold text-white mb-3">Acciones sugeridas</p>
          <div className="space-y-2">
            {r.riesgo > 0 && (
              <button onClick={() => onVer('riesgo')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] transition-colors text-left">
                <span className="text-lg">🔁</span>
                <span className="flex-1 text-sm text-white">{r.riesgo} {r.riesgo === 1 ? 'cliente' : 'clientes'} en riesgo de no volver</span>
                <ChevronRight size={16} className="text-[#6B6B85]" />
              </button>
            )}
            {r.cumple > 0 && (
              <button onClick={() => onVer('cumple')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] transition-colors text-left">
                <span className="text-lg">🎂</span>
                <span className="flex-1 text-sm text-white">{r.cumple} {r.cumple === 1 ? 'cliente cumple' : 'clientes cumplen'} años este mes</span>
                <ChevronRight size={16} className="text-[#6B6B85]" />
              </button>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function ClientesTab({ clientes, loading, chip, setChip, onActualizar }: { clientes: Cliente[]; loading: boolean; chip: Chip; setChip: (c: Chip) => void; onActualizar: () => void }) {
  const [q, setQ] = useState('')
  const [detalle, setDetalle] = useState<Cliente | null>(null)

  const CHIPS: { id: Chip; label: string }[] = [
    { id: 'todos', label: 'Todos' }, { id: 'vip', label: '⭐ VIP' }, { id: 'riesgo', label: '🔁 En riesgo' },
    { id: 'cumple', label: '🎂 Cumple' }, { id: 'sinmkt', label: '📵 Sin marketing' },
  ]
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    return clientes.filter(c => {
      if (term && !c.nombre.toLowerCase().includes(term) && !(c.telefono ?? '').includes(term)) return false
      if (chip === 'vip') return c.vip
      if (chip === 'riesgo') return enRiesgo(c)
      if (chip === 'cumple') return c.cumple_mes
      if (chip === 'sinmkt') return !c.contactable
      return true
    })
  }, [clientes, q, chip])

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3">
        <Search size={15} className="text-[#6B6B85]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono…"
          className="flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-[#6B6B85]" />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CHIPS.map(c => (
          <button key={c.id} onClick={() => setChip(c.id)}
            className={cn('shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors',
              chip === c.id ? 'bg-[#E0455E] text-white' : 'glass-subtle text-[#B8B8CC] hover:text-white')}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}</div>
      ) : filtrados.length === 0 ? (
        <SectionCard><p className="text-center text-[#8B8BA8] py-6 text-sm">Ningún cliente con esos filtros.</p></SectionCard>
      ) : (
        <>
          <p className="text-xs text-[#6B6B85]">{filtrados.length} {filtrados.length === 1 ? 'cliente' : 'clientes'}</p>
          <div className="space-y-2">
            {filtrados.map(c => (
              <button key={c.usuario_id} onClick={() => setDetalle(c)}
                className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                <div className="w-11 h-11 rounded-full bg-[#E94560]/15 flex items-center justify-center shrink-0 text-white font-semibold overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.foto ? <img src={c.foto} alt="" className="w-full h-full object-cover" /> : c.nombre.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.contactable ? '#27AE60' : '#4A4A60' }} title={c.contactable ? 'Contactable' : 'Sin consentimiento'} />
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
          <p className="text-[11px] text-[#6B6B85] pt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#27AE60]" /> contactable</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4A4A60]" /> sin consentimiento</span>
          </p>
        </>
      )}

      {detalle && <ClienteFicha cliente={detalle} onClose={() => setDetalle(null)} onSaved={() => { setDetalle(null); onActualizar() }} />}
    </div>
  )
}

type Historial = {
  entradas: { id: string; fecha: string; importe: number; estado: string }[]
  barra: { id: string; fecha: string; importe: number; estado: string }[]
  reservas: { id: string; fecha: string; estado: string; importe: number | null }[]
  reviews: { id: string; fecha: string; puntuacion: number; comentario: string | null }[]
}

function ClienteFicha({ cliente, onClose, onSaved }: { cliente: Cliente; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [vip, setVip] = useState(cliente.vip)
  const [notas, setNotas] = useState(cliente.notas ?? '')
  const [etiquetas, setEtiquetas] = useState<string[]>(cliente.etiquetas ?? [])
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [hist, setHist] = useState<Historial | null>(null)
  const [consent, setConsent] = useState<{ estado: string; origen: string; fecha: string } | null>(null)

  useEffect(() => {
    fetch(`/api/local-panel/crm/cliente?usuario_id=${cliente.usuario_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setHist(d.historial); setConsent(d.consentimiento) } })
      .catch(() => {})
  }, [cliente.usuario_id])

  const addEtiqueta = () => {
    const e = nuevaEtiqueta.trim()
    if (e && !etiquetas.includes(e)) setEtiquetas(prev => [...prev, e])
    setNuevaEtiqueta('')
  }

  async function guardar() {
    setGuardando(true)
    const r = await fetch('/api/local-panel/clientes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: cliente.usuario_id, vip, notas, etiquetas }),
    })
    const j = await r.json().catch(() => ({}))
    setGuardando(false)
    if (!r.ok) { toast.error(j.error || 'No se pudo guardar'); return }
    toast.success('Cliente actualizado')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#E94560]/15 flex items-center justify-center shrink-0 text-white font-semibold text-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cliente.foto ? <img src={cliente.foto} alt="" className="w-full h-full object-cover" /> : cliente.nombre.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-lg text-display truncate flex items-center gap-1.5">{cliente.nombre} {vip && <Star size={15} className="text-[#F39C12] fill-[#F39C12]" />}</p>
              <p className="text-xs text-[#8B8BA8]">
                {cliente.edad != null ? `${cliente.edad} años` : 'Edad n/d'}
                {cliente.telefono && <span className="inline-flex items-center gap-1 ml-2"><Phone size={11} /> {cliente.telefono}</span>}
              </p>
              <div className="mt-1">
                {consent?.estado === 'acepta'
                  ? <span className="inline-flex items-center gap-1 text-[11px] text-[#27AE60]">Marketing ✓ {fecha(consent.fecha)}</span>
                  : <span className="text-[11px] text-[#8B8BA8]">Sin permiso de contacto</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white shrink-0"><X size={20} /></button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Metric icon={Ticket} label="Visitas" valor={cliente.visitas} />
          <Metric icon={Wallet} label="Gastado" valor={eur(cliente.gasto)} />
          <Metric icon={Coins} label="Ticket" valor={eur(cliente.visitas ? cliente.gasto / cliente.visitas : 0)} />
          <Metric icon={Clock} label="Última" valor={cliente.ultima ? `${diasDesde(cliente.ultima)}d` : '—'} />
        </div>

        {/* Historial */}
        <div className="space-y-2 mb-4">
          <Acordeon icon={Ticket} color="#E0455E" titulo="Entradas" n={hist?.entradas.length ?? 0}>
            {hist?.entradas.map(e => <FilaHist key={e.id} fecha={e.fecha} concepto="Entrada" importe={e.importe} />)}
          </Acordeon>
          <Acordeon icon={Beer} color="#D4A84B" titulo="Barra" n={hist?.barra.length ?? 0}>
            {hist?.barra.map(p => <FilaHist key={p.id} fecha={p.fecha} concepto="Pedido de barra" importe={p.importe} />)}
          </Acordeon>
          <Acordeon icon={Wallet} color="#7C5CFF" titulo="Reservas" n={hist?.reservas.length ?? 0}>
            {hist?.reservas.map(r => <FilaHist key={r.id} fecha={r.fecha} concepto={`Reserva · ${r.estado}`} importe={r.importe} />)}
          </Acordeon>
          <Acordeon icon={Star} color="#27AE60" titulo="Valoraciones" n={hist?.reviews.length ?? 0}>
            {hist?.reviews.map(r => <FilaHist key={r.id} fecha={r.fecha} concepto={`${'★'.repeat(r.puntuacion)} ${r.comentario ?? ''}`} />)}
          </Acordeon>
        </div>

        {/* Etiquetas */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-[#8B8BA8] mb-1.5">Etiquetas</p>
          <div className="flex flex-wrap gap-1.5">
            {etiquetas.map(e => (
              <span key={e} className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white">
                {e}
                <button onClick={() => setEtiquetas(prev => prev.filter(x => x !== e))} className="text-[#8B8BA8] hover:text-white"><X size={11} /></button>
              </span>
            ))}
            <input value={nuevaEtiqueta} onChange={e => setNuevaEtiqueta(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEtiqueta() } }}
              placeholder="+ Añadir" className="px-2.5 h-7 rounded-full bg-transparent border border-dashed border-[#2A2A3E] text-xs text-white outline-none placeholder:text-[#6B6B85] w-24 focus:border-[#E0455E]/60" />
          </div>
        </div>

        {/* VIP + notas */}
        <button onClick={() => setVip(v => !v)}
          className={cn('w-full flex items-center justify-between rounded-xl border px-4 py-3 mb-3 transition-colors',
            vip ? 'border-[#F39C12]/40 bg-[#F39C12]/10' : 'border-white/10 bg-white/[0.03]')}>
          <span className="text-sm font-semibold text-white flex items-center gap-2"><Star size={15} className={vip ? 'text-[#F39C12] fill-[#F39C12]' : 'text-[#8B8BA8]'} /> Cliente VIP</span>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', vip ? 'bg-[#F39C12]/20 text-[#F39C12]' : 'bg-white/8 text-[#8B8BA8]')}>{vip ? 'Sí' : 'No'}</span>
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

function Acordeon({ icon: Icon, color, titulo, n, children }: { icon: React.ElementType; color: string; titulo: string; n: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <button onClick={() => n > 0 && setOpen(o => !o)} className={cn('w-full flex items-center gap-2.5 px-3.5 py-2.5', n === 0 && 'opacity-50')}>
        <Icon size={15} style={{ color }} />
        <span className="flex-1 text-left text-sm text-white">{titulo}</span>
        <span className="text-xs text-[#8B8BA8] text-numeric">{n}</span>
        {n > 0 && <ChevronRight size={15} className={cn('text-[#6B6B85] transition-transform', open && 'rotate-90')} />}
      </button>
      {open && <div className="px-3.5 pb-2.5 divide-y divide-white/[0.05]">{children}</div>}
    </div>
  )
}

function FilaHist({ fecha: f, concepto, importe }: { fecha: string; concepto: string; importe?: number | null }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-[11px] text-[#8B8BA8] w-20 shrink-0">{fecha(f)}</span>
      <span className="flex-1 text-[13px] text-white truncate">{concepto}</span>
      {importe != null && <span className="text-[13px] text-white text-numeric shrink-0">{eur(importe)}</span>}
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

// Segmentos/Campañas: gating de tier (Venta) o placeholder "próximamente" (Pro) hasta PR-10.
function GateOPlaceholder({ esPro, titulo, frase }: { esPro: boolean; titulo: string; frase: string }) {
  const router = useRouter()
  if (!esPro) {
    return (
      <SectionCard className="text-center py-10">
        <div className="w-12 h-12 rounded-2xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/25 flex items-center justify-center mx-auto mb-3">
          <Lock size={20} className="text-[#7C5CFF]" />
        </div>
        <p className="font-bold text-white">{titulo} es de Pro</p>
        <p className="text-sm text-[#8B8BA8] mt-1 max-w-sm mx-auto">{frase}</p>
        <button onClick={() => router.push('/local-panel/facturacion')} className="mt-4 btn-primary inline-flex">Ver planes</button>
      </SectionCard>
    )
  }
  return (
    <SectionCard className="text-center py-10">
      <p className="text-sm text-[#8B8BA8]">{titulo}: en camino. La segmentación y las campañas llegan en la próxima entrega.</p>
    </SectionCard>
  )
}

function AjustesScaffold() {
  return (
    <div className="space-y-3 max-w-2xl">
      <SectionCard>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#4F8EF7]/15 border border-[#4F8EF7]/25 flex items-center justify-center"><Mail size={16} className="text-[#4F8EF7]" /></span>
          <div className="flex-1"><p className="text-sm font-semibold text-white">Email (Brevo)</p><p className="text-xs text-[#8B8BA8]">Conecta tu cuenta para sincronizar segmentos.</p></div>
          <span className="text-[11px] text-[#8B8BA8]">Próximamente</span>
        </div>
      </SectionCard>
      <SectionCard>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#4F8EF7]/15 border border-[#4F8EF7]/25 flex items-center justify-center"><Download size={16} className="text-[#4F8EF7]" /></span>
          <div className="flex-1"><p className="text-sm font-semibold text-white">Importar clientela</p><p className="text-xs text-[#8B8BA8]">Sube tu Excel con declaración responsable.</p></div>
          <span className="text-[11px] text-[#8B8BA8]">Próximamente</span>
        </div>
      </SectionCard>
    </div>
  )
}
