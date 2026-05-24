'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { PageLoader } from '@/components/ui/Spinner'

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) router.replace('/mapa')
      else router.replace('/bienvenida')
    }
  }, [isAuthenticated, isLoading, router])

  return <PageLoader />
}
