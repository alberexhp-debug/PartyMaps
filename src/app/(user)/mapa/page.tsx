'use client'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoader } from '@/components/ui/Spinner'

const MapaExplorar = dynamic(() => import('@/components/user/MapaExplorar'), {
  ssr: false,
  loading: () => <PageLoader />,
})

export default function ExplorarPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MapaExplorar />
    </Suspense>
  )
}
