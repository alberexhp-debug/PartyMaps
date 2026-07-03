import { getPersonaje } from '@/lib/torneos/personajes'

// Etiqueta visual de personaje/arquetipo: medallón de color con su icono + nombre.
// Sustituye al texto plano del main en perfiles, ranking, inscritos y brackets.
export function PersonajeChip({ juegoId, nombre, size = 'sm' }: { juegoId: string; nombre?: string | null; size?: 'sm' | 'md' }) {
  const p = getPersonaje(juegoId, nombre)
  if (!nombre) return null
  if (!p) return <span>{nombre}</span>
  const md = size === 'md'
  return (
    <span className="inline-flex items-center gap-1 align-middle whitespace-nowrap">
      <PersonajeIcon juegoId={juegoId} nombre={nombre} px={md ? 22 : 16} />
      <span className={md ? 'text-sm font-bold text-white' : undefined}>{p.nombre}</span>
    </span>
  )
}

// Solo el medallón (para listas densas o avatares).
export function PersonajeIcon({ juegoId, nombre, px = 16 }: { juegoId: string; nombre?: string | null; px?: number }) {
  const p = getPersonaje(juegoId, nombre)
  if (!p) return null
  return (
    <span
      title={p.nombre}
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: px, height: px, fontSize: px * 0.62, lineHeight: 1,
        background: `${p.color}26`, border: `1px solid ${p.color}66`,
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.4))',
      }}
    >
      {p.emoji}
    </span>
  )
}
