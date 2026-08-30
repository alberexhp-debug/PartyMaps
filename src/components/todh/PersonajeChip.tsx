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

// Hasta 2 medallones en línea: los personajes que un jugador declaró en un
// combate (doble reporte). Para las brackets: pequeño, con tooltip del nombre.
export function PersonajesDeLado({ juegoId, nombres, px = 14 }: { juegoId: string; nombres?: string[]; px?: number }) {
  if (!nombres?.length) return null
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0 align-middle">
      {nombres.slice(0, 2).map(n => <PersonajeIcon key={n} juegoId={juegoId} nombre={n} px={px} />)}
    </span>
  )
}

// Solo el medallón (para listas densas o avatares). Con logo real (`img`,
// autohospedado en /public/personajes) lo pinta; si no, medallón color+emoji.
export function PersonajeIcon({ juegoId, nombre, px = 16 }: { juegoId: string; nombre?: string | null; px?: number }) {
  const p = getPersonaje(juegoId, nombre)
  if (!p) return null
  if (p.img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={p.img} alt={p.nombre} title={p.nombre} width={px} height={px}
        className="inline-block shrink-0 rounded-full object-cover"
        style={{ width: px, height: px, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.45))' }}
      />
    )
  }
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
