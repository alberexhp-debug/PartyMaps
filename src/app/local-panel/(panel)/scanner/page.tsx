'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { ResultadoEscaneoQR, Entrada } from '@/types'
import { QrCode, CheckCircle2, XCircle, AlertCircle, RefreshCw, Camera, Flashlight } from 'lucide-react'
import jsQR from 'jsqr'
import { cn } from '@/lib/utils'

export default function ScannerPage() {
  const { local } = useLocalPanelStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const animFrameRef = useRef<number>(0)

  const [activo, setActivo] = useState(false)
  const [resultado, setResultado] = useState<ResultadoEscaneoQR | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [modoConsumicion, setModoConsumicion] = useState(false)
  const [historial, setHistorial] = useState<{ qr: string; resultado: ResultadoEscaneoQR; hora: string }[]>([])
  const [torch, setTorch] = useState(false)

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActivo(true)
      scanningRef.current = true
      escanear()
    } catch {
      alert('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const pararCamara = () => {
    scanningRef.current = false
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setActivo(false)
  }

  const escanear = useCallback(() => {
    const tick = () => {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height)

      if (qrCode?.data && !procesando) {
        procesarQR(qrCode.data)
      } else {
        animFrameRef.current = requestAnimationFrame(tick)
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [procesando])

  const procesarQR = async (qrData: string) => {
    if (procesando || !local) return
    setProcesando(true)
    scanningRef.current = false

    const res = await verificarQR(qrData, local.id, modoConsumicion)
    setResultado(res)
    setHistorial(prev => [{ qr: qrData, resultado: res, hora: new Date().toLocaleTimeString('es-ES') }, ...prev.slice(0, 19)])

    setTimeout(() => {
      setResultado(null)
      setProcesando(false)
      scanningRef.current = true
      escanear()
    }, 3000)
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await (track as MediaStreamTrack & { applyConstraints: (c: object) => Promise<void> })
        .applyConstraints({ advanced: [{ torch: !torch } as object] })
      setTorch(!torch)
    } catch { /* torch not supported */ }
  }

  useEffect(() => { return () => pararCamara() }, [])

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Scanner QR</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModoConsumicion(!modoConsumicion)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
              modoConsumicion
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'border-white/10 text-[#6B6B85]'
            )}
          >
            {modoConsumicion ? '🍹 Modo consumición' : '🎫 Modo entrada'}
          </button>
        </div>
      </div>

      {/* Cámara */}
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-square max-w-sm mx-auto">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay QR frame */}
        {activo && !resultado && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-56 h-56 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#E94560] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#E94560] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#E94560] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#E94560] rounded-br-lg" />
              {/* Scan line */}
              <div className="absolute left-0 right-0 h-0.5 bg-[#E94560]/70 animate-[scan_2s_ease-in-out_infinite]"
                style={{ top: '50%' }} />
            </div>
          </div>
        )}

        {/* Resultado overlay */}
        {resultado && (
          <div className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3',
            resultado.tipo.includes('ok') ? 'bg-green-500/80' : 'bg-red-500/80'
          )}>
            {resultado.tipo.includes('ok')
              ? <CheckCircle2 size={64} className="text-white" />
              : <XCircle size={64} className="text-white" />
            }
            <p className="text-white font-bold text-lg text-center px-4">{resultado.mensaje}</p>
          </div>
        )}

        {/* No activo */}
        {!activo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/5">
            <QrCode size={48} className="text-[#6B6B85]" />
            <p className="text-[#6B6B85] text-sm">Cámara inactiva</p>
          </div>
        )}

        {/* Controls overlay */}
        {activo && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button onClick={toggleTorch}
              className={cn('w-9 h-9 rounded-full bg-black/50 flex items-center justify-center', torch && 'bg-yellow-400/30')}>
              <span className="text-white text-sm">💡</span>
            </button>
          </div>
        )}
      </div>

      {/* Botón inicio/pausa */}
      <div className="flex gap-3">
        {!activo ? (
          <button
            onClick={iniciarCamara}
            className="flex-1 h-12 bg-[#E94560] rounded-xl text-white font-bold flex items-center justify-center gap-2"
          >
            <Camera size={18} /> Iniciar scanner
          </button>
        ) : (
          <button
            onClick={pararCamara}
            className="flex-1 h-12 bg-[#2A2A3E] rounded-xl text-white font-bold flex items-center justify-center gap-2"
          >
            Pausar scanner
          </button>
        )}
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">
            Historial de hoy ({historial.length})
          </h2>
          {historial.map((h, i) => (
            <div key={i} className={cn(
              'flex items-center gap-3 p-3 rounded-xl border text-sm',
              h.resultado.tipo.includes('ok')
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-red-500/20 bg-red-500/5'
            )}>
              {h.resultado.tipo.includes('ok')
                ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                : <AlertCircle size={16} className="text-red-400 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium', h.resultado.tipo.includes('ok') ? 'text-green-400' : 'text-red-400')}>
                  {h.resultado.mensaje}
                </p>
              </div>
              <span className="text-[10px] text-[#6B6B85] shrink-0">{h.hora}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

async function verificarQR(qrData: string, localId: string, modoConsumicion: boolean): Promise<ResultadoEscaneoQR> {
  // Format: PM2:<entrada_id>
  if (!qrData.startsWith('PM2:')) {
    return { tipo: 'qr_invalido', mensaje: 'QR no reconocido. No es de PartyMaps.' }
  }

  const entradaId = qrData.split(':')[1]
  if (!entradaId) return { tipo: 'qr_invalido', mensaje: 'QR inválido' }

  const { data: entrada, error } = await supabase
    .from('entradas')
    .select('*')
    .eq('qr_code', qrData)
    .eq('local_id', localId)
    .single()

  if (error || !entrada) {
    return { tipo: 'qr_invalido', mensaje: 'Entrada no encontrada o de otro local' }
  }

  if (modoConsumicion) {
    if (!entrada.consumicion_id) return { tipo: 'qr_invalido', mensaje: 'Esta entrada no incluye consumición' }
    if (entrada.consumicion_canjeada) return { tipo: 'consumicion_usada', entrada, mensaje: 'Consumición ya canjeada' }
    await supabase.from('entradas').update({ consumicion_canjeada: true }).eq('id', entrada.id)
    return { tipo: 'consumicion_ok', entrada, mensaje: '✓ Consumición canjeada', timestamp: new Date().toISOString() }
  }

  if (entrada.estado === 'usada') {
    return { tipo: 'entrada_usada', entrada, mensaje: `Entrada ya usada el ${new Date(entrada.usado_at!).toLocaleDateString()}` }
  }
  if (entrada.estado !== 'activa') {
    return { tipo: 'qr_invalido', entrada, mensaje: `Entrada ${entrada.estado}` }
  }

  // Check event date if applicable
  if (entrada.evento_id) {
    const { data: evento } = await supabase.from('eventos').select('fecha_inicio, fecha_fin').eq('id', entrada.evento_id).single()
    if (evento) {
      const ahora = new Date()
      const inicio = new Date(evento.fecha_inicio)
      const fin = evento.fecha_fin ? new Date(evento.fecha_fin) : null
      const ventanaInicio = new Date(inicio.getTime() - 4 * 60 * 60 * 1000) // 4h antes
      if (ahora < ventanaInicio || (fin && ahora > fin)) {
        return { tipo: 'entrada_fecha_incorrecta', entrada, mensaje: 'Entrada fuera del horario del evento' }
      }
    }
  }

  await supabase.from('entradas').update({ estado: 'usada', usado_at: new Date().toISOString() }).eq('id', entrada.id)
  return { tipo: 'entrada_ok', entrada, mensaje: '✓ Entrada válida — Bienvenido/a', timestamp: new Date().toISOString() }
}
