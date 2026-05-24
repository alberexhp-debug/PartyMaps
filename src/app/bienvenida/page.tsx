'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Map, Users, Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const slides = [
  {
    icon: Map,
    color: '#E94560',
    title: 'Descubre qué merece la pena esta noche',
    description: 'Mapa en tiempo real con el aforo y la temperatura de cada local. Decide antes de salir.',
    halo: 'radial-gradient(circle, rgba(233,69,96,0.25), transparent 60%)',
  },
  {
    icon: Users,
    color: '#4F8EF7',
    title: 'Organiza el plan con tu grupo sin caos',
    description: 'Pago en grupo, entradas individuales y planes para conocer gente que va al mismo sitio.',
    halo: 'radial-gradient(circle, rgba(79,142,247,0.25), transparent 60%)',
  },
  {
    icon: Sparkles,
    color: '#D4A84B',
    title: 'Vive la experiencia dentro del local',
    description: 'Concursos, perfil de noche y retos. La app sigue siendo útil una vez cruzas la puerta.',
    halo: 'radial-gradient(circle, rgba(212,168,75,0.22), transparent 60%)',
  },
]

export default function BienvenidaPage() {
  const [slide, setSlide] = useState(0)
  const router = useRouter()
  const current = slides[slide]
  const Icon = current.icon

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Halos de fondo dinámicos */}
      <div
        className="absolute inset-0 transition-all duration-700 pointer-events-none"
        style={{ background: current.halo, backgroundSize: '120% 120%' }}
      />
      <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: `${current.color}40` }} />

      {/* Logo */}
      <div className="relative px-6 pt-10 safe-top">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl holo-bg flex items-center justify-center text-white text-sm font-black shadow-[0_4px_14px_-4px_rgba(124,92,255,0.6)]">
            PM
          </span>
          <span className="text-sm font-bold text-white uppercase tracking-[0.22em]">PartyMaps</span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 pb-6">
        <div
          className="relative w-28 h-28 rounded-3xl flex items-center justify-center mb-10 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${current.color}30, ${current.color}10)`,
            border: `1px solid ${current.color}55`,
            boxShadow: `0 20px 50px -15px ${current.color}55`,
          }}
        >
          <Icon size={48} style={{ color: current.color }} strokeWidth={1.6} />
          <span className="absolute inset-0 rounded-3xl animate-pulse-heat opacity-40" style={{ boxShadow: `inset 0 0 0 1px ${current.color}` }} />
        </div>

        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-3xl font-bold text-white leading-[1.1] text-display tracking-tight">{current.title}</h1>
          <p className="text-[#A0A0B8] leading-relaxed text-base">{current.description}</p>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-12">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === slide ? 'w-8 bg-[#E94560] shadow-[0_0_12px_rgba(233,69,96,0.7)]' : 'w-1.5 bg-white/15'
              )}
              aria-label={`Ir a slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="relative px-6 pb-10 safe-bottom space-y-3">
        {slide < slides.length - 1 ? (
          <>
            <Button fullWidth size="lg" onClick={() => setSlide(s => s + 1)}>
              Siguiente <ChevronRight size={18} />
            </Button>
            <Button variant="ghost" fullWidth onClick={() => router.push('/registro')}>
              Saltar introducción
            </Button>
          </>
        ) : (
          <>
            <Button fullWidth size="lg" variant="holo" onClick={() => router.push('/registro')}>
              Crear cuenta <ChevronRight size={18} />
            </Button>
            <Button variant="glass" fullWidth size="lg" onClick={() => router.push('/login')}>
              Ya tengo cuenta
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
