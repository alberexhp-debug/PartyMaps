'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/local-panel/ui'
import { Plus, Store, ChevronDown, Ticket, X, Power, Lock } from '@/components/todh/iconosTorneum'
import { cn } from '@/lib/utils'

type LocalMin = { id: string; nombre: string; ciudad: string; tier?: string }
type Codigo = { id: string; codigo: string; usos_max: number | null; usos_actuales: number; expira_at: string | null; activo: boolean }

const PLAN_OK = (tier?: string) => tier === 'pro' || tier === 'destacado'

export default function GestorEntradasGratisPage() {
  const toast = useToast()
  const [locales, setLocales] = useState<LocalMin[]>([])
  const [localId, setLocalId] = useState('')
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [abrir, setAbrir] = useState(false)

  useEffect(() => {
    fetch('/api/gestor/locales').then(r => r.json()).then(d => {
      const locs: LocalMin[] = (d.locales || []).map((l: LocalMin) => ({ id: l.id, nombre: l.nombre, ciudad: l.ciudad, tier: l.tier }))
      setLocales(locs)
      if (locs.length) setLocalId(locs[0].id); else setLoading(false)
    })
  }, [])

  const localActual = locales.find(l => l.id === localId)
  const planPermite = PLAN_OK(localActual?.tier)

  const cargar = useCallback(async () => {
    if (!localId) return
    setLoading(true)
    const res = await fetch(`/api/gestor/codigos?local_id=${localId}&clase=gratis`)
    const d = await res.json()
    if (res.ok) setCodigos(d.codigos); else toast.error(d.error || 'No se pudo cargar')
    setLoading(false)
  }, [localId, toast])
  useEffect(() => { if (localId) cargar() }, [localId, cargar])

  const toggle = async (c: Codigo) => {
    const res = await fetch('/api/gestor/codigos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: localId, codigo_id: c.id, activo: !c.activo }),
    })
    if (res.ok) setCodigos(prev => prev.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x))
    else toast.error('No se pudo cambiar')
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tu cartera" acento="violet" titulo="Entradas gratis"
        subtitulo="Genera códigos de entrada gratis para tus locales (Pro/Destacado)."
        acciones={locales.length > 0 && planPermite ? <Button size="sm" onClick={() => setAbrir(true)}><Plus size={16} /> Crear</Button> : undefined} />

      {locales.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/12 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-[#9B82FF]"><Store size={24} /></div>
          <p className="text-base font-semibold text-white">Primero da de alta un local</p>
          <Link href="/gestor/locales"><Button className="mt-5"><Plus size={16} /> Ir a Locales</Button></Link>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#A0A0B8]">Local</label>
            <div className="relative">
              <Store size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85]" />
              <select value={localId} onChange={e => setLocalId(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/5 pl-11 pr-10 text-white outline-none focus:border-[#B6FF3A]/60">
                {locales.map(l => <option key={l.id} value={l.id} className="bg-[#181D28]">{l.nombre} · {l.ciudad}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85]" />
            </div>
          </div>

          {!planPermite ? (
            <div className="flex items-start gap-3 rounded-2xl border border-[#F39C12]/30 bg-[#F39C12]/10 px-4 py-3.5">
              <Lock size={18} className="mt-0.5 shrink-0 text-[#F39C12]" />
              <div>
                <p className="text-sm font-semibold text-white">Disponible en Pro y Destacado</p>
                <p className="text-xs text-[#A0A0B8] mt-0.5">Las entradas gratis requieren que este local tenga plan Pro o Destacado. Súbelo de plan para activarlas.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}</div>
          ) : codigos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
              <Ticket size={22} className="mx-auto mb-3 text-[#6B6B85]" />
              <p className="text-sm text-[#A0A0B8]">Aún no hay entradas gratis para este local. Crea la primera.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {codigos.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl glass px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF]"><Ticket size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-white">{c.codigo}</p>
                    <p className="text-xs text-[#8B8BA8]">
                      Entrada gratis ·{' '}
                      {c.usos_max != null ? `${c.usos_actuales}/${c.usos_max} usadas` : `${c.usos_actuales} usadas`}
                      {c.expira_at ? ` · caduca ${new Date(c.expira_at).toLocaleDateString('es-ES')}` : ''}
                    </p>
                  </div>
                  <button onClick={() => toggle(c)} title={c.activo ? 'Desactivar' : 'Activar'}
                    className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                      c.activo ? 'border-green-400/30 bg-green-400/10 text-green-400' : 'border-white/12 bg-white/5 text-[#8B8BA8]')}>
                    <Power size={11} /> {c.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {abrir && <CrearGratisModal localId={localId} onClose={() => setAbrir(false)} onCreado={() => { setAbrir(false); cargar() }} />}
    </div>
  )
}

function CrearGratisModal({ localId, onClose, onCreado }: { localId: string; onClose: () => void; onCreado: () => void }) {
  const toast = useToast()
  const [codigo, setCodigo] = useState('')
  const [usosMax, setUsosMax] = useState('')
  const [expira, setExpira] = useState('')
  const [guardando, setGuardando] = useState(false)

  const crear = async () => {
    if (!codigo.trim()) { toast.error('Pon un código'); return }
    setGuardando(true)
    const res = await fetch('/api/gestor/codigos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local_id: localId, codigo, tipo: 'porcentaje', valor: 100,
        usos_max: usosMax ? Number(usosMax) : undefined,
        expira_at: expira ? new Date(expira + 'T23:59:59').toISOString() : undefined,
      }),
    })
    const d = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(d.error || 'No se pudo crear'); return }
    toast.success('Entrada gratis creada'); onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card-premium max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white text-display">Nueva entrada gratis</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <Input label="Código" icon={<Ticket size={16} />} value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="VIPGRATIS" hint="El cliente lo introduce en el checkout para entrar gratis." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nº de entradas (opcional)" type="number" value={usosMax} onChange={e => setUsosMax(e.target.value)} placeholder="∞" />
            <Input label="Caduca (opcional)" type="date" value={expira} onChange={e => setExpira(e.target.value)} />
          </div>
          <Button fullWidth size="lg" loading={guardando} onClick={crear}>Crear entrada gratis</Button>
        </div>
      </div>
    </div>
  )
}
