// ─────────────────────────────────────────────────────────────────────────────
// RESULTADOS REALES → PUNTOS → RANKING (cierra el hueco funcional, 31-08)
//
// puntos.ts define el motor (tope por torneo + reparto por puesto) pero hasta
// hoy nadie lo llamaba con standings reales: el ranking era 100% muestra. Este
// módulo agrega los torneos JUGADOS EN TORNEUM (final cerrada en el bracket del
// TO — gestion.winners es clave de MUNDO, así que todas las cuentas ven lo
// mismo) y los funde con la tabla de muestra del ranking.
//
// Reglas (SISTEMA_PUNTUACION_TORNEUM.md):
//  · Solo puntúan torneos Torneum con la final cerrada. Nada se importa.
//  · Tus puntos van al ranking de TU país (cada Jugador del bracket lleva su
//    país) y siempre al Mundial. Presencial y online por separado.
//  · El Circuito solo suma Oficiales y Super Majors.
// No se persiste nada: igual que el bracket, la agregación se RECALCULA de las
// fuentes (torneos efectivos + gestión del mundo). Sin dobles verdades.
// ─────────────────────────────────────────────────────────────────────────────
import { construirRondas, standingsDe } from '@/lib/torneos/bracket'
import { topePuntos, puntosPorPuesto, paisDe, type CategoriaTorneo, type FilaRankingTorneum } from '@/lib/torneos/puntos'
import { ID_CUENTA_PREFIJO } from '@/lib/stores/useDemoStore'
import type { TorneoSample, Jugador } from '@/lib/torneos/sample'

// Lo mínimo que necesitamos de GestionTorneo (evita importar el store aquí).
export type GestionLike = { generado?: boolean; seeds?: string[]; winners?: Record<string, 'a' | 'b'> }

export type FilaPuntuada = { jugador: Jugador; puesto: number; puntos: number }
export type TorneoPuntuado = {
  torneoId: string
  nombre: string
  juego: string
  online: boolean
  categoria: CategoriaTorneo
  tope: number
  filas: FilaPuntuada[]
}

// Torneos con la final cerrada, ya puntuados. `seedsDe` resuelve los seeds de
// la gestión a jugadores (el llamante pasa resolverSeeds del store: los ids de
// cuenta 'cuenta-*' se reconstruyen igual que en cualquier vista de bracket).
export function torneosPuntuados(
  torneos: TorneoSample[],
  gestion: Record<string, GestionLike | undefined>,
  seedsDe: (t: TorneoSample, g: GestionLike) => Jugador[],
): TorneoPuntuado[] {
  const out: TorneoPuntuado[] = []
  for (const t of torneos) {
    const g = gestion[t.id]
    if (!g?.generado) continue
    const st = standingsDe(construirRondas(seedsDe(t, g), g.winners ?? {}))
    if (st.length === 0) continue // la final aún no está jugada
    const tope = topePuntos(t)
    out.push({
      torneoId: t.id,
      nombre: t.nombre,
      juego: t.juego,
      online: !!t.online,
      categoria: t.categoria ?? 'comunidad',
      tope,
      filas: st.map((j, i) => ({ jugador: j, puesto: i + 1, puntos: puntosPorPuesto(tope, i + 1) })),
    })
  }
  return out
}

export type PuntosJugador = {
  nombre: string
  pais: string
  bandera: string
  rating: number
  puntos: number
  torneos: number
  mejor: number
  // Las CUENTAS se identifican por id ('cuenta-{email}'), nunca por nombre:
  // una cuenta llamada como un jugador de muestra NO suma con él (fleco F).
  esCuenta: boolean
}

// Agregado por jugador para un juego × modalidad (o el Circuito: solo
// oficiales/Super Majors, sin distinguir modalidad).
export function puntosPorJugador(
  puntuados: TorneoPuntuado[],
  juego: string,
  modalidad: 'presencial' | 'online',
  soloCircuito = false,
): Map<string, PuntosJugador> {
  const m = new Map<string, PuntosJugador>()
  for (const tp of puntuados) {
    if (tp.juego !== juego) continue
    if (soloCircuito) {
      if (tp.categoria === 'comunidad') continue
    } else if ((tp.online ? 'online' : 'presencial') !== modalidad) continue
    for (const f of tp.filas) {
      const esCuenta = f.jugador.id.startsWith(ID_CUENTA_PREFIJO)
      // Cuentas por id (identidad real); jugadores de muestra por nombre (su
      // fila del ranking de muestra ES la misma persona y debe sumar).
      const clave = esCuenta ? f.jugador.id : f.jugador.nombre.trim().toLowerCase()
      const prev = m.get(clave)
      if (prev) {
        prev.puntos += f.puntos
        prev.torneos += 1
        prev.mejor = Math.min(prev.mejor, f.puesto)
      } else {
        const pais = f.jugador.pais || 'ES'
        m.set(clave, {
          nombre: f.jugador.nombre,
          pais,
          bandera: f.jugador.bandera || paisDe(pais).bandera,
          rating: f.jugador.rating || 800,
          puntos: f.puntos,
          torneos: 1,
          mejor: f.puesto,
          esCuenta,
        })
      }
    }
  }
  return m
}

// Fusión con la tabla de muestra: quien ya está suma; quien no, entra con su
// fila. `ambitoPais` = pestaña País (solo jugadores de ese país); null =
// Mundial/Circuito (todos). Devuelve la tabla reordenada por puntos.
export function fusionarRanking(
  base: FilaRankingTorneum[],
  reales: Map<string, PuntosJugador>,
  ambitoPais: string | null,
): FilaRankingTorneum[] {
  const filas = base.map(f => ({ ...f }))
  for (const [clave, pj] of reales) {
    if (ambitoPais && pj.pais !== ambitoPais) continue
    // Una CUENTA nunca se funde con una fila de muestra aunque se llame igual
    // (fleco F): entra siempre con su propia fila, identificada por su id.
    const fila = pj.esCuenta ? undefined : filas.find(f => f.nombre.trim().toLowerCase() === clave)
    if (fila) {
      fila.puntos += pj.puntos
      fila.torneos += pj.torneos
      fila.mejor = Math.min(fila.mejor, pj.mejor)
    } else {
      filas.push({
        id: `real-${clave}`,
        nombre: pj.nombre,
        pais: pj.pais,
        bandera: pj.bandera || paisDe(pj.pais).bandera,
        puntos: pj.puntos,
        torneos: pj.torneos,
        mejor: pj.mejor,
        rating: pj.rating,
        tendencia: 0,
      })
    }
  }
  return filas.sort((a, b) => b.puntos - a.puntos)
}
