'use client'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { crewQueRepresenta } from '@/lib/torneos/crews'

// ─────────────────────────────────────────────────────────────────────────────
// Tag de crew junto al nick (#NOCT): SOLO se pinta en torneo (brackets) y en el
// ranking Torneum — spec §7.2. Fuera de ahí (amigos, MiniPerfil, chats) NO se
// muestra. Pequeño y muted, con el color de la crew; si el jugador está en 2
// crews del juego, representa la más antigua (ver crewQueRepresenta).
// `onLight` es para filas con fondo claro (ganador en lima): tinta oscura.
// El tag NUNCA se traduce.
// ─────────────────────────────────────────────────────────────────────────────
export function CrewTag({ nombre, juego, onLight = false, className = '' }: {
  nombre?: string
  juego?: string
  onLight?: boolean
  className?: string
}) {
  const crews = useDemoStore(s => s.crews)
  if (!nombre || !juego || nombre === '—') return null
  const crew = crewQueRepresenta(crews, nombre, juego)
  if (!crew) return null
  return (
    <span
      className={`text-[9px] font-black tracking-wide shrink-0 align-middle ${className}`}
      style={{ color: onLight ? 'rgba(10,10,15,0.6)' : (crew.color ?? '#8B8BA8'), opacity: onLight ? 1 : 0.85 }}
      title={`${crew.nombre} #${crew.tag}`}
    >
      #{crew.tag}
    </span>
  )
}
