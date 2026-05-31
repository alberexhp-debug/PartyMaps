'use client'
import { useState, useEffect, useCallback } from 'react'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { PageHeader, EmptyState } from '@/components/local-panel/ui'
import { CORTESIA_LABEL, cortesiaPermitidaPorPlan } from '@/lib/cortesias'
import type { TipoCortesia } from '@/types'
import { Gift, Percent, GlassWater, Ticket, Check, Plus, Lock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPOS: TipoCortesia[] = ['consumicion', 'descuento', 'entrada_gratis']
const ICONO: Record<TipoCortesia, React.ElementType> = {
  consumicion: GlassWater, descuento: Percent, entrada_gratis: Ticket,
}

type CortesiaItem = {
  id: string; tipo: TipoCortesia; descripcion: string; descuento_pct: number | null
  beneficiario_nombre: string | null; qr_code: string; estado: string; created_at: string; canjeada_at: string | null
}

export default function CortesiasPage() {
  const toast = useToast()
  const { local, trabajador } = useLocalPanelStore()
  const esDueno = trabajador?.rol === 'dueno'

  const permitido = (tipo: TipoCortesia) => {
    if (!cortesiaPermitidaPorPlan(local?.tier, tipo)) return false
    if (esDueno) return true
    return tipo === 'consumicion' ? !!trabajador?.cortesia_consumiciones
      : tipo === 'descuento' ? !!trabajador?.cortesia_descuentos
        : !!trabajador?.cortesia_entradas_gratis
  }
  const tiposPermitidos = TIPOS.filter(permitido)

  const [tipo, setTipo] = useState<TipoCortesia | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [pct, setPct] = useState('20')
  const [beneficiario, setBeneficiario] = useState('')
  const [emitiendo, setEmitiendo] = useState(false)
  const [emitida, setEmitida] = useState<CortesiaItem | null>(null)
  const [qrSrc, setQrSrc] = useState('')
  const [recientes, setRecientes] = useState<CortesiaItem[]>([])

  useEffect(() => { if (!tipo && tiposPermitidos.length) setTipo(tiposPermitidos[0]) }, [tiposPermitidos, tipo])

  const cargar = useCallback(async () => {
    const res = await fetch('/api/local-panel/cortesias')
    if (res.ok) { const d = await res.json(); setRecientes(d.cortesias) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  // QR de la cortesía recién emitida
  useEffect(() => {
    if (!emitida?.qr_code) { setQrSrc(''); return }
    ;(async () => {
      const QRCode = (await import('qrcode')).default
      setQrSrc(await QRCode.toDataURL(emitida.qr_code, { width: 460, margin: 1, color: { dark: '#0B0B16', light: '#FAFAFC' }, errorCorrectionLevel: 'M' }))
    })()
  }, [emitida?.qr_code])

  const emitir = async () => {
    if (!tipo) return
    setEmitiendo(true)
    const res = await fetch('/api/local-panel/cortesias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo, descripcion: descripcion.trim() || undefined,
        descuento_pct: tipo === 'descuento' ? Number(pct) : undefined,
        beneficiario_nombre: beneficiario.trim() || undefined,
      }),
    })
    const d = await res.json()
    setEmitiendo(false)
    if (!res.ok) { toast.error(d.error || 'No se pudo emitir'); return }
    setEmitida(d.cortesia)
    setDescripcion(''); setBeneficiario('')
    cargar()
  }

  if (tiposPermitidos.length === 0) {
    return (
      <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-4">
        <PageHeader eyebrow="La noche" titulo="Cortesías" subtitulo="Regala consumiciones, descuentos y entradas" acento="violet" />
        <EmptyState icon={Gift} acento="violet" titulo="No tienes cortesías habilitadas"
          descripcion="Pídele al dueño que te active cortesías desde Equipo (o que el plan del local las incluya)." />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 space-y-5 max-w-xl">
      <PageHeader eyebrow="La noche" titulo="Cortesías" subtitulo="Regala consumiciones, descuentos y entradas" acento="violet" />

      {emitida ? (
        <div className="card-premium p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/15 text-green-400"><Check size={24} /></div>
          <div>
            <p className="text-lg font-bold text-white">{emitida.descripcion}</p>
            {emitida.beneficiario_nombre && <p className="text-sm text-[#A0A0B8] mt-0.5">Para {emitida.beneficiario_nombre}</p>}
          </div>
          {qrSrc && <img src={qrSrc} alt="QR de la cortesía" className="mx-auto w-52 h-52 rounded-2xl" />}
          <p className="text-xs text-[#8B8BA8]">Muéstraselo al cliente. Caduca en 12 h. Se canjea escaneándolo en el panel.</p>
          <Button fullWidth onClick={() => setEmitida(null)}><Plus size={16} /> Emitir otra</Button>
        </div>
      ) : (
        <div className="card-premium p-5 space-y-4">
          {/* Tipo */}
          <div>
            <p className="text-sm font-medium text-[#A0A0B8] mb-2">Tipo de cortesía</p>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(tp => {
                const ok = permitido(tp)
                const Icon = ICONO[tp]
                const sel = tipo === tp
                return (
                  <button key={tp} disabled={!ok} onClick={() => setTipo(tp)}
                    className={cn('rounded-xl border p-3 flex flex-col items-center gap-1.5 text-center transition-colors',
                      !ok ? 'border-white/8 bg-white/[0.02] opacity-50 cursor-not-allowed'
                        : sel ? 'border-[#7C5CFF] bg-[#7C5CFF]/10' : 'border-white/10 bg-white/5')}>
                    {ok ? <Icon size={18} className={sel ? 'text-[#9B82FF]' : 'text-[#8B8BA8]'} /> : <Lock size={16} className="text-[#6B6B85]" />}
                    <span className="text-[11px] font-medium text-white leading-tight">{CORTESIA_LABEL[tp]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {tipo === 'descuento' && (
            <Input label="Descuento (%)" type="number" icon={<Percent size={16} />} value={pct} onChange={e => setPct(e.target.value)} />
          )}

          <Input label="Descripción (opcional)" value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder={tipo === 'consumicion' ? 'Copa de bienvenida' : tipo === 'entrada_gratis' ? 'Entrada gratis' : `${pct}% en barra`} />

          <Input label="Para quién (opcional)" icon={<User size={16} />} value={beneficiario} onChange={e => setBeneficiario(e.target.value)} placeholder="Nombre del cliente" />

          <Button fullWidth size="lg" loading={emitiendo} onClick={emitir}><Gift size={16} /> Emitir cortesía</Button>
        </div>
      )}

      {/* Recientes */}
      {recientes.length > 0 && (
        <div className="space-y-2">
          <p className="eyebrow">Recientes</p>
          {recientes.slice(0, 12).map(c => {
            const Icon = ICONO[c.tipo]
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl glass px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF]"><Icon size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{c.descripcion}</p>
                  <p className="truncate text-xs text-[#8B8BA8]">{c.beneficiario_nombre || 'Sin nombre'}</p>
                </div>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                  c.estado === 'canjeada' ? 'border-green-400/30 bg-green-400/10 text-green-400'
                    : c.estado === 'emitida' ? 'border-[#F39C12]/30 bg-[#F39C12]/10 text-[#F39C12]'
                      : 'border-white/10 bg-white/6 text-[#8B8BA8]')}>
                  {c.estado}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
