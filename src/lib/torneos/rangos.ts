// Sistema competitivo de la reunión del 5-jul: rangos por letras (E → S) por juego.
// El rango se DERIVA del rating de muestra; con backend, el motor de puntos será
// la fuente (tabla por diferencia de rango, marcador ajustado, profundidad, decay).

export type Rango = {
  letra: string       // 'E', 'E+', 'D', … 'A++', 'S'
  color: string       // color del grupo (E gris → S rosa fuego)
  grupo: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
  progreso: number    // 0-100 hacia el siguiente rango
  puntos: number      // puntos dentro del escalón (demo)
  umbral: number      // puntos del escalón (para "180/300")
}

const LETRAS = ['E', 'E+', 'E++', 'D', 'D+', 'D++', 'C', 'C+', 'C++', 'B', 'B+', 'B++', 'A', 'A+', 'A++', 'S'] as const
const COLOR_GRUPO: Record<Rango['grupo'], string> = {
  E: '#8B8BA8', D: '#C08B5C', C: '#4F8EF7', B: '#9B82FF', A: '#E0BE63', S: '#FF5C8A',
}
// Umbral de puntos por escalón (sube con el rango, como se habló: ~200-300)
const UMBRAL_GRUPO: Record<Rango['grupo'], number> = { E: 200, D: 220, C: 250, B: 280, A: 300, S: 400 }

const BASE = 1500   // rating mínimo de la escala demo
const PASO = 60     // ancho de escalón

export function rangoDe(rating: number): Rango {
  const idx = Math.max(0, Math.min(LETRAS.length - 1, Math.floor((rating - BASE) / PASO)))
  const letra = LETRAS[idx]
  const grupo = letra[0] as Rango['grupo']
  const umbral = UMBRAL_GRUPO[grupo]
  const dentro = idx === LETRAS.length - 1 ? 1 : ((rating - BASE) % PASO) / PASO
  return {
    letra, grupo, color: COLOR_GRUPO[grupo],
    progreso: Math.round(dentro * 100),
    puntos: Math.round(dentro * umbral),
    umbral,
  }
}

// Tabla de puntos por diferencia de rango (la de la reunión, para el explicador
// y para simular ganancias en demo): ganar a tu nivel ~25; al superior, mucho más.
export function puntosPorVictoria(difEscalones: number): number {
  if (difEscalones >= 6) return 200
  if (difEscalones >= 3) return 120
  if (difEscalones >= 1) return 60
  if (difEscalones === 0) return 25
  if (difEscalones >= -2) return 12
  return 5
}

// Multiplicador por profundidad de bracket (~×1,25 por ronda superada)
export function multiplicadorProfundidad(rondasSuperadas: number): number {
  return Math.round(Math.pow(1.25, rondasSuperadas) * 100) / 100
}
