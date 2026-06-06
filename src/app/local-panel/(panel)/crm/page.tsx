'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { PageHeader, SectionCard, StatCard, EmptyState } from '@/components/local-panel/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import {
  Users, Repeat, Coins, AlertCircle, Search, Star, X, Ticket, Beer, Wallet, Clock,
  Phone, Save, Lock, Mail, Download, ChevronRight, Plus, Send, Trash2, ArrowLeft,
  ShieldCheck, FileText, Upload,
} from 'lucide-react'
import type { ClienteCRM as Cliente } from '@/lib/crm/clientes'
import {
  aplicarSegmento, contarSegmento, SEGMENTOS_PRECREADOS, CAMPOS_FILTRO, LABEL_OP,
  type FiltroSegmento, type SegmentoDef, type OpFiltro,
} from '@/lib/crm/segmentos'
import { tierPermite } from '@/lib/crm/tier'
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
  const esPro = tierPermite(tier, 'segmentos')
  const contratoOk = !!local?.crm_contrato_aceptado_at

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
      {tab === 'segmentos' && <SegmentosTab clientes={clientes} esPro={esPro} contratoOk={contratoOk} loading={loading} onIrAjustes={() => irTab('ajustes')} />}
      {tab === 'campanas' && <CampanasTab esPro={esPro} />}
      {tab === 'ajustes' && <AjustesTab />}
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

// ─────────────────────────── Segmentos ───────────────────────────
function SegmentosTab({ clientes, esPro, contratoOk, loading, onIrAjustes }: { clientes: Cliente[]; esPro: boolean; contratoOk: boolean; loading: boolean; onIrAjustes: () => void }) {
  const toast = useToast()
  const [propios, setPropios] = useState<SegmentoDef[]>([])
  const [sel, setSel] = useState<SegmentoDef | null>(null)
  const [builder, setBuilder] = useState(false)

  const cargar = useCallback(() => {
    fetch('/api/local-panel/crm/segmentos').then(r => r.ok ? r.json() : null).then(d => { if (d?.segmentos) setPropios(d.segmentos) }).catch(() => {})
  }, [])
  useEffect(() => { if (esPro) cargar() }, [esPro, cargar])

  const eliminar = async (id: string) => {
    await fetch(`/api/local-panel/crm/segmentos?id=${id}`, { method: 'DELETE' })
    setPropios(prev => prev.filter(s => s.id !== id))
    toast.success('Segmento eliminado')
  }

  const todos = [...SEGMENTOS_PRECREADOS, ...(esPro ? propios : [])]
  const grid = (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {todos.map(s => {
        const { total, contactables } = loading ? { total: 0, contactables: 0 } : contarSegmento(clientes, s.filtros)
        return (
          <div key={s.id} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 hover:bg-white/[0.06] transition-colors relative">
            {!s.pre_creado && (
              <button onClick={() => eliminar(s.id)} className="absolute top-2 right-2 text-[#6B6B85] hover:text-[#E94560]" aria-label="Eliminar"><Trash2 size={13} /></button>
            )}
            <button onClick={() => setSel(s)} className="w-full text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{s.emoji}</span>
                {s.pre_creado && <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6B6B85]">De serie</span>}
              </div>
              <p className="font-semibold text-white text-sm">{s.nombre}</p>
              <p className="text-[11px] text-[#8B8BA8] mt-0.5 leading-snug">{s.descripcion}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xl font-bold text-white text-numeric">{total}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#27AE60]/15 text-[#27AE60] border border-[#27AE60]/25">{contactables} contactables</span>
              </div>
            </button>
          </div>
        )
      })}
      {esPro && (
        <button onClick={() => setBuilder(true)}
          className="rounded-2xl border border-dashed border-[#2A2A3E] p-4 flex flex-col items-center justify-center gap-1.5 text-[#8B8BA8] hover:border-[#E0455E]/60 hover:text-white transition-colors min-h-[120px]">
          <Plus size={20} /> <span className="text-sm font-medium">Nuevo segmento</span>
        </button>
      )}
    </div>
  )

  // Tier Venta: el contenido real se ve borroso detrás del candado (vende lo que te pierdes).
  if (!esPro) return <GateBlur frase="Con Pro segmentas a tu clientela (recuperar, top gasto, cumpleaños…) y la contactas.">{grid}</GateBlur>
  // Pro sin contrato: hay que aceptar el encargo antes de contactar.
  if (!contratoOk) return <ContratoPendiente onIrAjustes={onIrAjustes} />
  if (sel) return <SegmentoDetalle seg={sel} clientes={clientes} onVolver={() => setSel(null)} />
  return <div className="space-y-3">{grid}{builder && <BuilderModal clientes={clientes} onClose={() => setBuilder(false)} onGuardado={() => { setBuilder(false); cargar() }} />}</div>
}

// Candado de tier con el contenido real borroso detrás (doc 02 §14.8).
function GateBlur({ children, frase }: { children: React.ReactNode; frase: string }) {
  const router = useRouter()
  return (
    <div className="relative">
      <div className="blur-md opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-6 text-center max-w-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/25 flex items-center justify-center mx-auto mb-3"><Lock size={20} className="text-[#7C5CFF]" /></div>
          <p className="font-bold text-white">Función de Pro</p>
          <p className="text-sm text-[#8B8BA8] mt-1">{frase}</p>
          <button onClick={() => router.push('/local-panel/facturacion')} className="mt-4 btn-primary inline-flex">Ver planes</button>
        </div>
      </div>
    </div>
  )
}

function ContratoPendiente({ onIrAjustes }: { onIrAjustes: () => void }) {
  return (
    <SectionCard className="text-center py-10 border-[#F39C12]/30">
      <div className="w-12 h-12 rounded-2xl bg-[#F39C12]/15 border border-[#F39C12]/25 flex items-center justify-center mx-auto mb-3"><Lock size={20} className="text-[#F39C12]" /></div>
      <p className="font-bold text-white">Acepta el contrato de encargo</p>
      <p className="text-sm text-[#8B8BA8] mt-1 max-w-sm mx-auto">Para segmentar y contactar a tu clientela conforme al RGPD, primero firma el contrato de encargo en Ajustes.</p>
      <button onClick={onIrAjustes} className="mt-4 btn-primary inline-flex">Ir a Ajustes</button>
    </SectionCard>
  )
}

function SegmentoDetalle({ seg, clientes, onVolver }: { seg: SegmentoDef; clientes: Cliente[]; onVolver: () => void }) {
  const [exportar, setExportar] = useState(false)
  const [push, setPush] = useState(false)
  const lista = aplicarSegmento(clientes, seg.filtros)
  const contactables = lista.filter(c => c.contactable).length
  return (
    <div className="space-y-3 max-w-3xl">
      <button onClick={onVolver} className="inline-flex items-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white"><ArrowLeft size={15} /> Segmentos</button>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{seg.emoji}</span>
        <div className="flex-1">
          <p className="font-bold text-white text-display">{seg.nombre}</p>
          <p className="text-xs text-[#8B8BA8]">{lista.length} clientes · {contactables} contactables</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setPush(true)} disabled={contactables === 0} className="flex-1 btn-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-50"><Send size={14} /> Push</button>
        <button onClick={() => setExportar(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-white/10 text-sm text-white hover:bg-white/5"><Download size={14} /> Exportar</button>
      </div>
      <div className="space-y-2">
        {lista.map(c => (
          <div key={c.usuario_id} className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.contactable ? '#27AE60' : '#4A4A60' }} />
            <span className="flex-1 text-sm text-white truncate">{c.nombre}</span>
            <span className="text-xs text-[#8B8BA8] text-numeric">{eur(c.gasto)}</span>
          </div>
        ))}
        {lista.length === 0 && <p className="text-center text-[#8B8BA8] py-6 text-sm">Ningún cliente en este segmento ahora mismo.</p>}
      </div>
      {exportar && <ExportModal filtros={seg.filtros} onClose={() => setExportar(false)} />}
      {push && <PushModal filtros={seg.filtros} nombre={seg.nombre} contactables={contactables} onClose={() => setPush(false)} />}
    </div>
  )
}

function BuilderModal({ clientes, onClose, onGuardado }: { clientes: Cliente[]; onClose: () => void; onGuardado: () => void }) {
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('⭐')
  const [filtros, setFiltros] = useState<FiltroSegmento[]>([{ campo: 'visitas', op: '>=', valor: 1 }])
  const [guardando, setGuardando] = useState(false)
  const preview = contarSegmento(clientes, filtros)

  const setFila = (i: number, patch: Partial<FiltroSegmento>) => setFiltros(prev => prev.map((f, j) => j === i ? { ...f, ...patch } : f))
  const campoDef = (campo: string) => CAMPOS_FILTRO.find(c => c.campo === campo) ?? CAMPOS_FILTRO[0]

  async function guardar() {
    if (!nombre.trim()) { toast.error('Ponle nombre al segmento'); return }
    setGuardando(true)
    const r = await fetch('/api/local-panel/crm/segmentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, emoji, filtros }) })
    setGuardando(false)
    if (!r.ok) { toast.error('No se pudo guardar'); return }
    toast.success('Segmento guardado'); onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><p className="font-bold text-white text-display">Nuevo segmento</p><button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button></div>
        <div className="space-y-2">
          {filtros.map((f, i) => {
            const def = campoDef(f.campo)
            return (
              <div key={i} className="flex items-center gap-1.5">
                <select value={f.campo} onChange={e => { const d = campoDef(e.target.value); setFila(i, { campo: e.target.value, op: d.ops[0], valor: d.tipo === 'bool' ? true : '' }) }}
                  className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 text-xs text-white px-2 py-2 outline-none">
                  {CAMPOS_FILTRO.map(c => <option key={c.campo} value={c.campo}>{c.label}</option>)}
                </select>
                <select value={f.op} onChange={e => setFila(i, { op: e.target.value as OpFiltro })} className="rounded-lg bg-white/5 border border-white/10 text-xs text-white px-2 py-2 outline-none">
                  {def.ops.map(o => <option key={o} value={o}>{LABEL_OP[o]}</option>)}
                </select>
                {def.tipo === 'bool'
                  ? <select value={String(f.valor)} onChange={e => setFila(i, { valor: e.target.value === 'true' })} className="w-16 rounded-lg bg-white/5 border border-white/10 text-xs text-white px-2 py-2 outline-none"><option value="true">Sí</option><option value="false">No</option></select>
                  : <input value={String(f.valor ?? '')} onChange={e => setFila(i, { valor: def.tipo === 'num' ? Number(e.target.value) : e.target.value })} type={def.tipo === 'num' ? 'number' : 'text'} className="w-16 rounded-lg bg-white/5 border border-white/10 text-xs text-white px-2 py-2 outline-none" />}
                {filtros.length > 1 && <button onClick={() => setFiltros(prev => prev.filter((_, j) => j !== i))} className="text-[#6B6B85] hover:text-[#E94560] shrink-0"><X size={14} /></button>}
              </div>
            )
          })}
          <button onClick={() => setFiltros(prev => [...prev, { campo: 'gasto_total', op: '>=', valor: 0 }])} className="text-xs text-[#4F8EF7] hover:underline">+ y además…</button>
        </div>
        <div className="mt-3 rounded-xl glass-subtle p-3 text-sm text-[#B8B8CC]">Resultado: <span className="text-white font-semibold">{preview.total}</span> clientes · {preview.contactables} contactables</div>
        <div className="mt-3 flex gap-2">
          <input value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))} className="w-12 text-center rounded-lg bg-white/5 border border-white/10 text-white px-2 py-2 outline-none" />
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del segmento" className="flex-1 rounded-lg bg-white/5 border border-white/10 text-sm text-white px-3 py-2 outline-none placeholder:text-[#6B6B85]" />
        </div>
        <button onClick={guardar} disabled={guardando} className="mt-4 w-full btn-primary inline-flex items-center justify-center gap-2"><Save size={16} /> {guardando ? 'Guardando…' : 'Guardar segmento'}</button>
      </div>
    </div>
  )
}

const COLS_EXPORT = [
  { id: 'nombre', label: 'Nombre' }, { id: 'telefono', label: 'Teléfono' }, { id: 'email', label: 'Email' },
  { id: 'edad', label: 'Edad' }, { id: 'visitas', label: 'Visitas' }, { id: 'gasto_total', label: 'Gasto total' },
  { id: 'ticket_medio', label: 'Ticket medio' }, { id: 'ultima_visita', label: 'Última visita' },
  { id: 'etiquetas', label: 'Etiquetas' }, { id: 'vip', label: 'VIP' }, { id: 'consentimiento', label: 'Consentimiento' },
]

function ExportModal({ filtros, onClose }: { filtros: FiltroSegmento[]; onClose: () => void }) {
  const toast = useToast()
  const [modo, setModo] = useState<'operativo' | 'marketing'>('operativo')
  const [cols, setCols] = useState<string[]>(COLS_EXPORT.map(c => c.id))
  const [bajando, setBajando] = useState(false)

  async function descargar() {
    setBajando(true)
    try {
      const r = await fetch('/api/local-panel/crm/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modo, columnas: cols, filtros }) })
      if (!r.ok) { const j = await r.json().catch(() => ({})); toast.error(j.error || 'No se pudo exportar'); setBajando(false); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url
      a.download = (r.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]) || 'clientes.csv'
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast.success('Export registrado en la auditoría')
      onClose()
    } catch { toast.error('Error al exportar') }
    setBajando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><p className="font-bold text-white text-display">Exportar clientes</p><button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button></div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['operativo', 'marketing'] as const).map(m => (
            <button key={m} onClick={() => setModo(m)} className={cn('rounded-xl border p-3 text-left transition-colors', modo === m ? 'border-[#E0455E]/50 bg-[#E0455E]/10' : 'border-white/10 bg-white/[0.03]')}>
              <p className="text-sm font-semibold text-white capitalize">{m}</p>
              <p className="text-[11px] text-[#8B8BA8] mt-0.5">{m === 'operativo' ? 'Todos los clientes' : 'Solo contactables'}</p>
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-[#8B8BA8] mb-1.5">Columnas</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {COLS_EXPORT.map(c => {
            const on = cols.includes(c.id)
            return <button key={c.id} onClick={() => setCols(prev => on ? prev.filter(x => x !== c.id) : [...prev, c.id])}
              className={cn('px-2.5 h-7 rounded-full text-xs transition-colors', on ? 'bg-[#E0455E] text-white' : 'bg-white/[0.06] text-[#B8B8CC]')}>{c.label}</button>
          })}
        </div>
        <p className="text-[11px] text-[#F39C12] bg-[#F39C12]/10 border border-[#F39C12]/25 rounded-xl px-3 py-2 mb-4">Estos datos son responsabilidad de tu local. Úsalos conforme a la ley (RGPD/LSSI).</p>
        <button onClick={descargar} disabled={bajando} className="w-full btn-primary inline-flex items-center justify-center gap-2"><Download size={16} /> {bajando ? 'Generando…' : 'Descargar CSV'}</button>
      </div>
    </div>
  )
}

function PushModal({ filtros, nombre, contactables, onClose }: { filtros: FiltroSegmento[]; nombre: string; contactables: number; onClose: () => void }) {
  const toast = useToast()
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!titulo.trim() || !cuerpo.trim()) { toast.error('Falta título o mensaje'); return }
    setEnviando(true)
    const r = await fetch('/api/local-panel/crm/campanas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filtros, segmento_nombre: nombre, titulo, cuerpo }) })
    const j = await r.json().catch(() => ({}))
    setEnviando(false)
    if (!r.ok) { toast.error(j.error || 'No se pudo enviar'); return }
    toast.success(`Push enviado a ${j.enviados} contactables`); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1"><p className="font-bold text-white text-display">Push a «{nombre}»</p><button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button></div>
        <p className="text-xs text-[#8B8BA8] mb-4">Se enviará a {contactables} {contactables === 1 ? 'persona contactable' : 'personas contactables'}.</p>
        <input value={titulo} onChange={e => setTitulo(e.target.value.slice(0, 60))} placeholder="Título" className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white px-3.5 py-2.5 outline-none mb-2 placeholder:text-[#6B6B85]" />
        <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value.slice(0, 160))} rows={3} placeholder="Mensaje" className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white px-3.5 py-2.5 outline-none resize-none placeholder:text-[#6B6B85]" />
        <button onClick={enviar} disabled={enviando || contactables === 0} className="mt-4 w-full btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"><Send size={16} /> {enviando ? 'Enviando…' : 'Enviar push'}</button>
      </div>
    </div>
  )
}

// ─────────────────────────── Campañas ───────────────────────────
function CampanasTab({ esPro }: { esPro: boolean }) {
  const [campanas, setCampanas] = useState<{ id: string; tipo: string; segmento_nombre: string | null; titulo: string | null; enviados: number; resultado: { enviadas?: number }; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!esPro) { setLoading(false); return }
    fetch('/api/local-panel/crm/campanas').then(r => r.ok ? r.json() : null).then(d => { if (d?.campanas) setCampanas(d.campanas); setLoading(false) }).catch(() => setLoading(false))
  }, [esPro])

  if (!esPro) return (
    <GateBlur frase="Con Pro lanzas push a tus segmentos y ves el histórico de envíos.">
      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07]" />)}</div>
    </GateBlur>
  )
  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}</div>
  if (campanas.length === 0) return <EmptyState icon={Send} acento="rose" titulo="Tu primera campaña espera" descripcion="Abre un segmento y lanza un push a tus clientes contactables." />
  return (
    <div className="space-y-2 max-w-3xl">
      {campanas.map(c => (
        <div key={c.id} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#E0455E]/15 flex items-center justify-center shrink-0"><Send size={15} className="text-[#E0455E]" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{c.titulo || 'Push'}</p>
            <p className="text-[11px] text-[#8B8BA8]">{c.segmento_nombre ?? '—'} · {new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
          </div>
          <span className="text-xs text-[#8B8BA8] text-numeric shrink-0">{c.enviados} enviados</span>
        </div>
      ))}
    </div>
  )
}

function AjustesTab() {
  const { local, setLocal } = useLocalPanelStore()
  const [modal, setModal] = useState(false)
  const aceptado = local?.crm_contrato_aceptado_at
  const fecha = (s: string) => new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const descargar = () => {
    const blob = new Blob([CONTRATO_ENCARGO_TXT], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url
    a.download = 'contrato-encargo-rumbo.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {/* Protección de datos */}
      <SectionCard className={cn(!aceptado && 'border-[#F39C12]/40')}>
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#27AE60]/15 border border-[#27AE60]/25 flex items-center justify-center shrink-0"><ShieldCheck size={16} className="text-[#27AE60]" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Protección de datos</p>
            <p className="text-xs text-[#8B8BA8] mt-0.5">Contrato de encargo (art. 28 RGPD): tú eres el responsable de los datos; Rumbo, el encargado.</p>
            {aceptado ? (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#27AE60]/15 text-[#27AE60] border border-[#27AE60]/25">Aceptado el {fecha(aceptado)}</span>
                <button onClick={descargar} className="text-xs text-[#8B8BA8] hover:text-white inline-flex items-center gap-1"><FileText size={12} /> Descargar</button>
              </div>
            ) : (
              <button onClick={() => setModal(true)} className="mt-3 btn-primary inline-flex text-sm">Leer y aceptar</button>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Integraciones (Brevo) e importación — llegan en PR-12/15 */}
      <SectionCard>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#4F8EF7]/15 border border-[#4F8EF7]/25 flex items-center justify-center"><Mail size={16} className="text-[#4F8EF7]" /></span>
          <div className="flex-1"><p className="text-sm font-semibold text-white">Email (Brevo)</p><p className="text-xs text-[#8B8BA8]">Conecta tu cuenta para sincronizar segmentos.</p></div>
          <span className="text-[11px] text-[#8B8BA8]">Próximamente</span>
        </div>
      </SectionCard>
      <SectionCard>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#4F8EF7]/15 border border-[#4F8EF7]/25 flex items-center justify-center"><Upload size={16} className="text-[#4F8EF7]" /></span>
          <div className="flex-1"><p className="text-sm font-semibold text-white">Importar clientela</p><p className="text-xs text-[#8B8BA8]">Sube tu Excel con declaración responsable.</p></div>
          <span className="text-[11px] text-[#8B8BA8]">Próximamente</span>
        </div>
      </SectionCard>

      {modal && <ContratoModal onClose={() => setModal(false)} onAceptado={(at) => { if (local) setLocal({ ...local, crm_contrato_aceptado_at: at }); setModal(false) }} />}
    </div>
  )
}

const CONTRATO_ENCARGO_TXT = `CONTRATO DE ENCARGO DEL TRATAMIENTO (art. 28 RGPD) — [PENDIENTE REVISIÓN LEGAL]

1. Objeto: Rumbo trata por cuenta del LOCAL (responsable) los datos de sus clientes con el único fin de prestar el servicio de CRM.
2. Duración: mientras esté activa la cuenta del local.
3. Tipos de datos: identificativos y de contacto (nombre, teléfono), y de actividad (visitas, consumo).
4. Confidencialidad: Rumbo y su personal guardan secreto sobre los datos.
5. Sub-encargados: Supabase (base de datos), Vercel (hosting), Brevo (email, si se activa).
6. Medidas de seguridad: cifrado en tránsito y reposo, control de acceso por rol, auditoría de exportaciones.
7. Fin del encargo: a la terminación, devolución o supresión de los datos a elección del responsable.

El LOCAL declara ser responsable del tratamiento y haber recabado el consentimiento de marketing de sus clientes cuando proceda.`

function ContratoModal({ onClose, onAceptado }: { onClose: () => void; onAceptado: (at: string) => void }) {
  const toast = useToast()
  const [aceptando, setAceptando] = useState(false)
  async function aceptar() {
    setAceptando(true)
    const r = await fetch('/api/local-panel/crm/contrato', { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    setAceptando(false)
    if (!r.ok) { toast.error(j.error || 'No se pudo registrar'); return }
    toast.success('Contrato de encargo aceptado')
    onAceptado(j.crm_contrato_aceptado_at)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><p className="font-bold text-white text-display">Contrato de encargo</p><button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button></div>
        <pre className="text-[12px] text-[#B8B8CC] whitespace-pre-wrap font-sans leading-relaxed rounded-xl glass-subtle p-4 max-h-[50vh] overflow-y-auto">{CONTRATO_ENCARGO_TXT}</pre>
        <button onClick={aceptar} disabled={aceptando} className="mt-4 w-full btn-primary inline-flex items-center justify-center gap-2"><ShieldCheck size={16} /> {aceptando ? 'Registrando…' : 'Acepto el contrato de encargo'}</button>
      </div>
    </div>
  )
}
