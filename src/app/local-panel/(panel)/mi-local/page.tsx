'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Local, TipoLocal, TipoMusica, ConsumicionBienvenida } from '@/types'
import { getLabelTipoLocal, formatearPrecio } from '@/lib/utils'
import { Plus, Trash2, Save, Image as ImageIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPOS_LOCAL: TipoLocal[] = ['discoteca', 'bar_copas', 'rooftop', 'sala_conciertos', 'bar_cocteleria', 'otro']
const TIPOS_MUSICA: TipoMusica[] = ['techno', 'house', 'reggaeton', 'pop', 'hip_hop', 'indie', 'electronica', 'flamenco', 'otro']
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
const LABEL_DIA: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
}

export default function MiLocalPage() {
  const toast = useToast()
  const { local, setLocal } = useLocalPanelStore()
  const [form, setForm] = useState<Partial<Local>>(local || {})
  const [loading, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'horario' | 'consumiciones' | 'galeria'>('info')

  useEffect(() => { if (local) setForm(local) }, [local])

  const guardar = async () => {
    if (!local) return
    setSaving(true)
    const { data, error } = await supabase
      .from('locales')
      .update({
        nombre: form.nombre,
        descripcion: form.descripcion,
        tipo_local: form.tipo_local,
        musica: form.musica,
        direccion: form.direccion,
        ciudad: form.ciudad,
        precio_entrada_min: form.precio_entrada_min,
        precio_entrada_max: form.precio_entrada_max,
        horario: form.horario,
        consumiciones_bienvenida: form.consumiciones_bienvenida,
      })
      .eq('id', local.id)
      .select().single()
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    setLocal(data)
    toast.success('¡Local actualizado!')
    setSaving(false)
  }

  const toggleMusica = (m: TipoMusica) => {
    const current = form.musica || []
    setForm(f => ({
      ...f,
      musica: current.includes(m) ? current.filter(x => x !== m) : [...current, m],
    }))
  }

  const addConsumicion = () => {
    const nueva: ConsumicionBienvenida = {
      id: crypto.randomUUID(),
      nombre: '',
      descripcion: '',
      precio: 0,
    }
    setForm(f => ({ ...f, consumiciones_bienvenida: [...(f.consumiciones_bienvenida || []), nueva] }))
  }

  const updateConsumicion = (id: string, field: keyof ConsumicionBienvenida, value: string | number) => {
    setForm(f => ({
      ...f,
      consumiciones_bienvenida: (f.consumiciones_bienvenida || []).map(c =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }))
  }

  const removeConsumicion = (id: string) => {
    setForm(f => ({ ...f, consumiciones_bienvenida: (f.consumiciones_bienvenida || []).filter(c => c.id !== id) }))
  }

  if (!local) return null

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Mi local</h1>
        <Button loading={loading} onClick={guardar} size="sm">
          <Save size={14} /> Guardar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A1A2E] rounded-xl p-1 border border-[#2A2A3E]">
        {(['info', 'horario', 'consumiciones', 'galeria'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-colors',
              tab === t ? 'bg-[#E94560] text-white' : 'text-[#505065] hover:text-white')}>
            {t === 'consumiciones' ? 'Bienvenida' : t}
          </button>
        ))}
      </div>

      {/* Tab: Info básica */}
      {tab === 'info' && (
        <div className="space-y-4">
          <Input label="Nombre del local" value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#A0A0B8]">Descripción</label>
            <textarea
              value={form.descripcion || ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#505065]"
              placeholder="Describe tu local..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0B8]">Tipo de local</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_LOCAL.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tipo_local: t }))}
                  className={cn('px-3 py-1.5 rounded-xl text-sm border transition-colors',
                    form.tipo_local === t
                      ? 'bg-[#E94560] border-[#E94560] text-white'
                      : 'border-[#2A2A3E] text-[#A0A0B8] hover:border-[#505065]')}>
                  {getLabelTipoLocal(t)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0B8]">Música</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_MUSICA.map(m => (
                <button key={m} onClick={() => toggleMusica(m)}
                  className={cn('px-3 py-1.5 rounded-xl text-sm border capitalize transition-colors',
                    (form.musica || []).includes(m)
                      ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white'
                      : 'border-[#2A2A3E] text-[#A0A0B8] hover:border-[#505065]')}>
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <Input label="Dirección" value={form.direccion || ''} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
          <Input label="Ciudad" value={form.ciudad || ''} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#A0A0B8]">Precio entrada (mín.)</label>
              <input type="number" min="0" step="0.5"
                value={form.precio_entrada_min || 0}
                onChange={e => setForm(f => ({ ...f, precio_entrada_min: parseFloat(e.target.value) }))}
                className="w-full px-4 py-3 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#A0A0B8]">Precio entrada (máx.)</label>
              <input type="number" min="0" step="0.5"
                value={form.precio_entrada_max || 0}
                onChange={e => setForm(f => ({ ...f, precio_entrada_max: parseFloat(e.target.value) }))}
                className="w-full px-4 py-3 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Horario */}
      {tab === 'horario' && (
        <div className="space-y-3">
          <p className="text-sm text-[#A0A0B8]">Configura los horarios de apertura y cierre de cada día</p>
          {DIAS.map(dia => {
            const h = (form.horario as Record<string, { apertura: string; cierre: string } | null>)?.[dia]
            return (
              <div key={dia} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                      h ? 'bg-[#E94560] text-white' : 'bg-[#0D0D1A] text-[#505065]'
                    )}>
                      {LABEL_DIA[dia]}
                    </div>
                    <span className="text-white capitalize">{dia === 'miercoles' ? 'Miércoles' : dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
                  </div>
                  <button
                    onClick={() => setForm(f => ({
                      ...f,
                      horario: { ...f.horario, [dia]: h ? null : { apertura: '22:00', cierre: '06:00' } }
                    }))}
                    className={cn('text-xs font-medium', h ? 'text-red-400' : 'text-[#4F8EF7]')}
                  >
                    {h ? 'Cerrar' : 'Abrir'}
                  </button>
                </div>
                {h && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#505065]">Apertura</label>
                      <input type="time" value={h.apertura}
                        onChange={e => setForm(f => ({ ...f, horario: { ...f.horario, [dia]: { ...h, apertura: e.target.value } } }))}
                        className="w-full px-3 py-2 bg-[#0D0D1A] border border-[#2A2A3E] rounded-lg text-white text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#505065]">Cierre</label>
                      <input type="time" value={h.cierre}
                        onChange={e => setForm(f => ({ ...f, horario: { ...f.horario, [dia]: { ...h, cierre: e.target.value } } }))}
                        className="w-full px-3 py-2 bg-[#0D0D1A] border border-[#2A2A3E] rounded-lg text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Consumiciones */}
      {tab === 'consumiciones' && (
        <div className="space-y-3">
          <p className="text-sm text-[#A0A0B8]">Consumiciones que el usuario puede elegir al comprar su entrada</p>
          {(form.consumiciones_bienvenida || []).map((c, i) => (
            <div key={c.id} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Consumición {i + 1}</span>
                <button onClick={() => removeConsumicion(c.id)} className="text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
              <Input
                label="Nombre" value={c.nombre}
                onChange={e => updateConsumicion(c.id, 'nombre', e.target.value)}
                placeholder="Ej: Botella de agua"
              />
              <Input
                label="Descripción" value={c.descripcion}
                onChange={e => updateConsumicion(c.id, 'descripcion', e.target.value)}
                placeholder="Descripción breve"
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#A0A0B8]">Precio (€)</label>
                <input type="number" min="0" step="0.5" value={c.precio}
                  onChange={e => updateConsumicion(c.id, 'precio', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
                />
              </div>
            </div>
          ))}
          <button
            onClick={addConsumicion}
            className="w-full flex items-center justify-center gap-2 h-12 border-2 border-dashed border-[#2A2A3E] rounded-xl text-[#505065] hover:border-[#E94560]/50 hover:text-[#E94560] transition-colors"
          >
            <Plus size={18} /> Añadir consumición
          </button>
        </div>
      )}

      {/* Tab: Galería */}
      {tab === 'galeria' && (
        <div className="space-y-3">
          <p className="text-sm text-[#A0A0B8]">Imágenes del local (URLs de Cloudflare R2 o Supabase Storage)</p>
          <div className="grid grid-cols-2 gap-3">
            {(form.imagenes || []).map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="w-full h-32 object-cover rounded-xl bg-[#1A1A2E]" />
                <button
                  onClick={() => setForm(f => ({ ...f, imagenes: f.imagenes?.filter((_, j) => j !== i) }))}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A0A0B8]">Añadir URL de imagen</label>
            <div className="flex gap-2">
              <input
                id="nueva-url-img"
                type="url"
                placeholder="https://..."
                className="flex-1 px-4 py-3 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('nueva-url-img') as HTMLInputElement
                  if (input.value) {
                    setForm(f => ({ ...f, imagenes: [...(f.imagenes || []), input.value] }))
                    input.value = ''
                  }
                }}
                className="px-4 py-3 bg-[#E94560] rounded-xl text-white text-sm font-semibold"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-[#505065]">La primera imagen es la portada del local en el mapa</p>
        </div>
      )}
    </div>
  )
}
