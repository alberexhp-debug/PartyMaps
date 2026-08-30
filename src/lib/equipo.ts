/**
 * Helpers del alta de equipo del local. Los trabajadores entran con NOMBRE DE
 * USUARIO + contraseña + authenticator; por debajo usamos un email sintético
 * (usuario@trabajadores.rumbomap.com) para Supabase Auth, porque Auth es por
 * email. El email "de verdad" es un dato de contacto opcional.
 */

/** Dominio interno para los emails sintéticos de los trabajadores. */
export const DOMINIO_TRABAJADOR = 'trabajadores.rumbomap.com'

/** Normaliza un nombre de usuario: minúsculas, sin acentos, solo [a-z0-9._-]. */
export function normalizarUsername(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30)
}

/** ¿El usuario es válido para login? 3-30 chars, empieza por letra/número. */
export function esUsernameValido(s: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(s)
}

/** Email sintético interno a partir del nombre de usuario. */
export function emailSinteticoDeUsuario(username: string): string {
  return `${normalizarUsername(username)}@${DOMINIO_TRABAJADOR}`
}

/** Dominio interno para los emails sintéticos de los RRPP. */
export const DOMINIO_RRPP = 'rrpp.rumbomap.com'
/** Email sintético interno del RRPP a partir del nombre de usuario. */
export function emailSinteticoRrpp(username: string): string {
  return `${normalizarUsername(username)}@${DOMINIO_RRPP}`
}

/** ¿Lo que ha tecleado parece un email "de verdad" (dueño) y no un usuario? */
export function pareceEmail(s: string): boolean {
  return s.includes('@')
}

/** Contraseña por defecto legible para entregar al trabajador. */
export function passwordPorDefecto(): string {
  const palabras = ['Torneum', 'Noche', 'Madrid', 'Fiesta', 'Vibe', 'Neon', 'Luna', 'Sala']
  const p = palabras[Math.floor(Math.random() * palabras.length)]
  const n = Math.floor(1000 + Math.random() * 9000)
  return `${p}${n}!`
}
