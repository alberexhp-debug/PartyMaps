'use client'
import { useMemo } from 'react'
import { Plus, Trash2, Zap } from 'lucide-react'
import { PrecioDinamicoConfig, TramoPrecio } from '@/types'
import { calcularPrecioDinamico, formatearPrecio } from '@/lib/utils'

interface Props {
  value: PrecioDinamicoConfig | null | undefined
  onChange: (v: PrecioDinamicoConfig) => void
  precioMin: number
  precioMax: number | null | undefined
  ayuda?: string
}

const VALOR_DEFECTO: PrecioDinamicoConfig = { activo: false, curva: 'lineal', tramos: [] }

export function PrecioDinamicoEditor({ value, onChange, precioMin, precioMax, ayuda }: Props) {
  const config = value ?? VALOR_DEFECTO

  // Previsualización del precio en distintos % de ventas
  const preview = useMemo(() => {
    return [0, 25, 50, 75, 100].map(pct => ({
      pct,
      ...calcularPrecioDinamico(precioMin, precioMax, config, pct),
    }))
  }, [config, precioMin, precioMax])

  function update(patch: Partial<PrecioDinamicoConfig>) {
    onChange({ ...config, ...patch })
  }

  function setTramo(idx: number, patch: Partial<TramoPrecio>) {
    const tramos = [...(config.tramos ?? [])]
    tramos[idx] = { ...tramos[idx], ...patch }
    update({ tramos })
  }

  function addTramo() {
    const tramos = [...(config.tramos ?? [])]
    const ultimoPct = tramos.length > 0 ? tramos[tramos.length - 1].pct : 0
    tramos.push({ pct: Math.min(100, ultimoPct + 20), precio: precioMax ?? precioMin })
    update({ tramos })
  }

  function removeTramo(idx: number) {
    const tramos = (config.tramos ?? []).filter((_, i) => i !== idx)
    update({ tramos })
  }

  return (
    <div className="space-y-3 glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white flex items-center gap-2">
            <Zap size={14} className="text-[#E94560]" /> Precio dinámico
          </p>
          {ayuda && <p className="text-xs text-[#6B6B85] mt-1">{ayuda}</p>}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.activo}
            onChange={e => update({ activo: e.target.checked })}
            className="w-4 h-4 accent-[#E94560]"
          />
          <span className="text-sm text-white">Activo</span>
        </label>
      </div>

      {config.activo && (
        <>
          <div className="space-y-1.5">
            <label className="text-xs text-[#6B6B85]">Tipo de curva</label>
            <div className="grid grid-cols-2 gap-2">
              {(['lineal', 'tramos'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update({ curva: c })}
                  className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
                    config.curva === c
                      ? 'bg-[#E94560] border-[#E94560] text-white'
                      : 'border-white/10 text-[#A0A0B8] hover:border-[#505065]'
                  }`}
                >
                  {c === 'lineal' ? 'Lineal' : 'Por tramos'}
                </button>
              ))}
            </div>
          </div>

          {config.curva === 'lineal' && (
            <p className="text-xs text-[#A0A0B8] leading-relaxed">
              Sube de forma continua entre el precio mínimo ({formatearPrecio(precioMin)}) y el máximo
              ({precioMax ? formatearPrecio(precioMax) : '—'}) según el % de aforo vendido.
            </p>
          )}

          {config.curva === 'tramos' && (
            <div className="space-y-2">
              <p className="text-xs text-[#A0A0B8]">
                Define escalones: a partir de cada % vendido, el precio salta al valor indicado.
              </p>
              {(config.tramos ?? []).map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1.5">
                    <span className="text-xs text-[#6B6B85]">Desde</span>
                    <input
                      type="number" min={0} max={100}
                      value={t.pct}
                      onChange={e => setTramo(i, { pct: parseInt(e.target.value) || 0 })}
                      className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none"
                    />
                    <span className="text-xs text-[#6B6B85]">%</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1.5">
                    <span className="text-xs text-[#6B6B85]">Precio</span>
                    <input
                      type="number" min={0} step="0.5"
                      value={t.precio}
                      onChange={e => setTramo(i, { precio: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none"
                    />
                    <span className="text-xs text-[#6B6B85]">€</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTramo(i)}
                    className="p-1.5 text-[#E94560] hover:bg-[#E94560]/10 rounded-lg"
                    aria-label="Eliminar tramo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTramo}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-white/10 rounded-xl text-xs text-[#A0A0B8] hover:border-[#505065]"
              >
                <Plus size={12} /> Añadir tramo
              </button>
            </div>
          )}

          {/* Previsualización */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-[#6B6B85] mb-2">Vista previa según ventas:</p>
            <div className="grid grid-cols-5 gap-1.5">
              {preview.map(p => (
                <div key={p.pct} className="text-center bg-white/5 rounded-lg p-2">
                  <p className="text-[10px] text-[#6B6B85]">{p.pct}%</p>
                  <p className="text-xs font-bold text-white">{formatearPrecio(p.precio)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
