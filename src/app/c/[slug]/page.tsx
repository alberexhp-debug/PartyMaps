'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CartaPerfil } from '@/components/user/CartaPerfil'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { calcularSignoZodiaco, calcularEdad } from '@/lib/utils'
import type { EstiloCarta } from '@/types'
import { ArrowRight } from 'lucide-react'

interface CartaPublica {
  nombre: string
  apodo?: string | null
  foto?: string | null
  fecha_nacimiento: string
  frase?: string | null
  estilo: EstiloCarta
  slug: string
  reputacion: { puntuacion: number; total: number } | null
}

export default function CartaPublicaPage() {
  const { slug } = useParams<{ slug: string }>()
  const [carta, setCarta] = useState<CartaPublica | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/c/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setCarta)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  }

  if (notFound || !carta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🌙</div>
        <h1 className="text-2xl font-bold text-white text-display">Carta no encontrada</h1>
        <p className="text-[#A0A0B8] mt-2 max-w-xs">Puede que el enlace esté roto o que su dueño la haya hecho privada.</p>
        <Link href="/" className="mt-6">
          <Button>Ir a Rumbo</Button>
        </Link>
      </div>
    )
  }

  const signo = calcularSignoZodiaco(carta.fecha_nacimiento)
  const edad = calcularEdad(carta.fecha_nacimiento)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 pb-32">
        {/* Logo */}
        <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-bold text-[#A0A0B8] hover:text-white transition-colors">
          <span className="w-7 h-7 rounded-lg holo-bg flex items-center justify-center text-white text-xs font-black">R</span>
          <span className="uppercase tracking-[0.2em]">Rumbo</span>
        </Link>

        {/* Carta */}
        <div className="w-full max-w-[320px] animate-float-soft">
          <CartaPerfil
            nombre={carta.nombre}
            apodo={carta.apodo}
            edad={edad}
            signo={signo}
            foto={carta.foto}
            frase={carta.frase}
            ciudad="Madrid"
            estilo={carta.estilo}
            slug={carta.slug}
            reputacion={carta.reputacion}
          />
        </div>

        {/* Reflejo */}
        <div className="w-full max-w-[320px] -mt-2 opacity-20 scale-y-[-1] blur-sm pointer-events-none">
          <div className="aspect-[5/7] rounded-[28px]" style={{
            background: 'linear-gradient(180deg, rgba(124,92,255,0.4), transparent)',
          }} />
        </div>

        {/* CTA */}
        <p className="text-center text-sm text-[#A0A0B8] mt-8 max-w-xs">
          Madrid, esta noche.<br />
          <span className="text-white font-semibold">Descubre dónde brilla la ciudad.</span>
        </p>
        <Link href="/" className="mt-5">
          <Button size="lg">
            Crear mi carta <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
