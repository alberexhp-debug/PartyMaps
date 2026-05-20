'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Map, Users, Zap, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const slides = [
  {
    icon: Map,
    color: '#E94560',
    title: 'Descubre qué merece la pena esta noche',
    description: 'Mapa en tiempo real con el nivel de aforo de cada local. Decide antes de salir.',
    bg: 'from-[#E94560]/20 to-transparent',
  },
  {
    icon: Users,
    color: '#4F8EF7',
    title: 'Organiza el plan con tu grupo sin caos',
    description: 'Pago en grupo, entradas individuales y planes para conocer gente que va al mismo sitio.',
    bg: 'from-[#4F8EF7]/20 to-transparent',
  },
  {
    icon: Zap,
    color: '#F39C12',
    title: 'Vive la experiencia dentro del local',
    description: 'Concursos de foto, perfil de noche y retos. La app sigue siendo útil una vez dentro.',
    bg: 'from-[#F39C12]/20 to-transparent',
  },
]

export default function BienvenidaPage() {
  const [slide, setSlide] = useState(0)
  const router = useRouter()
  const current = slides[slide]
  const Icon = current.icon

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col">
      {/* Hero visual */}
      <div className={cn('flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-8 bg-gradient-to-b', current.bg)}>
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-all"
          style={{ background: `${current.color}20`, border: `1.5px solid ${current.color}40` }}>
          <Icon size={44} style={{ color: current.color }} />
        </div>

        <div className="text-center space-y-4 max-w-xs">
          <h1 className="text-2xl font-bold text-white leading-tight">{current.title}</h1>
          <p className="text-[#A0A0B8] leading-relaxed">{current.description}</p>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === slide ? 'w-6 h-2 bg-[#E94560]' : 'w-2 h-2 bg-[#2A2A3E]'
              )}
            />
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="px-6 pb-12 space-y-3">
        {slide < slides.length - 1 ? (
          <>
            <Button
              fullWidth
              onClick={() => setSlide(s => s + 1)}
              className="flex items-center gap-2"
            >
              Siguiente <ChevronRight size={18} />
            </Button>
            <Button variant="ghost" fullWidth onClick={() => router.push('/registro')}>
              Saltar
            </Button>
          </>
        ) : (
          <>
            <Button fullWidth onClick={() => router.push('/registro')}>
              Crear cuenta
            </Button>
            <Button variant="outline" fullWidth onClick={() => router.push('/login')}>
              Ya tengo cuenta
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
