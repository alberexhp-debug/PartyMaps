'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin } from '@/components/todh/iconosTorneum'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useT } from '@/lib/i18n'

// Aviso flotante «Ver mi mesa»: aparece en TODA la app del jugador en cuanto
// arranca un torneo al que está inscrito, y desaparece al terminar. Antes vivía
// incrustado en la ficha del torneo (donde lo veía hasta la sede); es una
// notificación del USUARIO, no de la ficha. Solo rol jugador.
export function AvisoMiMesa() {
  const { t: tr } = useT()
  const pathname = usePathname()
  const esJugador = useSesionStore(s => s.sesion?.rol === 'jugador')
  const inscritos = useDemoStore(s => s.inscritos)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  if (!esJugador) return null
  const vivo = torneosEfectivos(creados, editados, cancelados).find(t => t.enDirecto && inscritos.includes(t.id))
  // En su propia vista de mesa el aviso sobra (ya está donde le lleva)
  // En CUALQUIER página de mesa la pastilla sobra (estás jugando un set) — y
  // en móvil llegaba a tapar el CTA «Confirmo, voy de camino» de otra mesa
  // (bug cazado por QA 01-09). Antes solo se ocultaba en la mesa de SU torneo.
  if (!vivo || /\/torneo\/[^/]+\/mesa/.test(pathname)) return null
  return (
    <Link href={`/torneo/${vivo.id}/mesa`}
      className="fixed z-40 bottom-20 right-4 lg:bottom-6 lg:right-6 inline-flex items-center gap-2 h-11 pl-3 pr-4 rounded-full bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold shadow-[0_10px_30px_-8px_rgba(182,255,58,0.55)] active:scale-[0.98] transition-transform animate-slide-up-sm">
      <span className="dot-live" />
      <span className="max-w-[45vw] lg:max-w-60 truncate">{vivo.nombre}</span>
      <span className="inline-flex items-center gap-1 shrink-0"><MapPin size={14} /> {tr('mesa.verMiMesa')}</span>
    </Link>
  )
}
