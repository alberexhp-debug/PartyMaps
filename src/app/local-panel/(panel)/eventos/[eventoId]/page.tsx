'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Evento, EstadoEvento, PrecioDinamicoConfig } from '@/types'
import { ArrowLeft, Save, Zap, Plus, Minus } from '@/components/todh/iconosTorneum'
import { Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PrecioDinamicoEditor } from '@/components/local-panel/PrecioDinamicoEditor'
import { obligatoriosCompletos, faltantesObligatorios } from '@/lib/onboarding/gate'
import { ModalTeFaltaPoco } from '@/components/local-panel/ModalTeFaltaPoco'

const INTENT_KEY = 'pm_intent_publicar' // recuerda "iba a publicar este torneo" al ir a completar datos

const ESTADOS: EstadoEvento[] = ['borrador', 'publicado', 'cancelado', 'finalizado']
const ESTADO_COLOR: Record<EstadoEvento, string> = {
  borrador: 'border-[#F39C12] text-[#F39C12]',
  publicado: 'border-green-500 text-green-400',
  cancelado: 'border-red-500 text-red-400',
  finalizado: 'border-[#505065] text-[#6B6B85]',
}

export default function EventoEditPage() {
  const { eventoId } = useParams<{ eventoId: string }>()
  const router = useRouter()
  const toast = useToast()
  const { local } = useLocalPanelStore()
  const isNuevo = eventoId === 'nuevo'
  const [form, setForm] = useState<Partial<Evento>>({
    estado: 'borrador',
    precio_base: 0,
    aforo_maximo: 200,
    entradas_vendidas: 0,
    modulos_activos: [],
  })
  const [loading, setSaving] = useState(false)
  const [showGate, setShowGate] = useState(false)

  useEffect(() => {
    if (!isNuevo) {
      supabase.from('eventos').select('*').eq('id', eventoId).single()
        .then(({ data }) => { if (data) setForm(data) })
    }
  }, [eventoId, isNuevo])

  // Al volver tras completar los datos que faltaban: ofrecer publicar con un toast-acción.
  useEffect(() => {
    if (isNuevo || !local) return
    const intent = typeof window !== 'undefined' ? sessionStorage.getItem(INTENT_KEY) : null
    if (intent === eventoId && obligatoriosCompletos(local)) {
      sessionStorage.removeItem(INTENT_KEY)
      toast.conAccion('Ya tienes todo listo. ¿Publicamos tu torneo?', {
        label: 'Publicar',
        onClick: async () => {
          const id = await persistir('publicado')
          if (id) { setForm(f => ({ ...f, estado: 'publicado' })); toast.success('Torneo publicado') }
          else toast.error('No se pudo publicar')
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, eventoId, isNuevo])

  // Guarda el torneo con un estado dado; devuelve su id (o null si error).
  async function persistir(estado: EstadoEvento): Promise<string | null> {
    if (!local) return null
    if (isNuevo) {
      const { data, error } = await supabase.from('eventos')
        .insert({ ...form, estado, local_id: local.id, entradas_vendidas: 0 })
        .select('id').single()
      return error ? null : data.id
    }
    const { error } = await supabase.from('eventos').update({ ...form, estado }).eq('id', eventoId)
    return error ? null : eventoId
  }

  const guardar = async () => {
    if (!local || !form.nombre || !form.fecha_inicio) {
      toast.error('Nombre y fecha de inicio son obligatorios')
      return
    }
    // Bloqueo suave (doc 01 §7): publicar exige los obligatorios del local. El borrador siempre se puede guardar.
    if (form.estado === 'publicado' && !obligatoriosCompletos(local)) { setShowGate(true); return }
    setSaving(true)
    const id = await persistir(form.estado ?? 'borrador')
    setSaving(false)
    if (!id) { toast.error(isNuevo ? 'Error al crear' : 'Error al guardar'); return }
    toast.success(isNuevo ? 'Torneo creado' : 'Torneo actualizado')
    router.push('/local-panel/eventos')
  }

  // "Completar ahora": guarda como borrador (no se pierde) y va al primer dato que falta.
  const gateCompletar = async (ruta: string) => {
    setShowGate(false)
    setSaving(true)
    const id = await persistir('borrador')
    setSaving(false)
    if (!id) { toast.error('No se pudo guardar el borrador'); return }
    sessionStorage.setItem(INTENT_KEY, id)
    router.push(ruta)
  }

  // "Volver al borrador": guarda como borrador y a la lista.
  const gateBorrador = async () => {
    setShowGate(false)
    setSaving(true)
    const id = await persistir('borrador')
    setSaving(false)
    if (!id) { toast.error('Error al guardar'); return }
    setForm(f => ({ ...f, estado: 'borrador' }))
    toast.success('Guardado como borrador')
    router.push('/local-panel/eventos')
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <button aria-label="Volver" onClick={() => router.back()} className="p-2 text-[#A0A0B8]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-display text-white flex-1">
          {isNuevo ? 'Nuevo torneo' : 'Editar torneo'}
        </h1>
        <Button loading={loading} onClick={guardar} size="sm">
          <Save size={14} /> Guardar
        </Button>
      </div>

      <Input
        label="Nombre del torneo *"
        value={form.nombre || ''}
        onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
        placeholder="Ej: Torneo de verano"
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#A0A0B8]">Descripción</label>
        <textarea
          value={form.descripcion || ''}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          rows={3}
          className="w-full px-4 py-3 glass rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50 resize-none"
          placeholder="Describe el torneo..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Fecha inicio *</label>
          <input type="datetime-local"
            value={form.fecha_inicio ? form.fecha_inicio.slice(0, 16) : ''}
            onChange={e => setForm(f => ({ ...f, fecha_inicio: new Date(e.target.value).toISOString() }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Fecha fin</label>
          <input type="datetime-local"
            value={form.fecha_fin ? form.fecha_fin.slice(0, 16) : ''}
            onChange={e => setForm(f => ({ ...f, fecha_fin: new Date(e.target.value).toISOString() }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Precio de inscripción (€)</label>
          <input type="number" min="0" step="0.5"
            value={form.precio_base || 0}
            onChange={e => setForm(f => ({ ...f, precio_base: parseFloat(e.target.value) }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Precio máx (€)</label>
          <input type="number" min="0" step="0.5"
            value={form.precio_maximo ?? ''}
            onChange={e => setForm(f => ({ ...f, precio_maximo: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50"
            placeholder="Sin tope"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Plazas</label>
          <input type="number" min="1"
            value={form.aforo_maximo || 200}
            onChange={e => setForm(f => ({ ...f, aforo_maximo: parseInt(e.target.value) }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50"
          />
        </div>
      </div>

      <PrecioDinamicoEditor
        value={form.precio_dinamico}
        onChange={(v: PrecioDinamicoConfig) => setForm(f => ({ ...f, precio_dinamico: v }))}
        precioMin={form.precio_base || 0}
        precioMax={form.precio_maximo}
        ayuda="Si está activo, el precio sube según las inscripciones de este torneo. El descuento anticipado tiene prioridad mientras esté vigente."
      />

      {/* Descuento anticipado */}
      <div className="glass rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap size={14} className="text-green-400" /> Precio con descuento anticipado
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#6B6B85]">Precio anticipado (€)</label>
            <input type="number" min="0" step="0.5"
              value={form.precio_early_bird || ''}
              onChange={e => setForm(f => ({ ...f, precio_early_bird: parseFloat(e.target.value) || undefined }))}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#6B6B85]">Válido hasta</label>
            <input type="datetime-local"
              value={form.early_bird_hasta ? form.early_bird_hasta.slice(0, 16) : ''}
              onChange={e => setForm(f => ({ ...f, early_bird_hasta: new Date(e.target.value).toISOString() }))}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#6B6B85]">Cupo anticipado (vacío = ilimitado)</label>
          <input type="number" min="1"
            value={form.early_bird_cupo || ''}
            onChange={e => setForm(f => ({ ...f, early_bird_cupo: parseInt(e.target.value) || undefined }))}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none"
            placeholder="Ej: 50"
          />
        </div>
      </div>

      {/* Consumibles incluidos con la inscripción online (van DENTRO del QR: anti-falsificación) */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coffee size={14} className="text-[#B6FF3A]" /> Consumibles incluidos
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, consumiciones_incluidas: Math.max(0, (f.consumiciones_incluidas ?? 0) - 1) }))}
              disabled={(form.consumiciones_incluidas ?? 0) === 0}
              className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-40"><Minus size={14} /></button>
            <span className="w-6 text-center text-base font-bold text-white">{form.consumiciones_incluidas ?? 0}</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, consumiciones_incluidas: Math.min(5, (f.consumiciones_incluidas ?? 0) + 1) }))}
              disabled={(form.consumiciones_incluidas ?? 0) === 5}
              className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-40"><Plus size={14} /></button>
          </div>
        </div>
        {(form.consumiciones_incluidas ?? 0) > 0 && (
          <>
            <input value={form.consumiciones_descripcion || ''} onChange={e => setForm(f => ({ ...f, consumiciones_descripcion: e.target.value.slice(0, 120) }))}
              placeholder="Qué incluye (ej. snack, bebida o agua)"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#B6FF3A]/50" />
            <p className="text-[11px] text-[#8B8BA8]">Quien compre esta inscripción online la llevará en su QR; se canjean en la sede una a una.</p>
          </>
        )}
      </div>

      <Input
        label="Dress code"
        value={form.dress_code || ''}
        onChange={e => setForm(f => ({ ...f, dress_code: e.target.value }))}
        placeholder="Ej: Elegante, no deportivo"
      />

      <Input
        label="URL imagen del torneo"
        type="url"
        value={form.imagen_url || ''}
        onChange={e => setForm(f => ({ ...f, imagen_url: e.target.value }))}
        placeholder="https://..."
      />

      {/* Estado */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#A0A0B8]">Estado</label>
        <div className="flex gap-2 flex-wrap">
          {ESTADOS.map(estado => (
            <button key={estado} onClick={() => setForm(f => ({ ...f, estado }))}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm border capitalize transition-colors',
                form.estado === estado
                  ? ESTADO_COLOR[estado] + ' bg-opacity-10'
                  : 'border-white/10 text-[#6B6B85]'
              )}>
              {estado}
            </button>
          ))}
        </div>
      </div>

      {/* Bloqueo suave al publicar */}
      {showGate && local && (
        <ModalTeFaltaPoco
          faltantes={faltantesObligatorios(local)}
          descripcion="Para publicar tu torneo necesitas tener lista la sede. Son minutos y sale perfecto."
          onCompletar={gateCompletar}
          onCerrar={gateBorrador}
        />
      )}
    </div>
  )
}
