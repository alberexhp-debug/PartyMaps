'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Sparkles, Plus, Trash2, Eye, EyeOff, Pencil, Check, X } from 'lucide-react'
import { cn, EMOJI_SIGNO } from '@/lib/utils'
import type { SignoZodiaco } from '@/types'

const SIGNOS: SignoZodiaco[] = [
  'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis',
]

interface Frase {
  id: string
  signo: SignoZodiaco
  frase: string
  activa: boolean
  created_at: string
}

export default function AdminFrasesZodiacoPage() {
  const toast = useToast()
  const [frases, setFrases] = useState<Frase[]>([])
  const [loading, setLoading] = useState(true)
  const [signoSel, setSignoSel] = useState<SignoZodiaco>('Aries')
  const [nuevaFrase, setNuevaFrase] = useState('')
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [valorEdit, setValorEdit] = useState('')

  const cargar = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/frases-zodiaco?signo=${encodeURIComponent(signoSel)}`)
    const json = await res.json()
    if (res.ok) setFrases(json.frases)
    setLoading(false)
  }
  useEffect(() => { cargar() /* eslint-disable-next-line */ }, [signoSel])

  const crear = async () => {
    const f = nuevaFrase.trim()
    if (f.length < 5) { toast.error('Mínimo 5 caracteres'); return }
    setCreando(true)
    const res = await fetch('/api/admin/frases-zodiaco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signo: signoSel, frase: f }),
    })
    if (res.ok) {
      const json = await res.json()
      setFrases(prev => [json.frase, ...prev])
      setNuevaFrase('')
      toast.success('Frase añadida')
    } else {
      const json = await res.json()
      toast.error(json.error || 'Error al crear')
    }
    setCreando(false)
  }

  const toggleActiva = async (f: Frase) => {
    const res = await fetch('/api/admin/frases-zodiaco', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: f.id, activa: !f.activa }),
    })
    if (res.ok) {
      const json = await res.json()
      setFrases(prev => prev.map(x => x.id === f.id ? json.frase : x))
    } else toast.error('No se pudo actualizar')
  }

  const guardarEdit = async (f: Frase) => {
    const v = valorEdit.trim()
    if (v === f.frase) { setEditandoId(null); return }
    const res = await fetch('/api/admin/frases-zodiaco', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: f.id, frase: v }),
    })
    if (res.ok) {
      const json = await res.json()
      setFrases(prev => prev.map(x => x.id === f.id ? json.frase : x))
      setEditandoId(null)
      toast.success('Frase actualizada')
    } else {
      const json = await res.json()
      toast.error(json.error || 'Error')
    }
  }

  const eliminar = async (f: Frase) => {
    if (!confirm(`¿Eliminar la frase "${f.frase.slice(0, 40)}..."?`)) return
    const res = await fetch(`/api/admin/frases-zodiaco?id=${f.id}`, { method: 'DELETE' })
    if (res.ok) {
      setFrases(prev => prev.filter(x => x.id !== f.id))
      toast.success('Frase eliminada')
    } else toast.error('Error al eliminar')
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-20 md:pb-8">
      <div>
        <p className="text-[10px] font-bold text-[#7C5CFF] uppercase tracking-[0.25em] mb-1">Banco de frases</p>
        <h1 className="text-3xl font-bold text-white text-display tracking-tight">Frases del zodiaco</h1>
        <p className="text-[#A0A0B8] text-sm mt-1">Sugerencias que aparecen en la carta de perfil del usuario según su signo.</p>
      </div>

      {/* Selector de signo */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {SIGNOS.map(s => (
          <button
            key={s}
            onClick={() => setSignoSel(s)}
            className={cn(
              'shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
              signoSel === s
                ? 'bg-[#7C5CFF] text-white shadow-[0_6px_18px_-4px_rgba(124,92,255,0.55)]'
                : 'glass text-[#A0A0B8] hover:text-white'
            )}
          >
            <span className="text-base">{EMOJI_SIGNO[s]}</span> {s}
          </button>
        ))}
      </div>

      {/* Crear nueva */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#7C5CFF]" />
          <h2 className="text-sm font-semibold text-white">Añadir frase para {EMOJI_SIGNO[signoSel]} {signoSel}</h2>
        </div>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Hoy brillas más que nunca…"
            value={nuevaFrase}
            onChange={e => setNuevaFrase(e.target.value.slice(0, 200))}
            onKeyDown={e => { if (e.key === 'Enter') crear() }}
          />
          <Button onClick={crear} loading={creando} disabled={nuevaFrase.trim().length < 5}>
            <Plus size={16} /> Añadir
          </Button>
        </div>
        <p className="text-xs text-[#6B6B85]">Entre 5 y 200 caracteres. Aparecerá como sugerencia en la carta del usuario.</p>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 glass-subtle rounded-xl animate-pulse" />)
        ) : frases.length === 0 ? (
          <div className="text-center py-12 text-[#A0A0B8] text-sm">
            Sin frases para {signoSel} todavía. Añade la primera arriba.
          </div>
        ) : (
          frases.map(f => (
            <div key={f.id} className={cn('glass rounded-xl p-3.5 flex items-start gap-3 transition-opacity', !f.activa && 'opacity-60')}>
              <span className="text-xl mt-0.5">{EMOJI_SIGNO[f.signo]}</span>
              {editandoId === f.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    value={valorEdit}
                    onChange={e => setValorEdit(e.target.value.slice(0, 200))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[#7C5CFF]/60"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') guardarEdit(f); if (e.key === 'Escape') setEditandoId(null) }}
                  />
                  <button onClick={() => guardarEdit(f)} className="p-1.5 rounded-lg bg-[#27AE60]/15 text-[#27AE60] hover:bg-[#27AE60]/25">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditandoId(null)} className="p-1.5 rounded-lg bg-white/5 text-[#A0A0B8] hover:bg-white/10">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-sm text-white italic leading-snug">&ldquo;{f.frase}&rdquo;</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActiva(f)}
                      title={f.activa ? 'Desactivar' : 'Activar'}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        f.activa ? 'text-[#27AE60] hover:bg-[#27AE60]/12' : 'text-[#6B6B85] hover:bg-white/8'
                      )}
                    >
                      {f.activa ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      onClick={() => { setEditandoId(f.id); setValorEdit(f.frase) }}
                      className="p-1.5 rounded-lg text-[#A0A0B8] hover:text-white hover:bg-white/8 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => eliminar(f)}
                      className="p-1.5 rounded-lg text-[#E94560] hover:bg-[#E94560]/12 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
