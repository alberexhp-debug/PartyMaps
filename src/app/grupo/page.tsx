'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GrupoIndexRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/grupo/dashboard') }, [router])
  return null
}
