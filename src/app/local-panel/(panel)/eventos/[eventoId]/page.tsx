'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Evento, EstadoEvento, PrecioDinamicoConfig } from '@/types'
import { ArrowLeft, Save, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PrecioDinamicoEditor } from '@/components/local-panel/PrecioDinamicoEditor'

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

  useEffect(() => {
    if (!isNuevo) {
      supabase.from('eventos').select('*').eq('id', eventoId).single()
        .then(({ data }) => { if (data) setForm(data) })
    }
  }, [eventoId, isNuevo])

  const guardar = async () => {
    if (!local || !form.nombre || !form.fecha_inicio) {
      toast.error('Nombre y fecha de inicio son obligatorios')
      return
    }
    setSaving(true)
    if (isNuevo) {
      const { error } = await supabase.from('eventos').insert({
        ...form,
        local_id: local.id,
        entradas_vendidas: 0,
      })
      if (error) { toast.error('Error al crear'); setSaving(false); return }
      toast.success('Evento creado')
    } else {
      const { error } = await supabase.from('eventos').update(form).eq('id', eventoId)
      if (error) { toast.error('Error al guardar'); setSaving(false); return }
      toast.success('Evento actualizado')
    }
    router.push('/local-panel/eventos')
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <button aria-label="Volver" onClick={() => router.back()} className="p-2 text-[#A0A0B8]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-display text-white flex-1">
          {isNuevo ? 'Nuevo evento' : 'Editar evento'}
        </h1>
        <Button loading={loading} onClick={guardar} size="sm">
          <Save size={14} /> Guardar
        </Button>
      </div>

      <Input
        label="Nombre del evento *"
        value={form.nombre || ''}
        onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
        placeholder="Ej: Fiesta de verano"
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#A0A0B8]">Descripción</label>
        <textarea
          value={form.descripcion || ''}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          rows={3}
          className="w-full px-4 py-3 glass rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none"
          placeholder="Describe el evento..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Fecha inicio *</label>
          <input type="datetime-local"
            value={form.fecha_inicio ? form.fecha_inicio.slice(0, 16) : ''}
            onChange={e => setForm(f => ({ ...f, fecha_inicio: new Date(e.target.value).toISOString() }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Fecha fin</label>
          <input type="datetime-local"
            value={form.fecha_fin ? form.fecha_fin.slice(0, 16) : ''}
            onChange={e => setForm(f => ({ ...f, fecha_fin: new Date(e.target.value).toISOString() }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Precio base (€)</label>
          <input type="number" min="0" step="0.5"
            value={form.precio_base || 0}
            onChange={e => setForm(f => ({ ...f, precio_base: parseFloat(e.target.value) }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Precio máx (€)</label>
          <input type="number" min="0" step="0.5"
            value={form.precio_maximo ?? ''}
            onChange={e => setForm(f => ({ ...f, precio_maximo: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
            placeholder="Sin tope"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#A0A0B8]">Aforo máximo</label>
          <input type="number" min="1"
            value={form.aforo_maximo || 200}
            onChange={e => setForm(f => ({ ...f, aforo_maximo: parseInt(e.target.value) }))}
            className="w-full px-3 py-2.5 glass rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
          />
        </div>
      </div>

      <PrecioDinamicoEditor
        value={form.precio_dinamico}
        onChange={(v: PrecioDinamicoConfig) => setForm(f => ({ ...f, precio_dinamico: v }))}
        precioMin={form.precio_base || 0}
        precioMax={form.precio_maximo}
        ayuda="Si está activo, el precio sube según las entradas vendidas de este evento. El early bird tiene prioridad mientras esté vigente."
      />

      {/* Early bird */}
      <div className="glass rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap size={14} className="text-green-400" /> Precio Early Bird
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#6B6B85]">Precio EB (€)</label>
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
          <label className="text-xs text-[#6B6B85]">Cupo Early Bird (vacío = ilimitado)</label>
          <input type="number" min="1"
            value={form.early_bird_cupo || ''}
            onChange={e => setForm(f => ({ ...f, early_bird_cupo: parseInt(e.target.value) || undefined }))}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none"
            placeholder="Ej: 50"
          />
        </div>
      </div>

      <Input
        label="Dress code"
        value={form.dress_code || ''}
        onChange={e => setForm(f => ({ ...f, dress_code: e.target.value }))}
        placeholder="Ej: Elegante, no deportivo"
      />

      <Input
        label="URL imagen del evento"
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
    </div>
  )
}
