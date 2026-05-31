'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Map, Users, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const slides = [
  {
    icon: Map,
    color: '#E94560',
    eyebrow: 'Mapa en vivo',
    title: 'La noche\nde Madrid\nen un vistazo',
    description: 'Mapa de calor en tiempo real con el aforo de cada local. Decide antes de salir.',
  },
  {
    icon: Users,
    color: '#7C5CFF',
    eyebrow: 'Planes con tu grupo',
    title: 'Quedad\nsin perderse\nningún plan',
    description: 'Pago en grupo, entradas individuales y planes para conocer gente que va al mismo sitio.',
  },
  {
    icon: Sparkles,
    color: '#D4A84B',
    eyebrow: 'Dentro del local',
    title: 'Concursos,\nretos y\ncarta de noche',
    description: 'Tu noche va más allá de entrar. La app sigue contigo dentro del local.',
  },
]

export default function BienvenidaPage() {
  const [slide, setSlide] = useState(0)
  const router = useRouter()
  const current = slides[slide]
  const Icon = current.icon

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Halos dinámicos */}
      <div
        className="absolute -top-32 -left-32 w-[60vh] h-[60vh] rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${current.color}55, transparent 60%)` }}
      />
      <div
        className="absolute top-1/2 -right-32 w-[55vh] h-[55vh] rounded-full blur-3xl pointer-events-none opacity-60 transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${current.color}33, transparent 60%)` }}
      />

      {/* Logo */}
      <div className="relative px-6 pt-10 safe-top">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl holo-bg flex items-center justify-center text-white text-sm font-black shadow-[0_8px_22px_-6px_rgba(124,92,255,0.7)]">
            PM
          </span>
          <span className="text-sm font-bold text-white uppercase tracking-[0.24em]">Rumbo</span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col justify-center px-6 pb-6">
        {/* Eyebrow + Icon */}
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${current.color}28, ${current.color}10)`,
              border: `1px solid ${current.color}55`,
              boxShadow: `0 12px 32px -10px ${current.color}80`,
            }}
          >
            <Icon size={22} style={{ color: current.color }} strokeWidth={1.8} />
          </div>
          <p className="eyebrow" style={{ color: current.color }}>{current.eyebrow}</p>
        </div>

        {/* Title MEGA */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-display text-white mb-5 whitespace-pre-line">{current.title}</h1>

        {/* Description */}
        <p className="text-[#A0A0B8] leading-relaxed text-lg max-w-md">{current.description}</p>

        {/* Dots */}
        <div className="flex gap-2 mt-12">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === slide ? 'w-10' : 'w-1.5 bg-white/15'
              )}
              style={i === slide ? {
                background: current.color,
                boxShadow: `0 0 14px ${current.color}`,
              } : undefined}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="relative px-6 pb-10 safe-bottom space-y-3">
        {slide < slides.length - 1 ? (
          <>
            <Button fullWidth size="xl" onClick={() => setSlide(s => s + 1)}>
              Siguiente <ArrowRight size={18} />
            </Button>
            <Button variant="ghost" fullWidth onClick={() => router.push('/registro')}>
              Saltar introducción
            </Button>
          </>
        ) : (
          <>
            <Button fullWidth size="xl" variant="holo" onClick={() => router.push('/registro')}>
              Crear cuenta <ArrowRight size={18} />
            </Button>
            <Button variant="glass" fullWidth size="xl" onClick={() => router.push('/login')}>
              Ya tengo cuenta
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
