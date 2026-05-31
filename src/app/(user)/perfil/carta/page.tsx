'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { CartaPerfil } from '@/components/user/CartaPerfil'
import type { EstiloCarta } from '@/types'
import {
  calcularSignoZodiaco, calcularEdad, getFraseZodiaco, FRASES_ZODIACO, cn,
} from '@/lib/utils'
import { ChevronLeft, Share2, Download, Copy, Sparkles, Save, Eye, EyeOff, RefreshCcw, Zap } from 'lucide-react'

// Estilos de carta
const ESTILOS: { id: EstiloCarta; nombre: string; muestra: string }[] = [
  { id: 'holo',   nombre: 'Holográfica', muestra: 'linear-gradient(135deg,#E94560,#7C5CFF,#4F8EF7)' },
  { id: 'aurora', nombre: 'Aurora',      muestra: 'linear-gradient(135deg,#0E2A47,#4FB2A0,#7C5CFF)' },
  { id: 'oro',    nombre: 'Oro',         muestra: 'linear-gradient(135deg,#5A3A0E,#D4A84B,#FBE08F)' },
  { id: 'noche',  nombre: 'Noche',       muestra: 'linear-gradient(180deg,#0A0A14,#1A1A30)' },
  { id: 'rosa',   nombre: 'Rosa neón',   muestra: 'linear-gradient(135deg,#6B0E33,#E94560,#FF8FA8)' },
]

// Clases nocturnas — el usuario puede elegir una
const CLASES_NOCTURNAS = [
  { id: 'raver',       nombre: 'Raver Cósmico',     icon: '🌌', descripcion: 'Existe entre beats. No duerme, trasciende.' },
  { id: 'cazador',     nombre: 'Cazador de Barras',  icon: '🍸', descripcion: 'Conoce cada cóctel de memoria. Peligroso.' },
  { id: 'sombra',      nombre: 'La Sombra',          icon: '🌑', descripcion: 'Siempre presente, nunca visto en fotos.' },
  { id: 'iniciador',   nombre: 'El Iniciador',       icon: '🎯', descripcion: 'Responsable de cada plan de los últimos 3 años.' },
  { id: 'superviviente', nombre: 'Superviviente',     icon: '💀', descripcion: 'Llegó a las 3. Salió con el sol. Otra vez.' },
  { id: 'leyenda',     nombre: 'Leyenda Urbana',     icon: '⚡', descripcion: 'Solo se le menciona con reverencia.' },
  { id: 'maestro',     nombre: 'Maestro del Setlist', icon: '🎵', descripcion: 'Sabe el nombre del tema antes de que suene.' },
  { id: 'viajero',     nombre: 'Viajero Nocturno',   icon: '🗺️', descripcion: 'Ha pisado más pistas que países. Y no para.' },
]

// Genera atributos deterministas del usuario (sin DB)
function generarAtributos(userId: string, entradas: number, planes: number, suscritos: number) {
  const seed = (str: string) => [...str].reduce((a, c) => a + c.charCodeAt(0), 0)
  const s = seed(userId)
  const PODERES = ['Omnipresencia Nocturna', 'Vista de Predador', 'Resistencia al Cierre', 'Escudo de Amigos', 'Teletransporte Tribal', 'Aura de After']
  const DEBILIDADES = ['Lunes por la mañana', 'Música ambient', 'Discotecas vacías', 'El metro a las 2h', 'El vaso de agua final', 'Los grupos de WhatsApp silenciados']
  const TIPOS_ATAQUE = ['Combo de chupitos', 'Mirada de reconocimiento', 'Invitación estratégica', 'El "¿nos vamos?" a las 6h', 'Propuesta de plan B', 'Bailazo inesperado']
  const ELEMENTOS = ['Bajo', 'Estrobo', 'Neón', 'Humo', 'Láser', 'Eco']

  return {
    nivel: Math.min(99, Math.floor(entradas * 1.5 + planes * 3 + suscritos * 0.5)),
    poder: PODERES[s % PODERES.length],
    debilidad: DEBILIDADES[(s + 7) % DEBILIDADES.length],
    ataque: TIPOS_ATAQUE[(s + 13) % TIPOS_ATAQUE.length],
    elemento: ELEMENTOS[(s + 3) % ELEMENTOS.length],
  }
}

export default function EditorCartaPage() {
  const router = useRouter()
  const toast = useToast()
  const { usuario, setUsuario } = useAuthStore()
  const cartaRef = useRef<HTMLDivElement>(null)

  const [estilo, setEstilo] = useState<EstiloCarta>(usuario?.carta_estilo ?? 'holo')
  const [frase, setFrase] = useState(usuario?.carta_frase ?? '')
  const [apodo, setApodo] = useState(usuario?.carta_apodo ?? '')
  const [publica, setPublica] = useState(usuario?.carta_publica ?? true)
  const [claseId, setClaseId] = useState<string>(
    usuario?.carta_apodo?.startsWith('CLASE:') ? usuario.carta_apodo.slice(6) : ''
  )
  const [guardando, setGuardando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [stats, setStats] = useState({ entradas: 0, planes: 0, suscritos: 0 })
  const [sugerenciasFrase, setSugerenciasFrase] = useState<string[]>([])

  const signo = useMemo(() => calcularSignoZodiaco(usuario?.fecha_nacimiento || new Date().toISOString()), [usuario?.fecha_nacimiento])
  const edad = useMemo(() => calcularEdad(usuario?.fecha_nacimiento || new Date().toISOString()), [usuario?.fecha_nacimiento])

  useEffect(() => {
    if (!usuario) { router.push('/login'); return }
    ;(async () => {
      const [{ count: entradas }, { count: planes }, { count: suscritos }] = await Promise.all([
        supabase.from('entradas').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id),
        supabase.from('participantes_plan').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id),
        supabase.from('suscripciones').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id),
      ])
      setStats({ entradas: entradas ?? 0, planes: planes ?? 0, suscritos: suscritos ?? 0 })
    })()
  }, [usuario, router])

  useEffect(() => {
    supabase.from('frases_zodiaco').select('frase').eq('signo', signo).eq('activa', true).limit(8)
      .then(({ data }) => {
        const bd = (data ?? []).map(r => r.frase as string)
        const fallback = FRASES_ZODIACO[signo] || []
        setSugerenciasFrase((bd.length > 0 ? bd : fallback).slice(0, 5))
      })
  }, [signo])

  const atributos = useMemo(() => {
    if (!usuario) return null
    return generarAtributos(usuario.id, stats.entradas, stats.planes, stats.suscritos)
  }, [usuario, stats])

  const claseSeleccionada = CLASES_NOCTURNAS.find(c => c.id === claseId)
  const apodoFinal = claseId ? `CLASE:${claseId}` : apodo

  const sugerirAleatoria = () => {
    if (sugerenciasFrase.length > 0) setFrase(sugerenciasFrase[Math.floor(Math.random() * sugerenciasFrase.length)])
    else setFrase(getFraseZodiaco(signo, Math.random().toString()))
  }

  if (!usuario) return null

  const guardar = async () => {
    setGuardando(true)
    try {
      const res = await fetch('/api/perfil/carta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frase: frase || null, estilo, publica, apodo: apodoFinal || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error')
      setUsuario({ ...usuario, carta_frase: frase || undefined, carta_estilo: estilo, carta_publica: publica, carta_apodo: apodoFinal || undefined, carta_slug: json.carta?.carta_slug ?? usuario.carta_slug })
      toast.success('Carta guardada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally { setGuardando(false) }
  }

  const exportarPNG = async (modo: 'share' | 'download') => {
    if (!cartaRef.current) return
    setExportando(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cartaRef.current, { backgroundColor: null, scale: 2, useCORS: true, logging: false })
      const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png', 0.95))
      const file = new File([blob], `partymaps-${usuario.carta_slug ?? 'carta'}.png`, { type: 'image/png' })
      if (modo === 'share' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi carta Rumbo', text: `${apodo || usuario.nombre} en Rumbo` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = file.name
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
        toast.success('Imagen descargada')
      }
    } catch { toast.error('No se pudo generar la imagen') }
    finally { setExportando(false) }
  }

  const copiarLink = async () => {
    if (!usuario.carta_slug) { toast.error('Guarda la carta primero'); return }
    try { await navigator.clipboard.writeText(`${window.location.origin}/c/${usuario.carta_slug}`); toast.success('Link copiado') }
    catch { toast.error('No se pudo copiar') }
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0B0B16]/95 backdrop-blur-xl border-b border-white/6 px-4 py-3 safe-top flex items-center gap-3">
        <button aria-label="Volver" onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-display">Mi carta</h1>
          <p className="text-xs text-[#A0A0B8]">Personaliza y comparte</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Preview carta */}
        <div className="flex justify-center">
          <div className="w-full max-w-[300px]">
            <CartaPerfil
              ref={cartaRef}
              nombre={usuario.nombre}
              apodo={claseSeleccionada ? claseSeleccionada.nombre : apodo}
              edad={edad}
              signo={signo}
              foto={usuario.foto_perfil_url}
              frase={claseSeleccionada ? claseSeleccionada.descripcion : frase}
              ciudad="Madrid"
              estilo={estilo}
              slug={usuario.carta_slug}
              reputacion={usuario.reputacion_num_valoraciones > 0
                ? { puntuacion: usuario.reputacion_puntuacion ?? 0, total: usuario.reputacion_num_valoraciones }
                : null}
              stats={[
                { label: 'Entradas', value: stats.entradas, emoji: '🎟️' },
                { label: 'Planes', value: stats.planes, emoji: '✨' },
                { label: 'Sigues', value: stats.suscritos, emoji: '🌙' },
              ]}
            />
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="glass" onClick={() => exportarPNG('share')} loading={exportando}><Share2 size={15} /> Compartir</Button>
          <Button variant="glass" onClick={() => exportarPNG('download')} disabled={exportando}><Download size={15} /> PNG</Button>
          <Button variant="glass" onClick={copiarLink}><Copy size={15} /> Link</Button>
        </div>

        {/* Estilo */}
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold text-[#8B8BA8] uppercase tracking-widest">Estilo de carta</h2>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
            {ESTILOS.map(e => (
              <button key={e.id} onClick={() => setEstilo(e.id)}
                className={cn('shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all',
                  estilo === e.id ? 'border-white/40' : 'border-white/8 hover:border-white/20')}>
                <div className="w-12 h-18 rounded-xl" style={{ background: e.muestra, height: 72 }} />
                <span className={cn('text-[11px] font-medium', estilo === e.id ? 'text-white' : 'text-[#8B8BA8]')}>{e.nombre}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Clase nocturna */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-[#D4A84B]" />
            <h2 className="text-xs font-semibold text-[#8B8BA8] uppercase tracking-widest">Clase nocturna</h2>
          </div>
          <p className="text-xs text-[#6B6B85]">Tu arquetipo de noche. Aparece en la carta en lugar del apodo.</p>
          <div className="grid grid-cols-2 gap-2">
            {CLASES_NOCTURNAS.map(c => (
              <button
                key={c.id}
                onClick={() => setClaseId(claseId === c.id ? '' : c.id)}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all',
                  claseId === c.id
                    ? 'bg-[#D4A84B]/10 border-[#D4A84B]/40'
                    : 'bg-white/3 border-white/6 hover:border-white/12'
                )}
              >
                <span className="text-xl shrink-0">{c.icon}</span>
                <div className="min-w-0">
                  <p className={cn('text-xs font-semibold truncate', claseId === c.id ? 'text-[#D4A84B]' : 'text-white')}>{c.nombre}</p>
                  <p className="text-[11px] text-[#8B8BA8] leading-tight mt-0.5 line-clamp-2">{c.descripcion}</p>
                </div>
              </button>
            ))}
          </div>
          {claseId && (
            <button onClick={() => setClaseId('')} className="text-xs text-[#8B8BA8] hover:text-white">
              Quitar clase → usar apodo personalizado
            </button>
          )}
        </section>

        {/* Atributos generados */}
        {atributos && (
          <section className="space-y-2.5">
            <h2 className="text-xs font-semibold text-[#8B8BA8] uppercase tracking-widest">Atributos</h2>
            <p className="text-xs text-[#6B6B85]">Generados a partir de tu actividad. Únicos e intransferibles.</p>
            <div className="bg-white/3 border border-white/6 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8B8BA8]">Nivel</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full bg-[#E94560] rounded-full" style={{ width: `${atributos.nivel}%` }} />
                  </div>
                  <span className="text-xs font-bold text-white text-numeric">{atributos.nivel}</span>
                </div>
              </div>
              {[
                { label: 'Poder especial', value: atributos.poder, color: '#7C5CFF' },
                { label: 'Tipo de ataque', value: atributos.ataque, color: '#4F8EF7' },
                { label: 'Elemento', value: atributos.elemento, color: '#27AE60' },
                { label: 'Debilidad', value: atributos.debilidad, color: '#E94560' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#8B8BA8] shrink-0">{label}</span>
                  <span className="text-xs font-semibold text-right" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Apodo (solo si no hay clase) */}
        {!claseId && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-[#8B8BA8] uppercase tracking-widest">Apodo</h2>
            <Input value={apodo} onChange={e => setApodo(e.target.value)} placeholder={usuario.nombre} maxLength={30}
              hint="Aparece en lugar de tu nombre. Déjalo vacío para usar tu nombre real." />
          </section>
        )}

        {/* Frase (solo si no hay clase) */}
        {!claseId && (
          <section className="space-y-2.5">
            <div className="flex items-end justify-between">
              <h2 className="text-xs font-semibold text-[#8B8BA8] uppercase tracking-widest">Tu frase</h2>
              <button onClick={sugerirAleatoria} className="flex items-center gap-1 text-xs text-[#E94560] font-semibold">
                <RefreshCcw size={11} /> Sugerir
              </button>
            </div>
            <textarea value={frase} onChange={e => setFrase(e.target.value.slice(0, 140))}
              placeholder={`${signo}, brilla esta noche.`} rows={3}
              className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#6B6B85] focus:border-white/20 outline-none transition-all resize-none" />
            <p className="text-xs text-[#6B6B85]">{frase.length}/140</p>
            {sugerenciasFrase.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sugerenciasFrase.map((s, i) => (
                  <button key={i} onClick={() => setFrase(s)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-[#A0A0B8] hover:text-white transition-colors flex items-center gap-1">
                    <Sparkles size={9} /> {s.length > 30 ? s.slice(0, 30) + '…' : s}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Visibilidad */}
        <section>
          <div className="bg-white/3 border border-white/6 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {publica ? <Eye size={17} className="text-[#4F8EF7]" /> : <EyeOff size={17} className="text-[#6B6B85]" />}
              <div>
                <p className="text-sm font-semibold text-white">{publica ? 'Carta pública' : 'Carta privada'}</p>
                <p className="text-xs text-[#8B8BA8]">{publica ? 'Cualquiera con el link puede verla' : 'Solo tú la ves'}</p>
              </div>
            </div>
            <button onClick={() => setPublica(!publica)}
              className={cn('w-12 h-7 rounded-full transition-colors relative', publica ? 'bg-[#E94560]' : 'bg-white/12')}>
              <span className={cn('absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all', publica ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>
        </section>
      </div>

      {/* Sticky guardar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
        <div className="bg-[#08080F]/95 backdrop-blur-xl border-t border-white/6 px-4 py-3">
          <Button fullWidth size="lg" onClick={guardar} loading={guardando}>
            <Save size={17} /> Guardar carta
          </Button>
        </div>
      </div>
    </div>
  )
}
