// ─────────────────────────────────────────────────────────────────────────────
// TAGS DE USUARIO (paquete Chat, 30-08): #XABCD = dígito 1-9 + 4 letras A-Z.
// El dígito inicial distingue a simple vista un tag de USUARIO de uno de CREW
// (las crews son EXACTAMENTE 4 letras, sin números — crews.ts). El tag de
// usuario sirve para agregar amigos con búsqueda exacta `nombre#XABCD` y se
// enseña SOLO en el perfil y el buscador de /amigos: nunca en ranking,
// brackets ni fichas de torneo (ahí solo va el tag de crew).
// Los tags NUNCA se traducen (i18n: son identificadores, no texto).
// ─────────────────────────────────────────────────────────────────────────────

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const TAG_USUARIO_RE = /^[1-9][A-Z]{4}$/

// Tag aleatorio para el usuario de la demo: se genera al primer uso y persiste
// en el store (userTag); regenerable UNA sola vez (tagRegenerado).
export function generarTagUsuario(): string {
  const digito = 1 + Math.floor(Math.random() * 9)
  let letras = ''
  for (let i = 0; i < 4; i++) letras += LETRAS[Math.floor(Math.random() * LETRAS.length)]
  return `${digito}${letras}`
}

// Tag DETERMINISTA por nombre para los jugadores del pool de muestra: mismo
// nombre → mismo tag, estable entre renders y sesiones (hash FNV-1a + LCG).
// Así el buscador de /amigos puede ofrecer búsqueda exacta `nombre#XABCD`
// sin persistir nada por jugador.
export function tagUsuarioDe(nombre: string): string {
  let h = 2166136261
  for (const ch of nombre) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  const digito = 1 + (h % 9)
  let letras = ''
  let x = h
  for (let i = 0; i < 4; i++) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0
    letras += LETRAS[x % LETRAS.length]
  }
  return `${digito}${letras}`
}
