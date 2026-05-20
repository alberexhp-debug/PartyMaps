'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Sugerencia } from '@/types'
import { tiempoRelativo } from '@/lib/utils'
import { MessageSquare, CheckCircle2, Clock, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

type SugerenciaConUsuario = Sugerencia & { usuarios?: { nombre: string } }

const FILTROS = ['todas', 'nueva', 'leida', 'respondida'] as const
type Filtro = typeof FILTROS[number]

export default function SugerenciasPage() {
  const { local } = useLocalPanelStore()
  const toast = useToast()
  const [sugerencias, setSugerencias] = useState<SugerenciaConUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [expandida, setExpandida] = useState<string | null>(null)
  const [notas, setNotas] = useState<Record<string, string>>({})

  useEffect(() => { if (local) cargar() }, [local])

  async function cargar() {
    const { data } = await supabase
      .from('sugerencias')
      .select('*, usuarios(nombre)')
      .eq('local_id', local!.id)
      .order('created_at', { ascending: false })
    if (data) setSugerencias(data)
    setLoading(false)
  }

  async function marcarLeida(id: string) {
    await supabase.from('sugerencias').update({ estado: 'leida' }).eq('id', id)
    setSugerencias(s => s.map(sg => sg.id === id ? { ...sg, estado: 'leida' } : sg))
  }

  async function guardarNota(id: string) {
    const nota = notas[id]?.trim()
    if (!nota) return
    await supabase.from('sugerencias').update({ estado: 'respondida', nota_interna: nota }).eq('id', id)
    setSugerencias(s => s.map(sg => sg.id === id ? { ...sg, estado: 'respondida', nota_interna: nota } : sg))
    toast.success('Nota guardada')
    setExpandida(null)
  }

  const filtradas = sugerencias.filter(s => filtro === 'todas' || s.estado === filtro)
  const counts = {
    nueva: sugerencias.filter(s => s.estado === 'nueva').length,
    leida: sugerencias.filter(s => s.estado === 'leida').length,
    respondida: sugerencias.filter(s => s.estado === 'respondida').length,
  }

  if (!local) return null

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-black text-white">Sugerencias</h1>
        <p className="text-[#505065] text-sm">Opiniones y sugerencias de tus clientes</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {(['nueva', 'leida', 'respondida'] as const).map(e => (
          <div key={e} className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-3 text-center">
            <p className="text-2xl font-black text-white">{counts[e]}</p>
            <p className="text-xs text-[#505065] capitalize">{e === 'nueva' ? 'Nuevas' : e === 'leida' ? 'Leídas' : 'Respondidas'}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filtro === f ? 'bg-[#E94560] text-white' : 'bg-[#1A1A2E] text-[#A0A0B8] border border-[#2A2A3E]'
            )}
          >
            {f === 'todas' ? 'Todas' : f === 'nueva' ? `Nuevas (${counts.nueva})` : f === 'leida' ? 'Leídas' : 'Respondidas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-[#1A1A2E] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <MessageSquare size={36} className="text-[#505065]" />
          <p className="text-[#505065] text-sm">No hay sugerencias {filtro !== 'todas' ? `en estado "${filtro}"` : 'todavía'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(s => (
            <div key={s.id} className={cn(
              'bg-[#1A1A2E] rounded-2xl border p-4 space-y-3 transition-all',
              s.estado === 'nueva' ? 'border-[#E94560]/30' : 'border-[#2A2A3E]'
            )}>
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 shrink-0', s.estado === 'nueva' ? 'text-[#E94560]' : s.estado === 'respondida' ? 'text-green-400' : 'text-[#505065]')}>
                  {s.estado === 'respondida' ? <CheckCircle2 size={16} /> : s.estado === 'nueva' ? <MessageSquare size={16} /> : <Eye size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{s.usuarios?.nombre || 'Usuario anónimo'}</p>
                    <span className="text-xs text-[#505065]">{tiempoRelativo(s.created_at)}</span>
                    {s.estado === 'nueva' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#E94560]/10 border border-[#E94560]/30 rounded-full text-[#E94560] font-semibold">Nueva</span>
                    )}
                  </div>
                  <p className="text-sm text-[#A0A0B8]">{s.contenido}</p>
                  {s.nota_interna && (
                    <div className="mt-2 p-2 bg-[#0D0D1A] rounded-lg border-l-2 border-green-400">
                      <p className="text-xs text-green-400 font-medium mb-0.5">Nota interna</p>
                      <p className="text-xs text-[#A0A0B8]">{s.nota_interna}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {s.estado === 'nueva' && (
                  <button onClick={() => marcarLeida(s.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#0D0D1A] border border-[#2A2A3E] rounded-lg text-xs text-[#A0A0B8] hover:text-white transition-colors">
                    <Eye size={12} /> Marcar como leída
                  </button>
                )}
                <button
                  onClick={() => setExpandida(expandida === s.id ? null : s.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#0D0D1A] border border-[#2A2A3E] rounded-lg text-xs text-[#A0A0B8] hover:text-white transition-colors"
                >
                  <Clock size={12} /> {s.nota_interna ? 'Editar nota' : 'Añadir nota interna'}
                </button>
              </div>

              {expandida === s.id && (
                <div className="space-y-2">
                  <textarea
                    value={notas[s.id] ?? s.nota_interna ?? ''}
                    onChange={e => setNotas(n => ({ ...n, [s.id]: e.target.value }))}
                    placeholder="Nota interna (solo la ve el equipo)..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#505065]"
                  />
                  <Button size="sm" onClick={() => guardarNota(s.id)}>
                    Guardar nota
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
