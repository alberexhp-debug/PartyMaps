'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Star, ArrowRight, ChevronDown, ChevronUp, Calendar, Contact, Sparkles } from 'lucide-react'
import { PageHeader, SectionCard, HeroBanner, SkeletonCard } from '@/components/local-panel/ui'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface Paso { id: string; titulo: string; motivo: string; ruta: string; tipo: 'obligatorio' | 'recomendado'; estado: 'hecho' | 'pendiente' }
interface Resumen { pasos: Paso[]; pct: number; obligatoriosPendientes: number }

export default function PuestaAPuntoPage() {
  const [data, setData] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [verHechos, setVerHechos] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 md:p-8 space-y-5 max-w-3xl"><SkeletonCard /><SkeletonCard /></div>
  if (!data) return <div className="p-4 md:p-8"><p className="text-[#8B8BA8]">No se pudo cargar la puesta a punto.</p></div>

  const pendientesObl = data.pasos.filter(p => p.tipo === 'obligatorio' && p.estado === 'pendiente')
  const pendientesRec = data.pasos.filter(p => p.tipo === 'recomendado' && p.estado === 'pendiente')
  const hechos = data.pasos.filter(p => p.estado === 'hecho')
  const completo = data.pct >= 100

  const frase = pendientesObl.length > 0
    ? `Te falta${pendientesObl.length > 1 ? 'n' : ''}: ${pendientesObl.map(p => p.titulo.toLowerCase()).join(' · ')}. Es el mínimo para brillar en el mapa.`
    : pendientesRec.length > 0
      ? 'Ya cumples lo mínimo para brillar en el mapa. Suma los recomendados para sacarle todo el partido.'
      : 'Tu local está listo para tus torneos.'

  return (
    <div className="relative p-4 md:p-8 space-y-5 pb-24 md:pb-8 overflow-hidden max-w-3xl">
      <PageHeader eyebrow="PRIMEROS PASOS" titulo="Pon tu local a punto" acento="rose" />

      {completo ? (
        <HeroBanner acento="green" eyebrow="¡LISTO!" titulo="Tu local está listo para tus torneos 🎮"
          subtitulo="Ya tienes lo esencial. Estos hábitos te darán más gente y más caja." />
      ) : (
        <SectionCard premium>
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B6B85] mb-2">Progreso</p>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${data.pct}%`, background: 'linear-gradient(90deg,#B6FF3A,#7C5CFF)' }} />
              </div>
            </div>
            <span className="text-3xl font-bold text-white text-numeric text-display leading-none">{data.pct}%</span>
          </div>
          <p className="text-[13px] text-[#B8B8CC] mt-3 leading-relaxed">{frase}</p>
        </SectionCard>
      )}

      {/* Pendientes: obligatorios primero, luego recomendados */}
      {(pendientesObl.length > 0 || pendientesRec.length > 0) && (
        <SectionCard>
          <div className="divide-y divide-white/[0.06]">
            {[...pendientesObl, ...pendientesRec].map(p => <FilaPaso key={p.id} paso={p} />)}
          </div>
        </SectionCard>
      )}

      {/* Completados (colapsable) */}
      {hechos.length > 0 && (
        <div>
          <button onClick={() => setVerHechos(v => !v)}
            className="flex items-center gap-1.5 text-sm text-[#8B8BA8] hover:text-white transition-colors px-1">
            {verHechos ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Ver {hechos.length} completado{hechos.length > 1 ? 's' : ''}
          </button>
          {verHechos && (
            <SectionCard className="mt-2">
              <div className="divide-y divide-white/[0.06]">{hechos.map(p => <FilaPaso key={p.id} paso={p} />)}</div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ¿Y ahora qué? — al 100%, el onboarding enseña a operar, no solo a rellenar */}
      {completo && (
        <SectionCard>
          <p className="text-sm font-bold text-white mb-3">¿Y ahora qué? 3 hábitos que dan dinero</p>
          <div className="space-y-2">
            <HabitoRow icon={Calendar} acento="#B6FF3A" titulo="Publica el evento de cada semana" ruta="/local-panel/eventos" />
            <HabitoRow icon={Contact} acento="#7C5CFF" titulo="Mira qué jugadores repiten" ruta="/local-panel/clientes" />
            <HabitoRow icon={Sparkles} acento="#F39C12" titulo="Suma un RRPP más" ruta="/local-panel/rrpp" />
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function FilaPaso({ paso }: { paso: Paso }) {
  const hecho = paso.estado === 'hecho'
  return (
    <div className={cn('flex items-center gap-3 py-3', hecho && 'opacity-60')}>
      <span className="shrink-0">
        {hecho ? <CheckCircle2 size={20} className="text-[#27AE60]" />
          : paso.tipo === 'obligatorio' ? <span className="block w-5 h-5 rounded-full border-2 border-[#B6FF3A]" />
            : <Star size={20} className="text-[#D4A84B]" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#FAFAFC]">
          {paso.titulo}
          {paso.tipo === 'recomendado' && !hecho && <span className="ml-2 text-[10px] text-[#D4A84B] font-bold uppercase tracking-wider">Recomendado</span>}
        </p>
        {!hecho && <p className="text-[12.5px] text-[#8B8BA8] mt-0.5 leading-snug">{paso.motivo}</p>}
      </div>
      {!hecho && (
        <Link href={paso.ruta} className="shrink-0">
          <Button variant="secondary" size="sm">Rellenar <ArrowRight size={13} /></Button>
        </Link>
      )}
    </div>
  )
}

function HabitoRow({ icon: Icon, acento, titulo, ruta }: { icon: React.ElementType; acento: string; titulo: string; ruta: string }) {
  return (
    <Link href={ruta} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] transition-colors">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${acento}1f`, border: `1px solid ${acento}40` }}>
        <Icon size={16} style={{ color: acento }} />
      </span>
      <span className="flex-1 text-sm text-white">{titulo}</span>
      <ArrowRight size={15} className="text-[#6B6B85] shrink-0" />
    </Link>
  )
}
