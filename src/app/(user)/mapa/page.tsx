'use client'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoader } from '@/components/ui/Spinner'

// Mapa de TORNEOS (un marcador por evento) — componente propio de TODH, con datos
// de muestra y Mapbox.
const MapaTorneos = dynamic(() => import('@/components/todh/MapaTorneos'), {
  ssr: false,
  loading: () => <PageLoader />,
})

export default function MapaPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      {/* Escritorio: el mapa se sale del contenedor y llena TODO el hueco a la
          derecha del rail (edge-to-edge). Móvil: flujo normal sobre la barra inferior. */}
      <div className="lg:fixed lg:top-0 lg:bottom-0 lg:left-[244px] lg:right-0 lg:z-0">
        <MapaTorneos />
      </div>
    </Suspense>
  )
}
