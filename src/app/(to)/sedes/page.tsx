'use client'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoader } from '@/components/ui/Spinner'
import { useDemoStore, useOrgId } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { LOCALES } from '@/lib/torneos/sample'
import { GameChip } from '@/components/todh/GameIcon'
import { ArrowLeft, Clock, Check, X, Star } from '@/components/todh/iconosTorneum'
import { ArrowLeftRight } from 'lucide-react'

const MapaSedes = dynamic(() => import('@/components/todh/MapaSedes'), {
  ssr: false,
  loading: () => <PageLoader />,
})

// Mapa de sedes del TO: todos los locales dados de alta (con y sin torneos) para
// contactar y pedir fecha. El jugador no ve los locales sin torneos publicados.
export default function SedesPage() {
  const { t: tr } = useT()
  const router = useRouter()
  // Solo MIS solicitudes (identidad por cuenta): las de otros TOs no salen aquí.
  const orgId = useOrgId()
  const solicitudes = useDemoStore(s => s.solicitudesSede).filter(x => (x.orgId ?? 'lima') === orgId)
  const responderContraoferta = useDemoStore(s => s.responderContraoferta)
  // Valoración del TO a la sede tras una reserva confirmada (reputación
  // bidireccional). Persiste en el store: no se pierde al recargar.
  const valoradas = useDemoStore(s => s.valoracionesSedes)
  const valorar = useDemoStore(s => s.valorarSede)

  return (
    <div className="relative min-h-screen pb-10 max-w-xl lg:max-w-none mx-auto lg:mx-0">
      <div className="flex items-center gap-3 px-4 lg:px-0 pt-5 lg:pt-0 pb-3 safe-top">
        <button onClick={() => router.back()} aria-label="Volver" className="lg:hidden h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Consola del TO</p>
          <p className="text-base font-bold text-white">{tr('sd.titulo')}</p>
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
            <p className="eyebrow eyebrow-muted mb-2">{tr('sd.misSolicitudes')}</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {solicitudes.map(s => {
                const l = LOCALES[s.localId]
                if (!l) return null
                return (
                  <div key={s.id} className="card-premium p-3 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#0A0A0F] font-black shrink-0" style={{ background: l.color }}>{l.nombre[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{l.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{s.fecha} · {s.franja} · {s.personas} jug. · <GameChip juegoId={s.juego} size={11} /></p>
                    </div>
                    {s.estado === 'pendiente' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF8A5C]"><Clock size={12} /> {tr('sd.pendiente')}</span>}
                    {s.estado === 'aceptada' && (valoradas[s.id]
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E0BE63]">{valoradas[s.id]}★ enviada</span>
                      : <span className="inline-flex items-center gap-0.5">
                          <span className="text-[11px] font-bold text-[#B6FF3A] inline-flex items-center gap-1 mr-1"><Check size={12} /> {tr('sd.confirmada')}</span>
                          {[1, 2, 3, 4, 5].map(st => (
                            <button key={st} onClick={() => valorar(s.id, l.nombre, st)} aria-label={`${st} estrellas`} className="p-0.5">
                              <Star size={13} className="text-[#4A4A5E] hover:text-[#E0BE63] transition-colors" />
                            </button>
                          ))}
                        </span>)}
                    {s.estado === 'rechazada' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6076]"><X size={12} /> {tr('sd.rechazada')}</span>}
                    {s.estado === 'contraoferta' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF8A5C]"><ArrowLeftRight size={12} /> {tr('sd.contraoferta')}</span>}
                  </div>
                )
              })}
              {/* Contraofertas: la sede propone otros términos y el TO decide */}
              {solicitudes.filter(s => s.estado === 'contraoferta' && s.contraoferta).map(s => {
                const l = LOCALES[s.localId]
                if (!l) return null
                return (
                  <div key={`co-${s.id}`} className="card-premium p-3.5 border border-[#FF8A5C]/35 lg:col-span-2">
                    <p className="text-[11px] font-bold text-[#FF8A5C] uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5"><ArrowLeftRight size={12} /> {l.nombre} {tr('sd.proponeTerminos')}</p>
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      <span className="text-[#8B8BA8] line-through">{s.fecha} · {s.franja}</span>
                      <span className="text-white font-bold">→ {s.contraoferta!.fecha} · {s.contraoferta!.franja} · <span className="font-mono-num text-[#B6FF3A]">{s.contraoferta!.precio}€/noche</span></span>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => responderContraoferta(s.id, true, l.nombre)} className="flex-1 h-9 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold inline-flex items-center justify-center gap-1"><Check size={14} /> {tr('sd.aceptarContra')}</button>
                      <button onClick={() => responderContraoferta(s.id, false, l.nombre)} className="h-9 px-3.5 rounded-lg bg-white/6 text-[#FF6076] text-[12px] font-bold">Rechazar</button>
                    </div>
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
