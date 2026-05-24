'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import {
  calcularSignoZodiaco, calcularEdad, getFraseZodiaco,
  EMOJI_SIGNO, formatearFecha
} from '@/lib/utils'
import { ArrowLeft, Share2, Download, Sparkles } from 'lucide-react'
import { Local } from '@/types'

export default function PerfilNochePage() {
  const { localId } = useParams<{ localId: string }>()
  const router = useRouter()
  const { usuario } = useAuthStore()
  const toast = useToast()
  const cartaRef = useRef<HTMLDivElement>(null)

  const [local, setLocal] = useState<Local | null>(null)
  const [checkinValido, setCheckinValido] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)

  const cargar = useCallback(async () => {
    if (!usuario) { router.push('/login'); return }

    const [{ data: localData }, { data: checkin }] = await Promise.all([
      supabase.from('locales').select('*').eq('id', localId).single(),
      supabase.from('checkins').select('id').match({
        usuario_id: usuario.id, local_id: localId,
      }).is('salida_at', null).maybeSingle(),
    ])

    if (!localData) { toast.error('Local no encontrado'); router.push('/explorar'); return }
    if (!localData.modulos_activos?.includes('perfil_noche')) {
      toast.info('Este local no tiene perfil de noche activo')
      router.push(`/local/${localId}`); return
    }

    setLocal(localData)
    setCheckinValido(!!checkin)
    setLoading(false)
  }, [usuario, localId, router, toast])

  useEffect(() => { cargar() }, [cargar])

  const compartir = async () => {
    if (!cartaRef.current) return
    setGenerando(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cartaRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
      })
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('No se pudo generar la imagen')

      const file = new File([blob], 'perfil-noche.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mi noche en PartyMaps',
          text: `Estoy en ${local?.nombre} esta noche.`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `partymaps-${local?.nombre}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Imagen descargada')
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo compartir la carta')
    } finally {
      setGenerando(false)
    }
  }

  if (loading || !usuario || !local) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (checkinValido === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <Sparkles size={48} className="text-[#6B6B85]" />
        <h2 className="text-xl font-bold text-white text-center">Necesitas estar en {local.nombre}</h2>
        <p className="text-[#A0A0B8] text-center text-sm">
          Haz check-in desde el perfil del local para generar tu carta de noche.
        </p>
        <Button onClick={() => router.push(`/local/${localId}`)}>Ir al local</Button>
      </div>
    )
  }

  const signo = calcularSignoZodiaco(usuario.fecha_nacimiento)
  const edad = calcularEdad(usuario.fecha_nacimiento)
  const frase = getFraseZodiaco(signo, new Date().toISOString())
  const emoji = EMOJI_SIGNO[signo]
  const fechaTexto = formatearFecha(new Date().toISOString())

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-3 flex items-center gap-3 safe-top">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#A0A0B8]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Tu perfil de noche</h1>
          <p className="text-xs text-[#6B6B85]">{local.nombre}</p>
        </div>
      </div>

      <div className="px-6 pt-2">
        {/* Carta */}
        <div
          ref={cartaRef}
          className="relative w-full max-w-sm mx-auto aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: `linear-gradient(160deg, #1A1A2E 0%, #0D0D1A 50%, #E94560 200%)`,
          }}
        >
          {/* Glow */}
          <div
            className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-30 blur-3xl"
            style={{ background: '#E94560' }}
          />
          <div
            className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{ background: '#4F8EF7' }}
          />

          {/* Contenido */}
          <div className="relative h-full flex flex-col p-6 text-white">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/60">Esta noche</p>
                <p className="text-sm font-semibold mt-0.5">{local.nombre}</p>
              </div>
              <span className="text-[11px] text-white/50">{fechaTexto}</span>
            </div>

            {/* Centro */}
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <span className="text-6xl">{emoji}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/60">{signo}</p>
                <h2 className="text-4xl font-bold mt-1 leading-tight">{usuario.nombre}</h2>
                <p className="text-xs text-white/60 mt-1">{edad} años</p>
              </div>
              <p className="text-lg font-medium mt-3 px-2 italic">&ldquo;{frase}&rdquo;</p>
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40">Live in</p>
                <p className="text-xs text-white/80 font-semibold">{local.ciudad}</p>
              </div>
              <p className="text-[10px] text-white/40">partymaps.com</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 space-y-3 max-w-sm mx-auto">
          <Button fullWidth onClick={compartir} loading={generando}>
            <Share2 size={16} />
            Compartir mi carta
          </Button>
          <Button variant="ghost" fullWidth onClick={compartir}>
            <Download size={16} />
            Guardar imagen
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B6B85] max-w-sm mx-auto">
          La carta se genera automáticamente con los datos de tu perfil. Solo es visible para ti mientras estás en el local.
        </p>
      </div>
    </div>
  )
}
