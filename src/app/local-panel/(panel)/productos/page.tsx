'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BottomSheet } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { ProductoLocal, CategoriaProducto } from '@/types'
import { formatearPrecio, cn } from '@/lib/utils'
import { Plus, Trash2, Eye, EyeOff, AlertCircle } from '@/components/todh/iconosTorneum'
import { Edit3, ShoppingBag } from 'lucide-react'

const CATEGORIAS: { value: CategoriaProducto; label: string }[] = [
  { value: 'cerveza', label: 'Bebida' }, { value: 'cubata', label: 'Bebida' },
  { value: 'copa', label: 'Bebida' }, { value: 'cocktail', label: 'Bebida' },
  { value: 'chupito', label: 'Bebida' }, { value: 'refresco', label: 'Refresco' },
  { value: 'agua', label: 'Agua' }, { value: 'comida', label: 'Comida' },
  { value: 'snack', label: 'Snack' }, { value: 'pack', label: 'Pack' },
  { value: 'otro', label: 'Otro' },
]

interface Form {
  id?: string
  nombre: string
  descripcion: string
  categoria: CategoriaProducto
  precio: string
  disponible: boolean
  es_pack: boolean
  unidades_pack: string
}

const formVacio: Form = {
  nombre: '', descripcion: '', categoria: 'cubata', precio: '',
  disponible: true, es_pack: false, unidades_pack: '',
}

const LIMITES: Record<string, number> = { basico: 10, pro: 50, destacado: 9999 }

export default function ProductosLocalPage() {
  const { local, trabajador } = useLocalPanelStore()
  const toast = useToast()
  const [productos, setProductos] = useState<ProductoLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Form | null>(null)
  const [guardando, setGuardando] = useState(false)

  const limite = LIMITES[local?.tier ?? 'basico'] ?? 10
  const puedeGestionar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'

  const cargar = async () => {
    setLoading(true)
    const res = await fetch('/api/local-panel/productos')
    if (res.ok) {
      const j = await res.json()
      setProductos(j.productos ?? [])
    }
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!editando) return
    const precio = parseFloat(editando.precio.replace(',', '.'))
    if (!editando.nombre.trim()) { toast.error('Falta el nombre'); return }
    if (Number.isNaN(precio) || precio < 0) { toast.error('Precio inválido'); return }
    setGuardando(true)
    const body: Record<string, unknown> = {
      nombre: editando.nombre.trim(),
      descripcion: editando.descripcion.trim() || null,
      categoria: editando.categoria,
      precio,
      disponible: editando.disponible,
      es_pack: editando.es_pack,
      unidades_pack: editando.es_pack ? parseInt(editando.unidades_pack || '0', 10) || null : null,
    }
    let res: Response
    if (editando.id) {
      res = await fetch('/api/local-panel/productos', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editando.id, ...body }),
      })
    } else {
      res = await fetch('/api/local-panel/productos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    const j = await res.json()
    setGuardando(false)
    if (!res.ok) { toast.error(j.error || 'Error al guardar'); return }
    toast.success(editando.id ? 'Producto actualizado' : 'Producto añadido')
    setEditando(null)
    cargar()
  }

  const eliminar = async (p: ProductoLocal) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    const res = await fetch(`/api/local-panel/productos?id=${p.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); cargar() }
    else { const j = await res.json(); toast.error(j.error || 'Error') }
  }

  const toggleDisponible = async (p: ProductoLocal) => {
    const res = await fetch('/api/local-panel/productos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, disponible: !p.disponible }),
    })
    if (res.ok) cargar()
  }

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Consumibles</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Productos</h1>
          <p className="text-sm text-[#B8B8CC] mt-2">
            <span className="text-numeric font-bold text-white">{productos.length}</span>
            {' / '}
            <span className="text-numeric">{limite === 9999 ? '∞' : limite}</span> productos
            <span className="text-[#8B8BA8]"> · tier {local?.tier}</span>
          </p>
        </div>
        {puedeGestionar && (
          <Button onClick={() => setEditando({ ...formVacio })}>
            <Plus size={16} /> Añadir
          </Button>
        )}
      </div>

      {!puedeGestionar && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F39C12]/10 border border-[#F39C12]/30 text-xs text-[#F39C12]">
          <AlertCircle size={14} /> Solo dueño y gestor pueden editar productos.
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
        </div>
      ) : productos.length === 0 ? (
        <div className="card-premium p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
            <ShoppingBag size={28} className="text-[#B8B8CC]" />
          </div>
          <p className="text-lg font-bold text-display">Tu lista de consumibles está vacía</p>
          <p className="text-sm text-[#B8B8CC] max-w-xs">
            Añade tus consumibles. Los usuarios podrán pedirlos desde la app
            y los canjeas escaneando el QR.
          </p>
          {puedeGestionar && (
            <Button onClick={() => setEditando({ ...formVacio })}>
              <Plus size={16} /> Crear primer producto
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {productos.map(p => (
            <div key={p.id} className={cn('card-premium p-3 flex items-center gap-3', !p.disponible && 'opacity-50')}>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 text-xl">
                {p.categoria === 'cerveza' ? '🥤' :
                 p.categoria === 'cubata' || p.categoria === 'copa' ? '🥤' :
                 p.categoria === 'cocktail' ? '🥤' :
                 p.categoria === 'chupito' ? '🥤' :
                 p.categoria === 'refresco' ? '🥤' :
                 p.categoria === 'agua' ? '💧' :
                 p.categoria === 'comida' ? '🍽️' :
                 p.categoria === 'snack' ? '🥨' :
                 p.categoria === 'pack' ? '🎁' : '✨'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{p.nombre}</p>
                  {p.es_pack && <Badge variant="gold" size="sm">{p.unidades_pack} ud</Badge>}
                </div>
                {p.descripcion && <p className="text-xs text-[#B8B8CC] truncate mt-0.5">{p.descripcion}</p>}
                <p className="text-xs text-[#8B8BA8] mt-0.5 capitalize">{p.categoria}</p>
              </div>
              <p className="text-base font-bold text-white text-numeric shrink-0">{formatearPrecio(p.precio)}</p>
              {puedeGestionar && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleDisponible(p)}
                    aria-label={p.disponible ? 'Ocultar' : 'Mostrar'}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-[#B8B8CC] hover:text-white hover:bg-white/10"
                  >
                    {p.disponible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => setEditando({
                      id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? '',
                      categoria: p.categoria, precio: p.precio.toString(),
                      disponible: p.disponible, es_pack: p.es_pack,
                      unidades_pack: p.unidades_pack?.toString() ?? '',
                    })}
                    aria-label="Editar"
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-[#B8B8CC] hover:text-white hover:bg-white/10"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => eliminar(p)}
                    aria-label="Eliminar"
                    className="w-8 h-8 rounded-lg bg-[#B6FF3A]/10 border border-[#B6FF3A]/30 flex items-center justify-center text-[#B6FF3A] hover:bg-[#B6FF3A]/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      <BottomSheet open={!!editando} onClose={() => setEditando(null)}>
        {editando && (
          <div className="px-5 py-5 space-y-4">
            <h2 className="text-2xl font-bold text-display tracking-tight">
              {editando.id ? 'Editar producto' : 'Nuevo producto'}
            </h2>

            <Input
              label="Nombre *"
              value={editando.nombre}
              onChange={e => setEditando({ ...editando, nombre: e.target.value })}
              placeholder="Agua 50cl"
              maxLength={80}
            />

            <div>
              <label className="block text-sm font-medium text-[#B8B8CC] mb-1.5">Descripción</label>
              <textarea
                value={editando.descripcion}
                onChange={e => setEditando({ ...editando, descripcion: e.target.value.slice(0, 240) })}
                placeholder="Bebida isotónica fría…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#8B8BA8] focus:border-[#B6FF3A]/60 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#B8B8CC] mb-1.5">Categoría</label>
                <select
                  value={editando.categoria}
                  onChange={e => setEditando({ ...editando, categoria: e.target.value as CategoriaProducto })}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl text-white px-3 text-sm outline-none focus:border-[#B6FF3A]/60"
                >
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <Input
                label="Precio (€) *"
                inputMode="decimal"
                value={editando.precio}
                onChange={e => setEditando({ ...editando, precio: e.target.value })}
                placeholder="8.50"
              />
            </div>

            {/* Pack */}
            <div className="space-y-2">
              <ToggleRow
                label="Es un pack"
                hint="Múltiples unidades en un solo pedido (ej: pack 5 aguas)"
                value={editando.es_pack}
                onChange={v => setEditando({ ...editando, es_pack: v })}
              />
              {editando.es_pack && (
                <Input
                  label="Unidades del pack"
                  inputMode="numeric"
                  value={editando.unidades_pack}
                  onChange={e => setEditando({ ...editando, unidades_pack: e.target.value })}
                  placeholder="5"
                />
              )}
            </div>

            <ToggleRow
              label="Disponible ahora"
              hint="Desactiva temporalmente sin borrar el producto"
              value={editando.disponible}
              onChange={v => setEditando({ ...editando, disponible: v })}
            />

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button fullWidth onClick={guardar} loading={guardando}>
                {editando.id ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function ToggleRow({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white/4 border border-white/8 rounded-xl">
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        {hint && <p className="text-xs text-[#B8B8CC] leading-snug mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative shrink-0',
          value ? 'bg-[#B6FF3A]' : 'bg-white/15'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
          value ? 'left-[22px]' : 'left-0.5'
        )} />
      </button>
    </div>
  )
}
