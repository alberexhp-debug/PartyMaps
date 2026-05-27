'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Planta, Mesa, TipoMesa, FormaMesa } from '@/types'
import { Plus, Trash2, Pencil, Move } from 'lucide-react'

interface Props {
  localId: string
  plantas: Planta[]
  mesas: Mesa[]
  onChange: () => void | Promise<void>
}

const TIPO_LABEL: Record<TipoMesa, string> = {
  mesa: 'Mesa', reservado: 'Reservado', barra: 'Barra', otro: 'Otro',
}
const FORMA_LABEL: Record<FormaMesa, string> = {
  redonda: 'Redonda', cuadrada: 'Cuadrada', rect: 'Rectángulo',
}

/** Color de la mesa en el editor según su tipo. */
export function colorMesa(tipo: TipoMesa): { bg: string; border: string } {
  switch (tipo) {
    case 'reservado': return { bg: 'rgba(212,168,75,0.22)', border: '#D4A84B' }
    case 'barra':     return { bg: 'rgba(79,142,247,0.20)', border: '#4F8EF7' }
    case 'otro':      return { bg: 'rgba(124,124,160,0.18)', border: '#8B8BA8' }
    default:          return { bg: 'rgba(233,69,96,0.18)', border: '#E94560' }
  }
}

export function PlanoEditor({ localId, plantas, mesas: mesasIniciales, onChange }: Props) {
  const toast = useToast()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [mesas, setMesas] = useState<Mesa[]>(mesasIniciales)
  const [plantaId, setPlantaId] = useState<string | null>(plantas[0]?.id ?? null)
  const [selId, setSelId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null)

  const mesasPlanta = mesas.filter(m => m.planta_id === plantaId)
  const seleccionada = mesas.find(m => m.id === selId) ?? null

  // ── Plantas ──────────────────────────────────────────────────
  const addPlanta = async () => {
    const nombre = window.prompt('Nombre de la planta', `Planta ${plantas.length + 1}`)?.trim()
    if (!nombre) return
    const { data, error } = await supabase.from('plantas')
      .insert({ local_id: localId, nombre, orden: plantas.length })
      .select('*').single()
    if (error || !data) { toast.error('No se pudo crear la planta'); return }
    await onChange()
    setPlantaId(data.id)
  }

  const renamePlanta = async (p: Planta) => {
    const nombre = window.prompt('Renombrar planta', p.nombre)?.trim()
    if (!nombre || nombre === p.nombre) return
    const { error } = await supabase.from('plantas').update({ nombre }).eq('id', p.id)
    if (error) { toast.error('No se pudo renombrar'); return }
    await onChange()
  }

  const deletePlanta = async (p: Planta) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}" y todas sus mesas?`)) return
    const { error } = await supabase.from('plantas').delete().eq('id', p.id)
    if (error) { toast.error('No se pudo eliminar'); return }
    setMesas(prev => prev.filter(m => m.planta_id !== p.id))
    await onChange()
    setPlantaId(prev => (prev === p.id ? null : prev))
  }

  // ── Mesas ────────────────────────────────────────────────────
  const addMesa = async () => {
    if (!plantaId) return
    const codigo = `M${mesas.length + 1}`
    const nueva = {
      local_id: localId, planta_id: plantaId, codigo,
      capacidad: 4, tipo: 'mesa' as TipoMesa, forma: 'redonda' as FormaMesa,
      pos_x: 0.5, pos_y: 0.5, ancho: 0.14, alto: 0.14,
      reservable: true, activa: true,
    }
    const { data, error } = await supabase.from('mesas').insert(nueva).select('*').single()
    if (error || !data) { toast.error('No se pudo añadir la mesa (¿código repetido?)'); return }
    setMesas(prev => [...prev, data as Mesa])
    setSelId(data.id)
    onChange()
  }

  const persistirPos = async (m: Mesa) => {
    await supabase.from('mesas').update({ pos_x: m.pos_x, pos_y: m.pos_y }).eq('id', m.id)
  }

  const guardarMesa = async (cambios: Partial<Mesa>) => {
    if (!seleccionada) return
    const actualizada = { ...seleccionada, ...cambios }
    setMesas(prev => prev.map(m => (m.id === seleccionada.id ? actualizada : m)))
    const { error } = await supabase.from('mesas').update(cambios).eq('id', seleccionada.id)
    if (error) { toast.error('No se pudo guardar'); return }
    onChange()
  }

  const deleteMesa = async (m: Mesa) => {
    if (!window.confirm(`¿Eliminar la mesa ${m.codigo}?`)) return
    const { error } = await supabase.from('mesas').delete().eq('id', m.id)
    if (error) { toast.error('No se pudo eliminar'); return }
    setMesas(prev => prev.filter(x => x.id !== m.id))
    setSelId(null)
    onChange()
  }

  // ── Drag ─────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent, m: Mesa) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { id: m.id, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent, m: Mesa) => {
    if (!dragRef.current || dragRef.current.id !== m.id) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    dragRef.current.moved = true
    setMesas(prev => prev.map(x2 => (x2.id === m.id ? { ...x2, pos_x: x, pos_y: y } : x2)))
  }

  const onPointerUp = (e: React.PointerEvent, m: Mesa) => {
    if (!dragRef.current || dragRef.current.id !== m.id) return
    const wasDrag = dragRef.current.moved
    dragRef.current = null
    if (wasDrag) {
      const actual = mesas.find(x => x.id === m.id)
      if (actual) persistirPos(actual)
    } else {
      setSelId(m.id)
    }
  }

  // ── Render ───────────────────────────────────────────────────
  if (plantas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 glass rounded-2xl">
        <p className="text-[#B8B8CC] text-sm">Aún no has definido el plano del local.</p>
        <Button onClick={addPlanta}><Plus size={16} /> Crear primera planta</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Plantas */}
      <div className="flex items-center gap-2 flex-wrap">
        {plantas.map(p => (
          <div key={p.id} className={cn(
            'flex items-center rounded-xl border overflow-hidden',
            p.id === plantaId ? 'border-[#E94560]/40 bg-[#E94560]/10' : 'border-white/10 bg-white/[0.03]'
          )}>
            <button onClick={() => { setPlantaId(p.id); setSelId(null) }}
              className={cn('px-3 py-2 text-sm font-medium', p.id === plantaId ? 'text-[#E94560]' : 'text-[#B8B8CC]')}>
              {p.nombre}
            </button>
            {p.id === plantaId && (
              <>
                <button onClick={() => renamePlanta(p)} className="px-2 py-2 text-[#8B8BA8] hover:text-white" aria-label="Renombrar"><Pencil size={13} /></button>
                <button onClick={() => deletePlanta(p)} className="px-2 py-2 text-[#8B8BA8] hover:text-[#E94560]" aria-label="Eliminar"><Trash2 size={13} /></button>
              </>
            )}
          </div>
        ))}
        <button onClick={addPlanta}
          className="px-3 py-2 rounded-xl border border-dashed border-white/15 text-sm text-[#8B8BA8] hover:text-white hover:border-white/30 flex items-center gap-1">
          <Plus size={14} /> Planta
        </button>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        {/* Lienzo */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#6B6B85] flex items-center gap-1.5"><Move size={12} /> Arrastra las mesas. Toca una para editarla.</p>
            <Button size="sm" variant="secondary" onClick={addMesa}><Plus size={14} /> Mesa</Button>
          </div>
          <div
            ref={canvasRef}
            onPointerDown={() => setSelId(null)}
            className="relative w-full aspect-[4/3] rounded-2xl border border-white/10 overflow-hidden select-none"
            style={{
              background: '#0C0C15',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '6.25% 8.33%',
            }}
          >
            {mesasPlanta.map(m => {
              const c = colorMesa(m.tipo)
              const sel = m.id === selId
              return (
                <div
                  key={m.id}
                  onPointerDown={e => onPointerDown(e, m)}
                  onPointerMove={e => onPointerMove(e, m)}
                  onPointerUp={e => onPointerUp(e, m)}
                  className={cn(
                    'absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing',
                    m.forma === 'redonda' ? 'rounded-full' : m.forma === 'rect' ? 'rounded-lg' : 'rounded-md',
                  )}
                  style={{
                    left: `${m.pos_x * 100}%`,
                    top: `${m.pos_y * 100}%`,
                    width: `${m.ancho * 100}%`,
                    height: `${m.alto * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    background: c.bg,
                    border: `2px solid ${c.border}`,
                    boxShadow: sel ? `0 0 0 2px #fff, 0 0 18px ${c.border}` : 'none',
                    touchAction: 'none',
                  }}
                >
                  <span className="text-[10px] font-bold text-white leading-none pointer-events-none">{m.codigo}</span>
                  <span className="text-[8px] text-white/70 leading-none mt-0.5 pointer-events-none">{m.capacidad}p</span>
                </div>
              )
            })}
            {mesasPlanta.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[#6B6B85]">Añade mesas con el botón “Mesa”.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel de edición */}
        <div className="glass rounded-2xl p-4 h-fit">
          {seleccionada ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Editar mesa</p>
                <button onClick={() => deleteMesa(seleccionada)} className="text-[#8B8BA8] hover:text-[#E94560]" aria-label="Eliminar mesa"><Trash2 size={15} /></button>
              </div>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Código</span>
                <input
                  defaultValue={seleccionada.codigo}
                  onBlur={e => { const v = e.target.value.trim(); if (v && v !== seleccionada.codigo) guardarMesa({ codigo: v }) }}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs text-[#8B8BA8]">Capacidad</span>
                  <input type="number" min={1} defaultValue={seleccionada.capacidad}
                    onBlur={e => { const v = parseInt(e.target.value, 10); if (v > 0 && v !== seleccionada.capacidad) guardarMesa({ capacidad: v }) }}
                    className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50" />
                </label>
                <label className="block">
                  <span className="text-xs text-[#8B8BA8]">Tipo</span>
                  <select value={seleccionada.tipo}
                    onChange={e => guardarMesa({ tipo: e.target.value as TipoMesa })}
                    className="mt-1 w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50">
                    {(Object.keys(TIPO_LABEL) as TipoMesa[]).map(t => <option key={t} value={t} className="bg-[#15152A]">{TIPO_LABEL[t]}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Forma</span>
                <select value={seleccionada.forma}
                  onChange={e => guardarMesa({ forma: e.target.value as FormaMesa })}
                  className="mt-1 w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50">
                  {(Object.keys(FORMA_LABEL) as FormaMesa[]).map(f => <option key={f} value={f} className="bg-[#15152A]">{FORMA_LABEL[f]}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Tamaño</span>
                <input type="range" min={6} max={30} defaultValue={Math.round(seleccionada.ancho * 100)}
                  onChange={e => { const v = parseInt(e.target.value, 10) / 100; guardarMesa({ ancho: v, alto: seleccionada.forma === 'rect' ? seleccionada.alto : v }) }}
                  className="mt-1 w-full accent-[#E94560]" />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-xs text-[#8B8BA8]">Reservable por usuarios</span>
                <input type="checkbox" checked={seleccionada.reservable}
                  onChange={e => guardarMesa({ reservable: e.target.checked })}
                  className="accent-[#E94560] w-4 h-4" />
              </label>
            </div>
          ) : (
            <p className="text-sm text-[#6B6B85]">Toca una mesa del plano para editar su código, capacidad, tipo y tamaño.</p>
          )}
        </div>
      </div>
    </div>
  )
}
