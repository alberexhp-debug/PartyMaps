'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { BottomSheet } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Local, TipoLocal, TipoMusica, ConsumicionBienvenida, PrecioDinamicoConfig, ProductoLocal, CategoriaProducto } from '@/types'
import { getLabelTipoLocal, formatearPrecio, youtubeId } from '@/lib/utils'
import { PrecioDinamicoEditor } from '@/components/local-panel/PrecioDinamicoEditor'
import { AforoSemanal } from '@/components/local-panel/AforoSemanal'
import {
  Save, Plus, Trash2, Eye, EyeOff, Edit3, AtSign,
  Image as ImageIcon, Clock, Ticket, ShoppingBag, AlertCircle, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { estadoApertura, textoEstadoFicha, type EstadoApertura } from '@/lib/horarios'

type Tab = 'info' | 'horario' | 'aforo' | 'entradas' | 'galeria' | 'bienvenida' | 'bar' | 'instagram'

const TABS: { id: Tab; label: string }[] = [
  { id: 'info',       label: 'Info' },
  { id: 'horario',    label: 'Horario' },
  { id: 'aforo',      label: 'Aforo' },
  { id: 'entradas',   label: 'Entradas' },
  { id: 'galeria',    label: 'Galería' },
  { id: 'bienvenida', label: 'Bienvenida' },
  { id: 'bar',        label: 'Bar' },
  { id: 'instagram',  label: 'Instagram' },
]

const TIPOS_LOCAL: TipoLocal[] = ['discoteca', 'bar_copas', 'rooftop', 'sala_conciertos', 'bar_cocteleria', 'otro']
const TIPOS_MUSICA: TipoMusica[] = ['techno', 'house', 'reggaeton', 'pop', 'hip_hop', 'indie', 'electronica', 'flamenco', 'otro']
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const
const LABEL_DIA: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
}
// El horario se piensa "por noches": "Noche del viernes" abre el viernes y puede cerrar de madrugada el sábado.
const NOCHE_LABEL: Record<string, string> = {
  lunes: 'Noche del lunes', martes: 'Noche del martes', miercoles: 'Noche del miércoles', jueves: 'Noche del jueves',
  viernes: 'Noche del viernes', sabado: 'Noche del sábado', domingo: 'Noche del domingo',
}
const DIA_SIGUIENTE: Record<string, string> = {
  lunes: 'martes', martes: 'miércoles', miercoles: 'jueves', jueves: 'viernes',
  viernes: 'sábado', sabado: 'domingo', domingo: 'lunes',
}
// Punto de color de la vista previa (mismos tokens que el mapa/ficha).
const PUNTO_ESTADO: Record<EstadoApertura, string> = {
  abierto: 'bg-[#27AE60]', abre_pronto: 'bg-[#F39C12]', cerrado: 'bg-[#4A4A60]', sin_datos: 'bg-[#4A4A60]',
}
const CATEGORIAS: { value: CategoriaProducto; label: string }[] = [
  { value: 'cerveza', label: 'Cerveza' }, { value: 'cubata', label: 'Cubata' },
  { value: 'copa', label: 'Copa' }, { value: 'cocktail', label: 'Cóctel' },
  { value: 'chupito', label: 'Chupito' }, { value: 'refresco', label: 'Refresco' },
  { value: 'agua', label: 'Agua' }, { value: 'comida', label: 'Comida' },
  { value: 'snack', label: 'Snack' }, { value: 'pack', label: 'Pack' },
  { value: 'otro', label: 'Otro' },
]
const LIMITE_BAR: Record<string, number> = { visibility: 10, basico: 10, venta: 10, pro: 50, destacado: 9999 }

interface FormBar {
  id?: string
  nombre: string; descripcion: string; categoria: CategoriaProducto
  precio: string; coste: string; disponible: boolean; es_pack: boolean; unidades_pack: string
}
const barVacio: FormBar = { nombre: '', descripcion: '', categoria: 'cubata', precio: '', coste: '', disponible: true, es_pack: false, unidades_pack: '' }

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ConfiguracionContent />
    </Suspense>
  )
}

function ConfiguracionContent() {
  const toast = useToast()
  const searchParams = useSearchParams()
  const { local, setLocal, trabajador } = useLocalPanelStore()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab | null
    return TABS.some(x => x.id === t) ? t! : 'info'
  })
  const [form, setForm] = useState<Partial<Local>>(local || {})
  const [guardando, setGuardando] = useState(false)
  // Tick de 1 min para que la vista previa viva del horario avance sola (abre_pronto → abierto a las 00:00).
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setAhora(new Date()), 60000); return () => clearInterval(id) }, [])

  // Bar state
  const [productos, setProductos] = useState<ProductoLocal[]>([])
  const [loadingBar, setLoadingBar] = useState(false)
  const [editandoBar, setEditandoBar] = useState<FormBar | null>(null)
  const [guardandoBar, setGuardandoBar] = useState(false)

  const puedeEditar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'
  const limiteBar = LIMITE_BAR[local?.tier ?? 'visibility'] ?? 10

  useEffect(() => { if (local) setForm(local) }, [local])

  const cargarBar = useCallback(async () => {
    setLoadingBar(true)
    const res = await fetch('/api/local-panel/productos')
    if (res.ok) { const j = await res.json(); setProductos(j.productos ?? []) }
    setLoadingBar(false)
  }, [])

  useEffect(() => { if (tab === 'bar') cargarBar() }, [tab, cargarBar])

  const guardar = async () => {
    if (!local) return
    // Validación de horarios por noches (doc 03 §4.1): apertura ≠ cierre y máx 14h por tramo.
    const hForm = form.horario as Record<string, { apertura: string; cierre: string } | null> | undefined
    if (hForm) {
      for (const dia of DIAS) {
        const t = hForm[dia]
        if (!t) continue
        if (t.apertura === t.cierre) { toast.error(`${NOCHE_LABEL[dia]}: la apertura y el cierre no pueden ser iguales`); return }
        const [ah, am] = t.apertura.split(':').map(Number)
        const [ch, cm] = t.cierre.split(':').map(Number)
        let dur = (ch * 60 + cm) - (ah * 60 + am)
        if (dur <= 0) dur += 24 * 60 // cruza medianoche
        if (dur > 14 * 60) { toast.error(`${NOCHE_LABEL[dia]}: el horario dura más de 14h, revísalo`); return }
      }
    }
    setGuardando(true)
    const { data, error } = await supabase.from('locales').update({
      nombre: form.nombre,
      descripcion: form.descripcion,
      tipo_local: form.tipo_local,
      musica: form.musica,
      direccion: form.direccion,
      ciudad: form.ciudad,
      precio_entrada_min: form.precio_entrada_min,
      precio_entrada_max: form.precio_entrada_max,
      precio_dinamico: form.precio_dinamico ?? null,
      horario: form.horario,
      consumiciones_bienvenida: form.consumiciones_bienvenida,
      imagenes: form.imagenes,
      videos_youtube: form.videos_youtube ?? [],
      instagram_handle: form.instagram_handle ?? null,
      entradas_disponibles_noche: form.entradas_disponibles_noche ?? null,
    }).eq('id', local.id).select().single()
    if (error) { toast.error('Error al guardar'); setGuardando(false); return }
    setLocal(data)
    toast.success('Configuración guardada')
    setGuardando(false)
  }

  const guardarBar = async () => {
    if (!editandoBar) return
    const precio = parseFloat(editandoBar.precio.replace(',', '.'))
    if (!editandoBar.nombre.trim()) { toast.error('Falta el nombre'); return }
    if (Number.isNaN(precio) || precio < 0) { toast.error('Precio inválido'); return }
    const costeRaw = editandoBar.coste.trim()
    const coste = costeRaw ? parseFloat(costeRaw.replace(',', '.')) : null
    if (coste != null && (Number.isNaN(coste) || coste < 0)) { toast.error('Coste inválido'); return }
    setGuardandoBar(true)
    const body: Record<string, unknown> = {
      nombre: editandoBar.nombre.trim(), descripcion: editandoBar.descripcion.trim() || null,
      categoria: editandoBar.categoria, precio, coste, disponible: editandoBar.disponible,
      es_pack: editandoBar.es_pack,
      unidades_pack: editandoBar.es_pack ? parseInt(editandoBar.unidades_pack || '0', 10) || null : null,
    }
    const res = editandoBar.id
      ? await fetch('/api/local-panel/productos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editandoBar.id, ...body }) })
      : await fetch('/api/local-panel/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json()
    setGuardandoBar(false)
    if (!res.ok) { toast.error(j.error || 'Error'); return }
    toast.success(editandoBar.id ? 'Producto actualizado' : 'Producto añadido')
    setEditandoBar(null)
    cargarBar()
  }

  const toggleDisponibleBar = async (p: ProductoLocal) => {
    await fetch('/api/local-panel/productos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, disponible: !p.disponible }) })
    cargarBar()
  }

  const eliminarBar = async (p: ProductoLocal) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    const res = await fetch(`/api/local-panel/productos?id=${p.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); cargarBar() }
  }

  const toggleMusica = (m: TipoMusica) => {
    const current = form.musica || []
    setForm(f => ({ ...f, musica: current.includes(m) ? current.filter(x => x !== m) : [...current, m] }))
  }

  const addConsumicion = () => {
    const nueva: ConsumicionBienvenida = { id: crypto.randomUUID(), nombre: '', descripcion: '', precio: 0 }
    setForm(f => ({ ...f, consumiciones_bienvenida: [...(f.consumiciones_bienvenida || []), nueva] }))
  }

  // Copia el tramo del viernes a todas las noches ya abiertas (el 90% repite horario el finde).
  const copiarViernes = () => {
    const v = (form.horario as Record<string, { apertura: string; cierre: string } | null>)?.viernes
    if (!v) { toast.error('Configura primero la noche del viernes'); return }
    setForm(f => {
      const next = { ...(f.horario as Record<string, { apertura: string; cierre: string } | null>) }
      for (const dia of DIAS) if (next[dia]) next[dia] = { ...v }
      return { ...f, horario: next }
    })
    toast.success('Copiado a las noches abiertas')
  }

  if (!local) return null

  // Vista previa viva: cómo se ve el local AHORA con el horario que hay en el formulario.
  const previa = estadoApertura({ horario: (form.horario ?? null) as Local['horario'] | null, cerrado_hasta: local.cerrado_hasta ?? null }, ahora)
  const previaTexto = textoEstadoFicha(previa, ahora)
  const viernesAbierto = !!(form.horario as Record<string, unknown> | undefined)?.viernes

  return (
    <div className="min-h-screen">
      {/* Header fijo */}
      <div className="sticky top-0 z-10 bg-[#0B0B16]/95 backdrop-blur-xl border-b border-white/6">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8B8BA8] font-medium uppercase tracking-widest mb-0.5">Configuración</p>
            <h1 className="text-lg font-bold text-white truncate">{local.nombre}</h1>
          </div>
          {tab !== 'bar' && tab !== 'aforo' && (
            <Button size="sm" loading={guardando} onClick={guardar}>
              <Save size={14} /> Guardar
            </Button>
          )}
        </div>

        {/* Tabs horizontales */}
        <div className="px-4 pb-3 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                tab === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-[#8B8BA8] hover:text-white hover:bg-white/5'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 pb-32 md:pb-10">

        {/* ── TAB: Info básica ── */}
        {tab === 'info' && (
          <div className="space-y-5 max-w-2xl">
            <Input label="Nombre del local" value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#A0A0B8]">Descripción</label>
              <textarea
                value={form.descripcion || ''}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                rows={4} maxLength={600}
                className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 resize-none placeholder:text-[#6B6B85] transition-colors"
                placeholder="Describe tu local…"
              />
              <p className="text-xs text-[#6B6B85] text-right">{(form.descripcion || '').length}/600</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">Tipo de local</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_LOCAL.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo_local: t }))}
                    className={cn('px-3 py-1.5 rounded-xl text-sm border transition-all',
                      form.tipo_local === t
                        ? 'bg-white/10 border-white/20 text-white font-semibold'
                        : 'border-white/8 text-[#8B8BA8] hover:border-white/15 hover:text-white')}>
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
                    className={cn('px-3 py-1.5 rounded-xl text-sm border capitalize transition-all',
                      (form.musica || []).includes(m)
                        ? 'bg-[#4F8EF7]/15 border-[#4F8EF7]/40 text-[#4F8EF7] font-semibold'
                        : 'border-white/8 text-[#8B8BA8] hover:border-white/15 hover:text-white')}>
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Dirección" value={form.direccion || ''} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              <Input label="Ciudad" value={form.ciudad || ''} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#A0A0B8]">Precio entrada mín. (€)</label>
                <input type="number" min="0" step="0.5"
                  value={form.precio_entrada_min || 0}
                  onChange={e => setForm(f => ({ ...f, precio_entrada_min: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#A0A0B8]">Precio entrada máx. (€)</label>
                <input type="number" min="0" step="0.5"
                  value={form.precio_entrada_max || 0}
                  onChange={e => setForm(f => ({ ...f, precio_entrada_max: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>

            <PrecioDinamicoEditor
              value={form.precio_dinamico}
              onChange={(v: PrecioDinamicoConfig) => setForm(f => ({ ...f, precio_dinamico: v }))}
              precioMin={form.precio_entrada_min || 0}
              precioMax={form.precio_entrada_max}
              ayuda="Aplica a noches sin evento. Para eventos concretos configúralo en el detalle del evento."
            />
          </div>
        )}

        {/* ── TAB: Horario ── */}
        {tab === 'horario' && (
          <div className="space-y-3 max-w-2xl">
            {/* Cabecera */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-[#4F8EF7]" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Horarios por noches</h2>
                <p className="text-xs text-[#8B8BA8] mt-0.5 leading-relaxed">
                  Define cada noche: de cuándo a cuándo abres. Si cierras de madrugada, es normal que el cierre sea «del día siguiente». Nosotros lo entendemos así.
                </p>
              </div>
            </div>

            {/* Una fila por noche */}
            {DIAS.map(dia => {
              const h = (form.horario as Record<string, { apertura: string; cierre: string } | null>)?.[dia]
              const cruzaMedianoche = !!h && h.cierre <= h.apertura
              return (
                <div key={dia} className={cn('bg-white/3 border border-white/6 rounded-2xl p-4', !h && 'opacity-60')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                        h ? 'bg-white/10 text-white' : 'bg-white/4 text-[#6B6B85]'
                      )}>
                        {LABEL_DIA[dia]}
                      </div>
                      <div>
                        <span className="text-white text-sm font-medium">{NOCHE_LABEL[dia]}</span>
                        {h
                          ? <p className="text-xs text-[#8B8BA8]">{h.apertura} – {h.cierre}</p>
                          : <p className="text-xs text-[#6B6B85]">Cerrado</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => setForm(f => ({ ...f, horario: { ...f.horario, [dia]: h ? null : { apertura: '23:00', cierre: '06:00' } } }))}
                      className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                        h ? 'text-[#E94560] bg-[#E94560]/10 hover:bg-[#E94560]/15' : 'text-[#4F8EF7] bg-[#4F8EF7]/10 hover:bg-[#4F8EF7]/15')}
                    >
                      {h ? 'Cerrar' : 'Abrir'}
                    </button>
                  </div>
                  {h && (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-[#8B8BA8]">Apertura</label>
                          <input type="time" value={h.apertura}
                            onChange={e => setForm(f => ({ ...f, horario: { ...f.horario, [dia]: { ...h, apertura: e.target.value } } }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-white/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-[#8B8BA8]">Cierre</label>
                          <input type="time" value={h.cierre}
                            onChange={e => setForm(f => ({ ...f, horario: { ...f.horario, [dia]: { ...h, cierre: e.target.value } } }))}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-white/20"
                          />
                        </div>
                      </div>
                      {cruzaMedianoche && (
                        <p className="mt-2 text-[11px] text-[#8B8BA8]">cierra el {DIA_SIGUIENTE[dia]} de madrugada ✓</p>
                      )}
                    </>
                  )}
                </div>
              )
            })}

            {/* Copiar viernes a las noches abiertas */}
            <Button variant="ghost" size="sm" disabled={!viernesAbierto} onClick={copiarViernes}>
              <Zap size={14} /> Copiar viernes a todas las noches abiertas
            </Button>

            {/* Tip de la noche suelta */}
            <p className="text-xs text-[#8B8BA8] leading-relaxed">
              ¿Abres una noche suelta (festivo, fiesta especial)? No toques el horario: publica un evento y esa noche saldrás abierto.
            </p>

            {/* Vista previa viva */}
            <div className="bg-white/4 border border-white/8 rounded-2xl p-4 flex items-center gap-2.5">
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', PUNTO_ESTADO[previa.estado])} />
              <p className="text-sm text-[#B8B8CC]">
                {previa.estado === 'sin_datos'
                  ? 'Ahora mismo tu local no muestra estado. Configura sus noches para salir «abierto» en el mapa.'
                  : <>Ahora mismo tu local se ve: <span className="text-white font-medium">{previaTexto}</span></>}
              </p>
            </div>
          </div>
        )}

        {/* ── TAB: Aforo ── */}
        {tab === 'aforo' && (
          <div className="max-w-2xl">
            <AforoSemanal local={local} onSaved={setLocal} />
          </div>
        )}

        {/* ── TAB: Entradas ── */}
        {tab === 'entradas' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E94560]/10 border border-[#E94560]/20 flex items-center justify-center">
                  <Ticket size={18} className="text-[#E94560]" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-sm">Cupo de entradas por noche</h2>
                  <p className="text-xs text-[#8B8BA8] mt-0.5">Las ventas se pararán automáticamente al alcanzar el límite</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#A0A0B8]">
                  Máximo de entradas
                  <span className="text-[#8B8BA8] font-normal ml-2">(dejar vacío = sin límite)</span>
                </label>
                <input
                  type="number" min="1" step="1"
                  value={form.entradas_disponibles_noche || ''}
                  onChange={e => setForm(f => ({
                    ...f,
                    entradas_disponibles_noche: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  placeholder="Ej: 200"
                  className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div className="p-3 bg-[#F39C12]/5 border border-[#F39C12]/20 rounded-xl">
                <p className="text-xs text-[#F39C12]">
                  Puedes cambiar el cupo para noches específicas desde el evento. Este valor es el predeterminado.
                </p>
              </div>
            </div>

            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <h2 className="font-semibold text-white text-sm mb-4">Precio dinámico por defecto</h2>
              <PrecioDinamicoEditor
                value={form.precio_dinamico}
                onChange={(v: PrecioDinamicoConfig) => setForm(f => ({ ...f, precio_dinamico: v }))}
                precioMin={form.precio_entrada_min || 0}
                precioMax={form.precio_entrada_max}
                ayuda="Sube el precio automáticamente según la demanda. Configúralo también por evento."
              />
            </div>
          </div>
        )}

        {/* ── TAB: Galería ── */}
        {tab === 'galeria' && (
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-[#8B8BA8]">La primera imagen es la portada en el mapa y en la lista de locales</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(form.imagenes || []).map((url, i) => (
                <div key={i} className="relative aspect-video">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-xl bg-white/4" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 bg-black/60 rounded-full text-white">Portada</span>
                  )}
                  <button
                    onClick={() => setForm(f => ({ ...f, imagenes: f.imagenes?.filter((_, j) => j !== i) }))}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-red-400 hover:bg-black/80"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {(form.imagenes || []).length === 0 && (
                <div className="col-span-2 md:col-span-3 flex flex-col items-center justify-center py-14 border-2 border-dashed border-white/10 rounded-2xl gap-3">
                  <ImageIcon size={28} className="text-[#6B6B85]" />
                  <p className="text-sm text-[#6B6B85]">Sin imágenes todavía</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A0A0B8]">Añadir URL de imagen</label>
              <div className="flex gap-2">
                <input
                  id="nueva-url-img"
                  type="url"
                  placeholder="https://…"
                  className="flex-1 px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 transition-colors"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('nueva-url-img') as HTMLInputElement
                    if (input.value.trim()) {
                      setForm(f => ({ ...f, imagenes: [...(f.imagenes || []), input.value.trim()] }))
                      input.value = ''
                    }
                  }}
                  className="px-4 py-3 bg-white/8 border border-white/10 rounded-xl text-white text-sm font-semibold hover:bg-white/12 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Vídeos de YouTube */}
            <div className="space-y-2 pt-3 border-t border-white/6">
              <label className="text-sm font-medium text-[#A0A0B8]">Vídeos de YouTube (máx. 3)</label>
              <p className="text-xs text-[#6B6B85]">Se muestran en la página de tu local. Pega el enlace del vídeo.</p>
              {(form.videos_youtube || []).map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-white bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">{url}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, videos_youtube: (f.videos_youtube || []).filter((_, j) => j !== i) }))}
                    className="w-9 h-9 shrink-0 bg-black/30 rounded-xl flex items-center justify-center text-red-400 hover:bg-black/50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(form.videos_youtube || []).length < 3 && (
                <div className="flex gap-2">
                  <input
                    id="nueva-url-video"
                    type="url"
                    placeholder="https://youtube.com/watch?v=…"
                    className="flex-1 px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 transition-colors"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('nueva-url-video') as HTMLInputElement
                      const v = input.value.trim()
                      if (v && youtubeId(v)) {
                        setForm(f => ({ ...f, videos_youtube: [...(f.videos_youtube || []), v] }))
                        input.value = ''
                      } else if (v) {
                        toast.error('Ese enlace de YouTube no es válido')
                      }
                    }}
                    className="px-4 py-3 bg-white/8 border border-white/10 rounded-xl text-white text-sm font-semibold hover:bg-white/12 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Bienvenida ── */}
        {tab === 'bienvenida' && (
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-[#8B8BA8]">Consumiciones que el usuario elige al comprar su entrada (incluidas en el precio)</p>

            {(form.consumiciones_bienvenida || []).map((c, i) => (
              <div key={c.id} className="bg-white/3 border border-white/6 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Consumición {i + 1}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, consumiciones_bienvenida: f.consumiciones_bienvenida?.filter(x => x.id !== c.id) }))}
                    className="p-1 text-[#E94560]/60 hover:text-[#E94560] transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Nombre" value={c.nombre}
                    onChange={e => setForm(f => ({ ...f, consumiciones_bienvenida: f.consumiciones_bienvenida?.map(x => x.id === c.id ? { ...x, nombre: e.target.value } : x) }))}
                    placeholder="Ej: Botella de agua"
                  />
                  <Input label="Descripción" value={c.descripcion}
                    onChange={e => setForm(f => ({ ...f, consumiciones_bienvenida: f.consumiciones_bienvenida?.map(x => x.id === c.id ? { ...x, descripcion: e.target.value } : x) }))}
                    placeholder="Descripción breve"
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#A0A0B8]">Precio (€)</label>
                    <input type="number" min="0" step="0.5" value={c.precio}
                      onChange={e => setForm(f => ({ ...f, consumiciones_bienvenida: f.consumiciones_bienvenida?.map(x => x.id === c.id ? { ...x, precio: parseFloat(e.target.value) } : x) }))}
                      className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addConsumicion}
              className="w-full flex items-center justify-center gap-2 h-12 border-2 border-dashed border-white/10 rounded-xl text-[#8B8BA8] hover:border-white/20 hover:text-white transition-colors"
            >
              <Plus size={16} /> Añadir consumición
            </button>
          </div>
        )}

        {/* ── TAB: Bar ── */}
        {tab === 'bar' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B8BA8]">
                  <span className="text-white font-bold text-numeric">{productos.length}</span>
                  {' / '}
                  <span className="text-numeric">{limiteBar === 9999 ? '∞' : limiteBar}</span> productos · tier {local.tier}
                </p>
              </div>
              {puedeEditar && productos.length < limiteBar && (
                <Button size="sm" onClick={() => setEditandoBar({ ...barVacio })}>
                  <Plus size={14} /> Añadir
                </Button>
              )}
            </div>

            {!puedeEditar && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F39C12]/10 border border-[#F39C12]/20 text-xs text-[#F39C12]">
                <AlertCircle size={14} /> Solo dueño y gestor pueden editar productos.
              </div>
            )}

            {loadingBar ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
            ) : productos.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <ShoppingBag size={32} className="text-[#6B6B85]" />
                <p className="text-sm text-[#8B8BA8]">Tu carta está vacía. Añade tus productos.</p>
                {puedeEditar && <Button size="sm" onClick={() => setEditandoBar({ ...barVacio })}><Plus size={14} /> Crear producto</Button>}
              </div>
            ) : (
              <div className="space-y-2">
                {productos.map(p => (
                  <div key={p.id} className={cn('flex items-center gap-3 p-3 bg-white/3 border border-white/6 rounded-xl', !p.disponible && 'opacity-50')}>
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-lg">
                      {p.categoria === 'cerveza' ? '🍺' : p.categoria === 'cubata' || p.categoria === 'copa' ? '🥃' : p.categoria === 'cocktail' ? '🍸' : p.categoria === 'refresco' ? '🥤' : p.categoria === 'agua' ? '💧' : p.categoria === 'comida' ? '🍽️' : p.categoria === 'snack' ? '🥨' : p.categoria === 'pack' ? '🎁' : '✨'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white truncate">{p.nombre}</p>
                        {p.es_pack && <Badge variant="gold" size="sm">{p.unidades_pack}ud</Badge>}
                      </div>
                      <p className="text-xs text-[#8B8BA8] capitalize">{p.categoria}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white text-numeric">{formatearPrecio(p.precio)}</p>
                      {p.coste != null && (
                        <p className="text-[10px] text-[#27AE60] text-numeric">
                          +{formatearPrecio(p.precio - p.coste)}{p.precio > 0 ? ` · ${Math.round(((p.precio - p.coste) / p.precio) * 100)}%` : ''}
                        </p>
                      )}
                    </div>
                    {puedeEditar && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleDisponibleBar(p)} className="w-8 h-8 rounded-lg bg-white/4 flex items-center justify-center text-[#B8B8CC] hover:text-white transition-colors">
                          {p.disponible ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button onClick={() => setEditandoBar({ id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? '', categoria: p.categoria, precio: p.precio.toString(), coste: p.coste?.toString() ?? '', disponible: p.disponible, es_pack: p.es_pack, unidades_pack: p.unidades_pack?.toString() ?? '' })} className="w-8 h-8 rounded-lg bg-white/4 flex items-center justify-center text-[#B8B8CC] hover:text-white transition-colors">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => eliminarBar(p)} className="w-8 h-8 rounded-lg bg-[#E94560]/8 border border-[#E94560]/20 flex items-center justify-center text-[#E94560] hover:bg-[#E94560]/15 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modal edición producto */}
            <BottomSheet open={!!editandoBar} onClose={() => setEditandoBar(null)}>
              {editandoBar && (
                <div className="px-5 py-5 space-y-4">
                  <h2 className="text-xl font-bold text-display">{editandoBar.id ? 'Editar producto' : 'Nuevo producto'}</h2>
                  <Input label="Nombre *" value={editandoBar.nombre} onChange={e => setEditandoBar({ ...editandoBar, nombre: e.target.value })} placeholder="Cubata Beefeater" maxLength={80} />
                  <div>
                    <label className="block text-sm font-medium text-[#B8B8CC] mb-1.5">Descripción</label>
                    <textarea value={editandoBar.descripcion} onChange={e => setEditandoBar({ ...editandoBar, descripcion: e.target.value.slice(0, 240) })} placeholder="Ginebra premium con tónica…" rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#8B8BA8] focus:border-white/25 outline-none resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#B8B8CC] mb-1.5">Categoría</label>
                      <select value={editandoBar.categoria} onChange={e => setEditandoBar({ ...editandoBar, categoria: e.target.value as CategoriaProducto })} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl text-white px-3 text-sm outline-none">
                        {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <Input label="Precio (€) *" inputMode="decimal" value={editandoBar.precio} onChange={e => setEditandoBar({ ...editandoBar, precio: e.target.value })} placeholder="8.50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <Input label="Coste (€)" inputMode="decimal" value={editandoBar.coste} onChange={e => setEditandoBar({ ...editandoBar, coste: e.target.value })} placeholder="2.00" />
                    <MargenHint precio={editandoBar.precio} coste={editandoBar.coste} />
                  </div>
                  <ToggleSimple label="Es pack" hint="Múltiples unidades en un pedido" value={editandoBar.es_pack} onChange={v => setEditandoBar({ ...editandoBar, es_pack: v })} />
                  {editandoBar.es_pack && <Input label="Unidades del pack" inputMode="numeric" value={editandoBar.unidades_pack} onChange={e => setEditandoBar({ ...editandoBar, unidades_pack: e.target.value })} placeholder="5" />}
                  <ToggleSimple label="Disponible ahora" hint="Desactiva temporalmente sin borrar" value={editandoBar.disponible} onChange={v => setEditandoBar({ ...editandoBar, disponible: v })} />
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditandoBar(null)}>Cancelar</Button>
                    <Button fullWidth onClick={guardarBar} loading={guardandoBar}>{editandoBar.id ? 'Guardar' : 'Crear'}</Button>
                  </div>
                </div>
              )}
            </BottomSheet>
          </div>
        )}

        {/* ── TAB: Instagram ── */}
        {tab === 'instagram' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E94560]/10 border border-[#E94560]/20 flex items-center justify-center">
                  <AtSign size={18} className="text-[#E94560]" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-sm">Cuenta de Instagram</h2>
                  <p className="text-xs text-[#8B8BA8] mt-0.5">Se mostrará en tu ficha del local</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#A0A0B8]">Cuenta de Instagram</label>
                <div className="flex items-center gap-0">
                  <span className="px-3 py-3 bg-white/4 border border-r-0 border-white/8 rounded-l-xl text-[#8B8BA8] text-sm">@</span>
                  <input
                    type="text"
                    value={form.instagram_handle || ''}
                    onChange={e => setForm(f => ({ ...f, instagram_handle: e.target.value.replace('@', '').trim() }))}
                    placeholder="tunombredeig"
                    className="flex-1 px-4 py-3 bg-white/4 border border-white/8 rounded-r-xl text-white text-sm outline-none focus:border-white/20 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MargenHint({ precio, coste }: { precio: string; coste: string }) {
  const p = parseFloat(precio.replace(',', '.'))
  const c = parseFloat(coste.replace(',', '.'))
  if (Number.isNaN(p) || Number.isNaN(c) || !coste.trim()) {
    return (
      <div className="h-11 flex items-center px-1">
        <p className="text-xs text-[#6B6B85]">Añade el coste para ver tu beneficio</p>
      </div>
    )
  }
  const margen = p - c
  const pct = p > 0 ? Math.round((margen / p) * 100) : 0
  const color = margen >= 0 ? '#27AE60' : '#E94560'
  return (
    <div className="h-11 flex flex-col justify-center px-1">
      <p className="text-[11px] text-[#8B8BA8]">Beneficio / unidad</p>
      <p className="text-sm font-bold text-numeric" style={{ color }}>
        {formatearPrecio(margen)} <span className="text-xs font-medium">· {pct}%</span>
      </p>
    </div>
  )
}

function ToggleSimple({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white/4 border border-white/8 rounded-xl">
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        {hint && <p className="text-xs text-[#B8B8CC] mt-0.5">{hint}</p>}
      </div>
      <button onClick={() => onChange(!value)} className={cn('w-11 h-6 rounded-full transition-colors relative shrink-0', value ? 'bg-[#E94560]' : 'bg-white/15')}>
        <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', value ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  )
}
