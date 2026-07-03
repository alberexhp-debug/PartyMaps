'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/local-panel/ui'
import { Plus, Store, ChevronDown, Tag, Percent, Euro, X, Power } from 'lucide-react'
import { cn } from '@/lib/utils'

type LocalMin = { id: string; nombre: string; ciudad: string }
type Codigo = {
  id: string; codigo: string; tipo: 'porcentaje' | 'importe'; valor: number
  usos_max: number | null; usos_actuales: number; expira_at: string | null; activo: boolean
}

export default function GestorCodigosPage() {
  const toast = useToast()
  const [locales, setLocales] = useState<LocalMin[]>([])
  const [localId, setLocalId] = useState('')
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [loading, setLoading] = useState(true)
  const [abrir, setAbrir] = useState(false)

  useEffect(() => {
    fetch('/api/gestor/locales').then(r => r.json()).then(d => {
      const locs: LocalMin[] = (d.locales || []).map((l: LocalMin) => ({ id: l.id, nombre: l.nombre, ciudad: l.ciudad }))
      setLocales(locs)
      if (locs.length) setLocalId(locs[0].id); else setLoading(false)
    })
  }, [])

  const cargar = useCallback(async () => {
    if (!localId) return
    setLoading(true)
    const res = await fetch(`/api/gestor/codigos?local_id=${localId}&clase=descuento`)
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
    if (res.ok) { setCodigos(prev => prev.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x)) }
    else toast.error('No se pudo cambiar')
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tu cartera" acento="violet" titulo="Códigos de descuento"
        subtitulo="Crea códigos pactados con los locales de tu cartera."
        acciones={locales.length > 0 ? <Button size="sm" onClick={() => setAbrir(true)}><Plus size={16} /> Crear</Button> : undefined} />

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

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}</div>
          ) : codigos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
              <Tag size={22} className="mx-auto mb-3 text-[#6B6B85]" />
              <p className="text-sm text-[#A0A0B8]">Aún no hay códigos para este local. Crea el primero.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {codigos.map(c => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl glass px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF]">
                    {c.tipo === 'porcentaje' ? <Percent size={16} /> : <Euro size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-white">{c.codigo}</p>
                    <p className="text-xs text-[#8B8BA8]">
                      {c.tipo === 'porcentaje' ? `${c.valor}%` : `${c.valor} €`} ·{' '}
                      {c.usos_max != null ? `${c.usos_actuales}/${c.usos_max} usos` : `${c.usos_actuales} usos`}
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

      {abrir && <CrearCodigoModal localId={localId} onClose={() => setAbrir(false)} onCreado={() => { setAbrir(false); cargar() }} />}
    </div>
  )
}

function CrearCodigoModal({ localId, onClose, onCreado }: { localId: string; onClose: () => void; onCreado: () => void }) {
  const toast = useToast()
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState<'porcentaje' | 'importe'>('porcentaje')
  const [valor, setValor] = useState('20')
  const [usosMax, setUsosMax] = useState('')
  const [expira, setExpira] = useState('')
  const [guardando, setGuardando] = useState(false)

  const crear = async () => {
    if (!codigo.trim()) { toast.error('Pon un código'); return }
    setGuardando(true)
    const res = await fetch('/api/gestor/codigos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local_id: localId, codigo, tipo, valor: Number(valor),
        usos_max: usosMax ? Number(usosMax) : undefined,
        expira_at: expira ? new Date(expira + 'T23:59:59').toISOString() : undefined,
      }),
    })
    const d = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(d.error || 'No se pudo crear'); return }
    toast.success('Código creado'); onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card-premium max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white text-display">Nuevo código</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <Input label="Código" icon={<Tag size={16} />} value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="VERANO20" hint="3-20 letras/números." />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#A0A0B8]">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['porcentaje', 'importe'] as const).map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  className={cn('rounded-xl border py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
                    tipo === t ? 'border-[#7C5CFF] bg-[#7C5CFF]/10 text-white' : 'border-white/10 bg-white/5 text-[#8B8BA8]')}>
                  {t === 'porcentaje' ? <><Percent size={14} /> Porcentaje</> : <><Euro size={14} /> Importe</>}
                </button>
              ))}
            </div>
          </div>

          <Input label={tipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento (€)'} type="number"
            icon={tipo === 'porcentaje' ? <Percent size={16} /> : <Euro size={16} />} value={valor} onChange={e => setValor(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Usos máx. (opcional)" type="number" value={usosMax} onChange={e => setUsosMax(e.target.value)} placeholder="∞" />
            <Input label="Caduca (opcional)" type="date" value={expira} onChange={e => setExpira(e.target.value)} />
          </div>

          <Button fullWidth size="lg" loading={guardando} onClick={crear}>Crear código</Button>
        </div>
      </div>
    </div>
  )
}
