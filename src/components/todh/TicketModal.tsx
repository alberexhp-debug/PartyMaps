'use client'
import { useEffect, useRef } from 'react'
import type { TorneoSample } from '@/lib/torneos/sample'
import { JUEGOS } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { X, Calendar, MapPin, Sun, Check, QrCode } from 'lucide-react'

// Modal de entrada con QR (offline). En demo el QR codifica un id ficticio.
export function TicketModal({ torneo, onClose }: { torneo: TorneoSample; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const juego = JUEGOS[torneo.juego]
  const code = `Tourneum-${torneo.id.toUpperCase()}-DEMO`
  const hecho = useDemoStore(s => s.checkinsJugador.includes(torneo.id))
  const hacerCheckin = useDemoStore(s => s.hacerCheckin)
  const puedeCheckin = torneo.esHoy || torneo.checkInAbierto

  useEffect(() => {
    import('qrcode').then(QRCode => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, code, { width: 220, margin: 1, color: { dark: '#0A0A0F', light: '#FFFFFF' } })
      }
    })
  }, [code])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-pop">
        {/* Cuerpo del ticket */}
        <div className="bg-white rounded-3xl overflow-hidden">
          <div className="relative h-20" style={{ background: `linear-gradient(120deg, ${juego.color}, ${juego.color}99)` }}>
            <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/25 flex items-center justify-center text-white"><X size={16} /></button>
            <div className="absolute bottom-2.5 left-5 right-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">{juego.nombre}</p>
              <p className="text-lg font-black text-white text-display leading-tight truncate">{torneo.nombre}</p>
            </div>
          </div>
          <div className="px-5 pt-4 pb-2 flex items-center justify-between text-[#0A0A0F]">
            <div className="flex items-center gap-1.5 text-sm font-semibold"><Calendar size={14} style={{ color: juego.color }} /> {torneo.fechaLabel}</div>
            <div className="flex items-center gap-1.5 text-xs text-[#555]"><MapPin size={13} /> {torneo.local}</div>
          </div>
          {/* Perforación */}
          <div className="relative h-6 my-1">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 h-6 w-6 rounded-full bg-[#0D0F15]" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 h-6 w-6 rounded-full bg-[#0D0F15]" />
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#0A0A0F]/15" />
          </div>
          {/* QR */}
          <div className="px-5 pb-6 flex flex-col items-center">
            <canvas ref={canvasRef} className="rounded-xl" />
            <p className="mt-3 font-mono-num text-[13px] font-bold text-[#0A0A0F] tracking-wider">{code}</p>
            <p className="mt-1 text-[11px] text-[#777] text-center">Muestra este QR en el check-in. Funciona sin conexión.</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#999]"><Sun size={11} /> Sube el brillo para escanear mejor</div>
            {/* Check-in del jugador (cuando el torneo lo tiene abierto) */}
            {puedeCheckin && (
              hecho ? (
                <div className="mt-4 w-full h-11 rounded-xl bg-[#B6FF3A]/15 border border-[#B6FF3A]/50 text-[#3E7A00] text-sm font-bold flex items-center justify-center gap-2">
                  <Check size={16} /> Check-in hecho · te avisaremos al tocarte mesa
                </div>
              ) : (
                <button onClick={() => hacerCheckin(torneo.id, torneo.nombre)}
                  className="mt-4 w-full h-11 rounded-xl bg-[#0A0A0F] text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
                  <QrCode size={16} /> Ya estoy aquí · hacer check-in
                </button>
              )
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] text-[#6E6E85]">Modo demo · entrada de muestra</p>
      </div>
    </div>
  )
}
