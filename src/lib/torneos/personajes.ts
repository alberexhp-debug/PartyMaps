// Pool de personajes/arquetipos por juego con icono y color propios.
// Donde hay logo real, va en `img` (autohospedado en /public/personajes/…, stock
// icons de fantendo.fandom.com pasados por Albert); si no, el medallón de color +
// emoji. Con backend real esto pasa a ser una tabla (juego_id, slug, nombre, icono_url).

export type Personaje = { nombre: string; emoji: string; color: string; img?: string }

const P = (nombre: string, emoji: string, color: string, img?: string): Personaje => ({ nombre, emoji, color, ...(img ? { img } : {}) })

const SM = (slug: string) => `/personajes/smash/${slug}.png`
const IMG = (juego: string, slug: string, ext = 'png') => `/personajes/${juego}/${slug}.${ext}`

export const PERSONAJES: Record<string, Personaje[]> = {
  smash: [
    P('Joker', '🎭', '#D33', SM('joker')), P('Steve', '⛏️', '#7A5230', SM('steve')), P('Fox', '🦊', '#E8913A', SM('fox')),
    P('Pikachu', '⚡', '#FFC83D', SM('pikachu')), P('Cloud', '🗡️', '#7FB0FF', SM('cloud')), P('Roy', '🔥', '#E63E54', SM('roy')),
    P('Pyra/Mythra', '🌗', '#F4912B', SM('pyra')), P('Sonic', '💨', '#4F8EF7', SM('sonic')), P('Kirby', '🌸', '#FF9FB2', SM('kirby')),
    P('Link', '🏹', '#2EC4B6', SM('link')), P('Mario', '🍄', '#E63E54', SM('mario')), P('Lucina', '⚔️', '#9B5DE5', SM('lucina')),
  ],
  sf6: [
    P('Luke', '💪', '#4F8EF7', IMG('sf6', 'luke')), P('Ken', '🔥', '#E63E54', IMG('sf6', 'ken')), P('JP', '🎩', '#9B5DE5', IMG('sf6', 'jp')),
    P('Cammy', '🇬🇧', '#2EC4B6', IMG('sf6', 'cammy')), P('Juri', '😈', '#C05CFF', IMG('sf6', 'juri')), P('Dee Jay', '🎵', '#F4912B', IMG('sf6', 'dee-jay')),
    P('Guile', '✈️', '#7FB0FF', IMG('sf6', 'guile')), P('Ryu', '🥋', '#B8C0CC', IMG('sf6', 'ryu')), P('Chun-Li', '🌀', '#4F8EF7', IMG('sf6', 'chun-li')),
  ],
  tekken: [
    P('Jin', '⚡', '#E63E54', IMG('tekken', 'jin')), P('Kazuya', '👹', '#9B5DE5', IMG('tekken', 'kazuya')), P('King', '🐯', '#F4912B', IMG('tekken', 'king')),
    P('Bryan', '💀', '#B8C0CC', IMG('tekken', 'bryan')), P('Nina', '🕶️', '#C9CCD6', IMG('tekken', 'nina')), P('Dragunov', '🪖', '#6B7A8F', IMG('tekken', 'dragunov')),
    P('Paul', '🧱', '#E8913A', IMG('tekken', 'paul')), P('Xiaoyu', '🐼', '#FF9FB2', IMG('tekken', 'xiaoyu')),
  ],
  tft: [
    P('Hyper Roll', '🎲', '#4F8EF7'), P('Fast 8', '⏩', '#B6FF3A'), P('Reroll', '🔄', '#F4912B'),
    P('Standard', '📊', '#9B5DE5'), P('Econ', '💰', '#E0BE63'),
  ],
  magic: [
    // Arquetipos → símbolo de maná canónico (SVGs de Scryfall)
    P('Aggro', '⚔️', '#E63E54', IMG('magic', 'aggro', 'svg')), P('Control', '🛡️', '#4F8EF7', IMG('magic', 'control', 'svg')), P('Midrange', '⚖️', '#2EC4B6', IMG('magic', 'midrange', 'svg')),
    P('Combo', '🔗', '#9B5DE5', IMG('magic', 'combo', 'svg')), P('Tempo', '⏱️', '#F4912B', IMG('magic', 'tempo', 'svg')), P('Ramp', '🌲', '#3FA65C', IMG('magic', 'ramp', 'svg')),
  ],
  pokemon: [
    P('Charizard ex', '🔥', '#E8913A', IMG('pokemon', 'charizard')), P('Lugia', '🌊', '#4F8EF7', IMG('pokemon', 'lugia')), P('Lost Box', '📦', '#9B5DE5', IMG('pokemon', 'comfey')),
    P('Gardevoir ex', '💫', '#C05CFF', IMG('pokemon', 'gardevoir')), P('Miraidon', '⚡', '#FFC83D', IMG('pokemon', 'miraidon')), P('Roaring Moon', '🌙', '#6B7A8F', IMG('pokemon', 'roaring-moon')),
  ],
  valorant: [
    P('Jett', '💨', '#7FB0FF', IMG('valorant', 'jett')), P('Reyna', '👁️', '#C05CFF', IMG('valorant', 'reyna')), P('Omen', '🌑', '#5A5A70', IMG('valorant', 'omen')),
    P('Sage', '❄️', '#2EC4B6', IMG('valorant', 'sage')), P('Raze', '💣', '#E8913A', IMG('valorant', 'raze')), P('Killjoy', '🤖', '#FFC83D', IMG('valorant', 'killjoy')),
  ],
  lol: [
    P('Ahri', '🦊', '#FF9FB2', IMG('lol', 'ahri')), P('Yasuo', '🌪️', '#2EC4B6', IMG('lol', 'yasuo')), P('Lee Sin', '🥋', '#E63E54', IMG('lol', 'lee-sin')),
    P('Lux', '✨', '#FFC83D', IMG('lol', 'lux')), P('Thresh', '⛓️', '#3FA65C', IMG('lol', 'thresh')), P('Jinx', '🚀', '#4F8EF7', IMG('lol', 'jinx')),
  ],
  cod: [
    P('Asalto', '🎯', '#E8913A'), P('SMG', '⚡', '#B6FF3A'), P('Francotirador', '🔭', '#4F8EF7'),
    P('Escopeta', '💥', '#E63E54'), P('Apoyo', '🛡️', '#2EC4B6'),
  ],
}

// Fusión del roster ampliado (personajes.gen.ts, generado por script): entra todo
// lo que no esté ya en el catálogo curado de arriba, con color rotatorio y el
// emoji del juego como respaldo. El curado manda si un nombre coincide.
import { PERSONAJES_GEN } from './personajes.gen'
const COLORES_GEN = ['#E63E54', '#F4912B', '#FFC83D', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#FF9FB2', '#7FB0FF', '#3FA65C', '#C05CFF']
const EMOJI_JUEGO: Record<string, string> = { smash: '⚔️', sf6: '🥊', tekken: '👊', lol: '🛡️', valorant: '🎯', pokemon: '⚡' }
for (const [juego, lista] of Object.entries(PERSONAJES_GEN)) {
  const pool = PERSONAJES[juego] ?? (PERSONAJES[juego] = [])
  lista.forEach((e, i) => {
    const ya = pool.find(p => p.nombre === e.nombre)
    if (ya) { if (!ya.img) ya.img = e.img; return }
    pool.push({ nombre: e.nombre, emoji: EMOJI_JUEGO[juego] ?? '🎮', color: COLORES_GEN[i % COLORES_GEN.length], img: e.img })
  })
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
