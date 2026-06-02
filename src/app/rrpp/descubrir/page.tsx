'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { RrppNav } from '@/components/rrpp/RrppNav'

// El mapa usa mapbox-gl (solo cliente).
const MapaRRPP = dynamic(() => import('@/components/rrpp/MapaRRPP'), { ssr: false })

export default function RrppDescubrirPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no'>('cargando')

  useEffect(() => {
    fetch('/api/rrpp/perfil', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (j?.rrpp && j.rrpp.estado_alta === 'completo') setEstado('ok')
        else { setEstado('no'); router.replace('/rrpp') }
      })
      .catch(() => { setEstado('no'); router.replace('/rrpp') })
  }, [router])

  if (estado !== 'ok') {
    return <div className="min-h-screen bg-[#07070D] flex items-center justify-center text-[#6B6B85]">Cargando…</div>
  }
  return (
    <>
      <MapaRRPP />
      <RrppNav />
    </>
  )
}
