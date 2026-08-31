'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Planta, Mesa, TipoMesa, FormaMesa } from '@/types'
import { Plus, Minus, Trash2, Pencil, Save } from '@/components/todh/iconosTorneum'
import { Move, Maximize2 } from 'lucide-react'

const ZOOM_MIN = 0.6
const ZOOM_MAX = 4
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const clamp01 = (v: number) => clamp(v, 0, 1)

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
    default:          return { bg: 'rgba(182, 255, 58,0.18)', border: '#B6FF3A' }
  }
}

export function PlanoEditor({ localId, plantas, mesas: mesasIniciales, onChange }: Props) {
  const toast = useToast()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [mesas, setMesas] = useState<Mesa[]>(mesasIniciales)
  const [plantaId, setPlantaId] = useState<string | null>(plantas[0]?.id ?? null)
  const [selId, setSelId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null)
  // Mesas movidas pero aún sin guardar (para el botón Guardar con estado dirty).
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const hayCambios = dirtyIds.size > 0

  const mesasPlanta = mesas.filter(m => m.planta_id === plantaId)
  const seleccionada = mesas.find(m => m.id === selId) ?? null

  // ── Zoom / Pan del lienzo ────────────────────────────────────
  // view = transformación del "mundo": z=escala, x/y=desplazamiento en px.
  const [view, setView] = useState({ z: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const ptrs = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panStart = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null)
  const pinchStart = useRef<{ dist: number; z: number; cx: number; cy: number; vx: number; vy: number } | null>(null)

  /** Aplica un zoom manteniendo fijo el punto (cx,cy) relativo al viewport. */
  const zoomEn = (cx: number, cy: number, factor: number) => {
    setView(v => {
      const nz = clamp(v.z * factor, ZOOM_MIN, ZOOM_MAX)
      const worldX = (cx - v.x) / v.z
      const worldY = (cy - v.y) / v.z
      return { z: nz, x: cx - worldX * nz, y: cy - worldY * nz }
    })
  }
  const resetVista = () => setView({ z: 1, x: 0, y: 0 })
  /** Zoom desde los botones: mantiene fijo el centro del lienzo. */
  const zoomBtn = (factor: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    zoomEn(rect.width / 2, rect.height / 2, factor)
  }

  const onCanvasWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    zoomEn(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12)
  }

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    // Sólo el fondo (no una mesa, que hace stopPropagation): deselecciona + inicia pan/pinch.
    setSelId(null)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size === 1) {
      panStart.current = { px: e.clientX, py: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      const rect = canvasRef.current!.getBoundingClientRect()
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z,
        cx: (a.x + b.x) / 2 - rect.left, cy: (a.y + b.y) / 2 - rect.top,
        vx: viewRef.current.x, vy: viewRef.current.y,
      }
      panStart.current = null
    }
  }

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...ptrs.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const ps = pinchStart.current
      const nz = clamp(ps.z * (d / ps.dist), ZOOM_MIN, ZOOM_MAX)
      const worldX = (ps.cx - ps.vx) / ps.z
      const worldY = (ps.cy - ps.vy) / ps.z
      setView({ z: nz, x: ps.cx - worldX * nz, y: ps.cy - worldY * nz })
    } else if (panStart.current) {
      const p = panStart.current
      setView(v => ({ ...v, x: p.vx + (e.clientX - p.px), y: p.vy + (e.clientY - p.py) }))
    }
  }

  const onCanvasPointerUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) pinchStart.current = null
    if (ptrs.current.size === 0) panStart.current = null
  }

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
    // Código único robusto: leemos los códigos FRESCOS de la BD (no del estado
    // local, que puede estar obsoleto) y tomamos el mayor "M<n>" + 1. Así no
    // colisiona con UNIQUE(local_id, codigo) aunque el plano haya cambiado.
    const { data: existentes } = await supabase.from('mesas').select('codigo').eq('local_id', localId)
    const numsM = (existentes ?? []).map(r => {
      const mt = /^M(\d+)$/.exec(r.codigo as string)
      return mt ? parseInt(mt[1], 10) : 0
    })
    const codigo = `M${(numsM.length ? Math.max(...numsM) : 0) + 1}`
    const nueva = {
      local_id: localId, planta_id: plantaId, codigo,
      capacidad: 4, tipo: 'mesa' as TipoMesa, forma: 'redonda' as FormaMesa,
      pos_x: 0.5, pos_y: 0.5, ancho: 0.14, alto: 0.14,
      reservable: true, activa: true,
    }
    const { data, error } = await supabase.from('mesas').insert(nueva).select('*').single()
    if (error || !data) {
      if (process.env.NODE_ENV !== 'production') console.error('[addMesa] error:', error)
      toast.error(error?.message ? `No se pudo añadir la mesa: ${error.message}` : 'No se pudo añadir la mesa')
      return
    }
    setMesas(prev => [...prev, data as Mesa])
    setSelId(data.id)
    onChange()
  }

  // Guarda las posiciones de todas las mesas movidas desde el último guardado.
  const guardarPosiciones = async () => {
    if (dirtyIds.size === 0) return
    setGuardando(true)
    const ids = [...dirtyIds]
    const res = await Promise.all(ids.map(id => {
      const m = mesas.find(x => x.id === id)
      if (!m) return Promise.resolve({ error: null })
      return supabase.from('mesas').update({ pos_x: m.pos_x, pos_y: m.pos_y }).eq('id', id)
    }))
    setGuardando(false)
    if (res.some(r => r && r.error)) { toast.error('No se pudo guardar el plano'); return }
    setDirtyIds(new Set())
    toast.success('Plano guardado')
    onChange()
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
    setDirtyIds(prev => { const n = new Set(prev); n.delete(m.id); return n })
    setSelId(null)
    toast.success(`Mesa ${m.codigo} eliminada`)
    onChange()
  }

  // ── Drag ─────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent, m: Mesa) => {
    e.stopPropagation()
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId) } catch { /* no-op */ }
    dragRef.current = { id: m.id, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent, m: Mesa) => {
    if (!dragRef.current || dragRef.current.id !== m.id) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    // Convertir px de pantalla → coord normalizada del mundo (con zoom/pan).
    const v = viewRef.current
    const x = clamp01((e.clientX - rect.left - v.x) / (v.z * rect.width))
    const y = clamp01((e.clientY - rect.top - v.y) / (v.z * rect.height))
    dragRef.current.moved = true
    setMesas(prev => prev.map(x2 => (x2.id === m.id ? { ...x2, pos_x: x, pos_y: y } : x2)))
  }

  const onPointerUp = (e: React.PointerEvent, m: Mesa) => {
    if (!dragRef.current || dragRef.current.id !== m.id) return
    const wasDrag = dragRef.current.moved
    dragRef.current = null
    if (wasDrag) {
      // No persistimos al instante: marcamos la mesa como pendiente de guardar.
      setDirtyIds(prev => new Set(prev).add(m.id))
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
            p.id === plantaId ? 'border-[#B6FF3A]/40 bg-[#B6FF3A]/10' : 'border-white/10 bg-white/[0.03]'
          )}>
            <button onClick={() => { setPlantaId(p.id); setSelId(null) }}
              className={cn('px-3 py-2 text-sm font-medium', p.id === plantaId ? 'text-[#B6FF3A]' : 'text-[#B8B8CC]')}>
              {p.nombre}
            </button>
            {p.id === plantaId && (
              <>
                <button onClick={() => renamePlanta(p)} className="px-2 py-2 text-[#8B8BA8] hover:text-white" aria-label="Renombrar"><Pencil size={13} /></button>
                <button onClick={() => deletePlanta(p)} className="px-2 py-2 text-[#8B8BA8] hover:text-[#B6FF3A]" aria-label="Eliminar"><Trash2 size={13} /></button>
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
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs text-[#6B6B85] flex items-center gap-1.5 min-w-0">
              <Move size={12} className="shrink-0" /> <span className="truncate">Arrastra mesas. Rueda/pellizco = zoom; arrastra el fondo = mover.</span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={hayCambios ? 'primary' : 'ghost'}
                loading={guardando}
                disabled={!hayCambios}
                onClick={guardarPosiciones}
              >
                <Save size={14} /> {hayCambios ? `Guardar${dirtyIds.size > 1 ? ` (${dirtyIds.size})` : ''}` : 'Guardado'}
              </Button>
              <Button size="sm" variant="secondary" onClick={addMesa}><Plus size={14} /> Mesa</Button>
            </div>
          </div>
          <div
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
            onWheel={onCanvasWheel}
            className="relative w-full aspect-[4/3] rounded-2xl border border-white/10 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            style={{ background: 'var(--p-plano-bg, #10131B)', touchAction: 'none' }}
          >
            {/* Mundo transformable (zoom + pan). El grid escala con el contenido. */}
            <div
              className="absolute inset-0 origin-top-left"
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
                backgroundImage: 'linear-gradient(var(--p-plano-grid, rgba(255,255,255,0.04)) 1px, transparent 1px), linear-gradient(90deg, var(--p-plano-grid, rgba(255,255,255,0.04)) 1px, transparent 1px)',
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
            </div>

            {mesasPlanta.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-[#6B6B85]">Añade mesas con el botón “Mesa”.</p>
              </div>
            )}

            {/* Controles de zoom (no propagan al pan del fondo) */}
            <div
              className="absolute bottom-3 right-3 flex flex-col gap-1.5"
              onPointerDown={e => e.stopPropagation()}
            >
              <button onClick={() => zoomBtn(1.25)} aria-label="Acercar"
                className="h-9 w-9 flex items-center justify-center rounded-xl glass-strong border border-white/10 text-white hover:bg-white/10"><Plus size={16} /></button>
              <button onClick={() => zoomBtn(0.8)} aria-label="Alejar"
                className="h-9 w-9 flex items-center justify-center rounded-xl glass-strong border border-white/10 text-white hover:bg-white/10"><Minus size={16} /></button>
              <button onClick={resetVista} aria-label="Ajustar"
                className="h-9 w-9 flex items-center justify-center rounded-xl glass-strong border border-white/10 text-[#B8B8CC] hover:bg-white/10 hover:text-white"><Maximize2 size={15} /></button>
            </div>
            <span className="absolute bottom-3 left-3 rounded-lg glass-strong border border-white/10 px-2 py-1 text-[10px] font-medium text-[#B8B8CC] pointer-events-none">
              {Math.round(view.z * 100)}%
            </span>
          </div>
        </div>

        {/* Panel de edición */}
        <div className="glass rounded-2xl p-4 h-fit">
          {seleccionada ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Editar mesa</p>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Código</span>
                <input
                  defaultValue={seleccionada.codigo}
                  onBlur={e => { const v = e.target.value.trim(); if (v && v !== seleccionada.codigo) guardarMesa({ codigo: v }) }}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/50"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs text-[#8B8BA8]">Capacidad</span>
                  <input type="number" min={1} defaultValue={seleccionada.capacidad}
                    onBlur={e => { const v = parseInt(e.target.value, 10); if (v > 0 && v !== seleccionada.capacidad) guardarMesa({ capacidad: v }) }}
                    className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/50" />
                </label>
                <label className="block">
                  <span className="text-xs text-[#8B8BA8]">Tipo</span>
                  <select value={seleccionada.tipo}
                    onChange={e => guardarMesa({ tipo: e.target.value as TipoMesa })}
                    className="mt-1 w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/50">
                    {(Object.keys(TIPO_LABEL) as TipoMesa[]).map(t => <option key={t} value={t} className="bg-[#181D2A]">{TIPO_LABEL[t]}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Forma</span>
                <select value={seleccionada.forma}
                  onChange={e => guardarMesa({ forma: e.target.value as FormaMesa })}
                  className="mt-1 w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#B6FF3A]/50">
                  {(Object.keys(FORMA_LABEL) as FormaMesa[]).map(f => <option key={f} value={f} className="bg-[#181D2A]">{FORMA_LABEL[f]}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Tamaño</span>
                <input type="range" min={6} max={30} defaultValue={Math.round(seleccionada.ancho * 100)}
                  onChange={e => { const v = parseInt(e.target.value, 10) / 100; guardarMesa({ ancho: v, alto: seleccionada.forma === 'rect' ? seleccionada.alto : v }) }}
                  className="mt-1 w-full accent-[#B6FF3A]" />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-xs text-[#8B8BA8]">Reservable por usuarios</span>
                <input type="checkbox" checked={seleccionada.reservable}
                  onChange={e => guardarMesa({ reservable: e.target.checked })}
                  className="accent-[#B6FF3A] w-4 h-4" />
              </label>

              <button
                onClick={() => deleteMesa(seleccionada)}
                className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#B6FF3A]/30 text-[#B6FF3A] text-sm hover:bg-[#B6FF3A]/10 transition-colors"
              >
                <Trash2 size={14} /> Eliminar mesa
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#6B6B85]">Toca una mesa del plano para editar su código, capacidad, tipo y tamaño.</p>
          )}
        </div>
      </div>
    </div>
  )
}
