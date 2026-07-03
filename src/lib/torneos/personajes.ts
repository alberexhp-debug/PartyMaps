// Pool de personajes/arquetipos por juego con icono (emoji) y color propios.
// Sin assets externos: el "logo" es un medallón de color + emoji, consistente con
// los pines del mapa y el keyart CSS. Con backend real, cada entrada llevará su
// sprite oficial y esto pasa a ser una tabla (juego_id, slug, nombre, icono_url).

export type Personaje = { nombre: string; emoji: string; color: string }

const P = (nombre: string, emoji: string, color: string): Personaje => ({ nombre, emoji, color })

export const PERSONAJES: Record<string, Personaje[]> = {
  smash: [
    P('Joker', '🎭', '#D33'), P('Steve', '⛏️', '#7A5230'), P('Fox', '🦊', '#E8913A'),
    P('Pikachu', '⚡', '#FFC83D'), P('Cloud', '🗡️', '#7FB0FF'), P('Roy', '🔥', '#E63E54'),
    P('Pyra/Mythra', '🌗', '#F4912B'), P('Sonic', '💨', '#4F8EF7'), P('Kirby', '🌸', '#FF9FB2'),
    P('Link', '🏹', '#2EC4B6'), P('Mario', '🍄', '#E63E54'), P('Lucina', '⚔️', '#9B5DE5'),
  ],
  sf6: [
    P('Luke', '💪', '#4F8EF7'), P('Ken', '🔥', '#E63E54'), P('JP', '🎩', '#9B5DE5'),
    P('Cammy', '🇬🇧', '#2EC4B6'), P('Juri', '😈', '#C05CFF'), P('Dee Jay', '🎵', '#F4912B'),
    P('Guile', '✈️', '#7FB0FF'), P('Ryu', '🥋', '#B8C0CC'), P('Chun-Li', '🌀', '#4F8EF7'),
  ],
  tekken: [
    P('Jin', '⚡', '#E63E54'), P('Kazuya', '👹', '#9B5DE5'), P('King', '🐯', '#F4912B'),
    P('Bryan', '💀', '#B8C0CC'), P('Nina', '🕶️', '#C9CCD6'), P('Dragunov', '🪖', '#6B7A8F'),
    P('Paul', '🧱', '#E8913A'), P('Xiaoyu', '🐼', '#FF9FB2'),
  ],
  tft: [
    P('Hyper Roll', '🎲', '#4F8EF7'), P('Fast 8', '⏩', '#B6FF3A'), P('Reroll', '🔄', '#F4912B'),
    P('Standard', '📊', '#9B5DE5'), P('Econ', '💰', '#E0BE63'),
  ],
  magic: [
    P('Aggro', '⚔️', '#E63E54'), P('Control', '🛡️', '#4F8EF7'), P('Midrange', '⚖️', '#2EC4B6'),
    P('Combo', '🔗', '#9B5DE5'), P('Tempo', '⏱️', '#F4912B'), P('Ramp', '🌲', '#3FA65C'),
  ],
  pokemon: [
    P('Charizard ex', '🔥', '#E8913A'), P('Lugia', '🌊', '#4F8EF7'), P('Lost Box', '📦', '#9B5DE5'),
    P('Gardevoir ex', '💫', '#C05CFF'), P('Miraidon', '⚡', '#FFC83D'), P('Roaring Moon', '🌙', '#6B7A8F'),
  ],
  valorant: [
    P('Jett', '💨', '#7FB0FF'), P('Reyna', '👁️', '#C05CFF'), P('Omen', '🌑', '#5A5A70'),
    P('Sage', '❄️', '#2EC4B6'), P('Raze', '💣', '#E8913A'), P('Killjoy', '🤖', '#FFC83D'),
  ],
  lol: [
    P('Ahri', '🦊', '#FF9FB2'), P('Yasuo', '🌪️', '#2EC4B6'), P('Lee Sin', '🥋', '#E63E54'),
    P('Lux', '✨', '#FFC83D'), P('Thresh', '⛓️', '#3FA65C'), P('Jinx', '🚀', '#4F8EF7'),
  ],
  cod: [
    P('Asalto', '🎯', '#E8913A'), P('SMG', '⚡', '#B6FF3A'), P('Francotirador', '🔭', '#4F8EF7'),
    P('Escopeta', '💥', '#E63E54'), P('Apoyo', '🛡️', '#2EC4B6'),
  ],
}

// Búsqueda tolerante: por nombre exacto dentro del juego, y si no, en todos los
// juegos (los datos de muestra a veces cruzan mains entre listas).
export function getPersonaje(juegoId: string, nombre?: string | null): Personaje | undefined {
  if (!nombre) return undefined
  const enJuego = PERSONAJES[juegoId]?.find(p => p.nombre === nombre)
  if (enJuego) return enJuego
  for (const pool of Object.values(PERSONAJES)) {
    const hit = pool.find(p => p.nombre === nombre)
    if (hit) return hit
  }
  return undefined
}
