'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSesionStore, rutaInicial } from '@/lib/stores/useSesionStore'
import { PageLoader } from '@/components/ui/Spinner'

// Raíz: con sesión, cada rol a su panel; sin sesión, a la portada pública.
export default function RootPage() {
  const router = useRouter()
  const sesion = useSesionStore(s => s.sesion)
  const [hidratado, setHidratado] = useState(false)
  useEffect(() => setHidratado(true), [])

  useEffect(() => {
    if (!hidratado) return
    router.replace(sesion ? rutaInicial(sesion) : '/inicio')
  }, [hidratado, sesion, router])

  return <PageLoader />
}
