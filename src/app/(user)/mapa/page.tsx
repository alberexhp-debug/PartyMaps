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
      <MapaTorneos />
    </Suspense>
  )
}
