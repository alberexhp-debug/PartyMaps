'use client'
import Link from 'next/link'
import { ArrowLeft } from '@/components/todh/iconosTorneum'
import { useT } from '@/lib/i18n'

// Cabecera compacta de las secciones de la consola del TO: enlace sutil de
// vuelta a /consola, eyebrow dorado «Consola TO» y el título de la sección.
// Misma pieza en móvil y escritorio (la navegación global ya está en el rail
// y en la barra inferior; esto solo sitúa dentro de la consola).
export function CabeceraConsola({ titulo, sub }: { titulo: string; sub?: string }) {
  const { t: tr } = useT()
  return (
    <header className="px-5 lg:px-0 pt-5 lg:pt-0 safe-top">
      <Link href="/consola" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8B8BA8] hover:text-white transition-colors">
        <ArrowLeft size={13} /> {tr('nav.consola')}
      </Link>
      <p className="eyebrow eyebrow-gold mt-3">{tr('to.consola')}</p>
      <h1 className="mt-1 text-2xl font-bold text-white text-display tracking-tight">{titulo}</h1>
      {sub && <p className="mt-1 text-[13px] text-[#8B8BA8]">{sub}</p>}
    </header>
  )
}
