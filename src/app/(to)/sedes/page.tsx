'use client'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoader } from '@/components/ui/Spinner'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { LOCALES, JUEGOS } from '@/lib/torneos/sample'
import { ArrowLeft, Clock, Check, X } from 'lucide-react'

const MapaSedes = dynamic(() => import('@/components/todh/MapaSedes'), {
  ssr: false,
  loading: () => <PageLoader />,
})

// Mapa de sedes del TO: todos los locales dados de alta (con y sin torneos) para
// contactar y pedir fecha. El jugador no ve los locales sin torneos publicados.
export default function SedesPage() {
  const router = useRouter()
  const solicitudes = useDemoStore(s => s.solicitudesSede)

  return (
    <div className="relative min-h-screen pb-10 max-w-xl lg:max-w-none mx-auto lg:mx-0">
      <div className="flex items-center gap-3 px-4 lg:px-0 pt-5 lg:pt-0 pb-3 safe-top">
        <button onClick={() => router.back()} aria-label="Volver" className="lg:hidden h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Consola del TO</p>
          <p className="text-base font-bold text-white">Sedes · contacta y reserva</p>
        </div>
        <p className="hidden sm:block text-xs text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{Object.keys(LOCALES).length}</span> locales dados de alta</p>
      </div>

      <div className="px-4 lg:px-0">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-13rem)]">
          <Suspense fallback={<PageLoader />}>
            <MapaSedes />
          </Suspense>
        </div>

        {/* Mis solicitudes a sedes */}
        {solicitudes.length > 0 && (
          <div className="mt-4">
            <p className="eyebrow eyebrow-muted mb-2">Mis solicitudes</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {solicitudes.map(s => {
                const l = LOCALES[s.localId]
                const j = JUEGOS[s.juego]
                if (!l) return null
                return (
                  <div key={s.id} className="card-premium p-3 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#0A0A0F] font-black shrink-0" style={{ background: l.color }}>{l.nombre[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{l.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{s.fecha} · {s.franja} · {s.personas} jug. · {j?.corto}</p>
                    </div>
                    {s.estado === 'pendiente' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF8A5C]"><Clock size={12} /> Pendiente</span>}
                    {s.estado === 'aceptada' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B6FF3A]"><Check size={12} /> Confirmada</span>}
                    {s.estado === 'rechazada' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6076]"><X size={12} /> Rechazada</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
