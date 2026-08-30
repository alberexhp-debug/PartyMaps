import type { Metadata } from 'next'
import { ParaLocalesContenido } from './ParaLocalesContenido'

// Página server: SOLO la metadata (SEO, en ES como mercado principal). Todo lo
// visible vive en ParaLocalesContenido (client), traducido con useT (es/en/ja).
export const metadata: Metadata = {
  title: 'Torneum para locales — llena tu sala con torneos',
  description: 'Ofrece tu sala a organizadores de torneos, publica tu disponibilidad y cobra tu parte automáticamente. Aparece en el mapa de torneos. Sin permanencia. Empieza gratis.',
}

export default function ParaLocalesPage() {
  return <ParaLocalesContenido />
}
