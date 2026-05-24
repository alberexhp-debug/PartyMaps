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
import {
  ChevronLeft, Share2, Download, Copy, Sparkles, Save, Eye, EyeOff, RefreshCcw,
} from 'lucide-react'

const ESTILOS: { id: EstiloCarta; nombre: string; muestra: string }[] = [
  { id: 'holo',   nombre: 'Holográfica', muestra: 'linear-gradient(135deg,#E94560,#7C5CFF,#4F8EF7)' },
  { id: 'aurora', nombre: 'Aurora',      muestra: 'linear-gradient(135deg,#0E2A47,#4FB2A0,#7C5CFF)' },
  { id: 'oro',    nombre: 'Oro',         muestra: 'linear-gradient(135deg,#5A3A0E,#D4A84B,#FBE08F)' },
  { id: 'noche',  nombre: 'Noche',       muestra: 'linear-gradient(180deg,#0A0A14,#1A1A30)' },
  { id: 'rosa',   nombre: 'Rosa neón',   muestra: 'linear-gradient(135deg,#6B0E33,#E94560,#FF8FA8)' },
]

export default function EditorCartaPage() {
  const router = useRouter()
  const toast = useToast()
  const { usuario, setUsuario } = useAuthStore()
  const cartaRef = useRef<HTMLDivElement>(null)

  const [estilo, setEstilo] = useState<EstiloCarta>(usuario?.carta_estilo ?? 'holo')
  const [frase, setFrase] = useState(usuario?.carta_frase ?? '')
  const [apodo, setApodo] = useState(usuario?.carta_apodo ?? '')
  const [publica, setPublica] = useState(usuario?.carta_publica ?? true)
  const [guardando, setGuardando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [stats, setStats] = useState<{ entradas: number; planes: number; suscritos: number }>({
    entradas: 0, planes: 0, suscritos: 0,
  })

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

  const signo = useMemo(() => calcularSignoZodiaco(usuario?.fecha_nacimiento || new Date().toISOString()), [usuario?.fecha_nacimiento])
  const edad  = useMemo(() => calcularEdad(usuario?.fecha_nacimiento || new Date().toISOString()), [usuario?.fecha_nacimiento])

  // Sugerencias del banco admin (frases_zodiaco). Si no hay nada en BD, fallback a constantes.
  const [sugerenciasFrase, setSugerenciasFrase] = useState<string[]>(() => (FRASES_ZODIACO[signo] || []).slice(0, 5))
  useEffect(() => {
    supabase
      .from('frases_zodiaco')
      .select('frase')
      .eq('signo', signo)
      .eq('activa', true)
      .limit(8)
      .then(({ data }) => {
        const bd = (data ?? []).map(r => r.frase as string)
        const fallback = FRASES_ZODIACO[signo] || []
        const todas = bd.length > 0 ? bd : fallback
        setSugerenciasFrase(todas.slice(0, 5))
      })
  }, [signo])

  const sugerirAleatoria = () => {
    if (sugerenciasFrase.length > 0) {
      setFrase(sugerenciasFrase[Math.floor(Math.random() * sugerenciasFrase.length)])
    } else {
      setFrase(getFraseZodiaco(signo, Math.random().toString()))
    }
  }

  if (!usuario) return null

  const guardar = async () => {
    setGuardando(true)
    try {
      const res = await fetch('/api/perfil/carta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frase: frase || null, estilo, publica, apodo: apodo || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar')
      setUsuario({
        ...usuario,
        carta_frase: frase || undefined,
        carta_estilo: estilo,
        carta_publica: publica,
        carta_apodo: apodo || undefined,
        carta_slug: json.carta?.carta_slug ?? usuario.carta_slug,
      })
      toast.success('Carta guardada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const exportarPNG = async (modo: 'share' | 'download') => {
    if (!cartaRef.current) return
    setExportando(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cartaRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob(b => resolve(b!), 'image/png', 0.95)
      )
      const file = new File([blob], `partymaps-${usuario.carta_slug ?? 'carta'}.png`, { type: 'image/png' })

      if (modo === 'share' && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Mi carta PartyMaps`,
          text: `${apodo || usuario.nombre} en PartyMaps`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success('Imagen descargada')
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo generar la imagen')
    } finally {
      setExportando(false)
    }
  }

  const copiarLink = async () => {
    if (!usuario.carta_slug) { toast.error('Guarda la carta primero'); return }
    const url = `${window.location.origin}/c/${usuario.carta_slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-white/8 px-4 py-3 safe-top flex items-center gap-3">
        <button aria-label="Volver" onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-display">Mi carta</h1>
          <p className="text-xs text-[#A0A0B8]">Personaliza y compártela</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Preview */}
        <div className="flex justify-center">
          <div className="w-full max-w-[320px]">
            <CartaPerfil
              ref={cartaRef}
              nombre={usuario.nombre}
              apodo={apodo}
              edad={edad}
              signo={signo}
              foto={usuario.foto_perfil_url}
              frase={frase}
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
          <Button variant="glass" onClick={() => exportarPNG('share')} loading={exportando}>
            <Share2 size={16} /> Compartir
          </Button>
          <Button variant="glass" onClick={() => exportarPNG('download')} disabled={exportando}>
            <Download size={16} /> PNG
          </Button>
          <Button variant="glass" onClick={copiarLink}>
            <Copy size={16} /> Link
          </Button>
        </div>

        {/* Estilo */}
        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Estilo</h2>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {ESTILOS.map(e => (
              <button
                key={e.id}
                onClick={() => setEstilo(e.id)}
                className={cn(
                  'shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all',
                  estilo === e.id ? 'border-[#E94560] glow-accent' : 'border-white/8 hover:border-white/20',
                )}
              >
                <div className="w-14 h-20 rounded-xl" style={{ background: e.muestra }} />
                <span className={cn('text-xs font-medium', estilo === e.id ? 'text-white' : 'text-[#A0A0B8]')}>{e.nombre}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Apodo */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Apodo</h2>
          <Input
            value={apodo}
            onChange={e => setApodo(e.target.value)}
            placeholder={usuario.nombre}
            maxLength={30}
            hint="Aparece en lugar de tu nombre en la carta. Déjalo vacío para usar tu nombre."
          />
        </section>

        {/* Frase */}
        <section className="space-y-2.5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Tu frase</h2>
              <p className="text-xs text-[#6B6B85] mt-0.5">Hasta 140 caracteres</p>
            </div>
            <button
              onClick={sugerirAleatoria}
              className="flex items-center gap-1 text-xs text-[#E94560] font-semibold"
            >
              <RefreshCcw size={12} /> Sugerencia
            </button>
          </div>
          <textarea
            value={frase}
            onChange={e => setFrase(e.target.value.slice(0, 140))}
            placeholder={`${signo}, brilla esta noche.`}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-[#6B6B85] focus:border-[#E94560]/60 focus:bg-white/8 focus:ring-2 focus:ring-[#E94560]/20 outline-none transition-all resize-none"
          />
          <div className="flex justify-between text-xs">
            <span className="text-[#6B6B85]">{frase.length}/140</span>
          </div>
          {sugerenciasFrase.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sugerenciasFrase.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setFrase(s)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-[#A0A0B8] hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Sparkles size={10} /> {s.length > 32 ? s.slice(0, 32) + '…' : s}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Visibilidad */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Visibilidad</h2>
          <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {publica
                ? <Eye size={18} className="text-[#4F8EF7]" />
                : <EyeOff size={18} className="text-[#6B6B85]" />}
              <div>
                <p className="text-sm font-semibold text-white">
                  {publica ? 'Carta pública' : 'Carta privada'}
                </p>
                <p className="text-xs text-[#A0A0B8]">
                  {publica ? 'Cualquiera con el link puede verla' : 'Solo tú la ves al compartir'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPublica(!publica)}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                publica ? 'bg-[#E94560]' : 'bg-white/12'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all',
                publica ? 'left-[22px]' : 'left-0.5'
              )} />
            </button>
          </div>
        </section>
      </div>

      {/* Sticky guardar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080F] via-[#08080F]/95 to-transparent pointer-events-none h-32 -top-24" />
        <div className="relative glass-strong border-t border-white/8 px-4 py-3">
          <Button fullWidth size="lg" onClick={guardar} loading={guardando}>
            <Save size={18} /> Guardar carta
          </Button>
        </div>
      </div>
    </div>
  )
}
