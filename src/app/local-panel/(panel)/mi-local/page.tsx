'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MiLocalPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/local-panel/configuracion') }, [router])
  return null
}
