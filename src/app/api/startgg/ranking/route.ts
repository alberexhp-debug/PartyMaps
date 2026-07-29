import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET /api/startgg/ranking?juego=smash — ranking REAL por juego, agregando los
// standings (top 8) de los torneos de los últimos 120 días en España vía
// start.gg. Puntuación estilo reunión 5-jul: el tamaño del torneo multiplica y
// cada puesto pondera. Caché de 1 h en servidor (rate limit start.gg: 80/min).

const GQL = 'https://api.start.gg/gql/alpha'
// Juegos con escena real en start.gg (el resto siguen con datos de muestra)
const VIDEOGAME_IDS: Record<string, number> = { smash: 1386, sf6: 43868, tekken: 49783 }
const FACTOR: Record<number, number> = { 1: 1.0, 2: 0.72, 3: 0.55, 4: 0.42, 5: 0.3, 7: 0.2 }

const QUERY = `query R($after: Timestamp!, $ids: [ID!]) {
  tournaments(query: { perPage: 20, filter: { past: true, countryCode: "ES", videogameIds: $ids, afterDate: $after } }) {
    nodes {
      name
      events {
        videogame { id }
        numEntrants
        standings(query: { perPage: 8 }) { nodes { placement entrant { name } } }
      }
    }
  }
}`

type Acum = { puntos: number; torneos: number; mejor: number }

export async function GET(req: NextRequest) {
  const juego = req.nextUrl.searchParams.get('juego') ?? ''
  const vid = VIDEOGAME_IDS[juego]
  if (!vid) return NextResponse.json({ error: 'sin-datos' }, { status: 404 })
  const token = process.env.STARTGG_TOKEN
  if (!token) return NextResponse.json({ error: 'sin-token' }, { status: 503 })

  const after = Math.floor(Date.now() / 1000) - 120 * 86400
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: QUERY, variables: { after, ids: [vid] } }),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return NextResponse.json({ error: 'startgg-caido' }, { status: 502 })

  const json = await res.json()
  const torneos: { name: string; events: { videogame: { id: number } | null; numEntrants: number | null; standings: { nodes: { placement: number; entrant: { name: string } | null }[] | null } | null }[] | null }[] =
    json?.data?.tournaments?.nodes ?? []

  const acum = new Map<string, Acum>()
  let nTorneos = 0
  for (const t of torneos) {
    for (const e of t.events ?? []) {
      if (e?.videogame?.id !== vid) continue
      const entrants = e.numEntrants ?? 0
      const standings = e.standings?.nodes ?? []
      if (!standings.length) continue
      nTorneos++
      for (const s of standings) {
        if (!s?.entrant) continue
        // Los equipos de dobles llegan como «jugadorA / jugadorB»: fuera
        // (esto es el ranking de singles y duplicaría puntos por persona)
        if (s.entrant.name.includes(' / ')) continue
        // «EQUIPO | jugador» → nos quedamos con el tag del jugador
        const nombre = s.entrant.name.split('|').pop()!.trim()
        if (!nombre) continue
        const prev = acum.get(nombre) ?? { puntos: 0, torneos: 0, mejor: 99 }
        acum.set(nombre, {
          puntos: prev.puntos + Math.round(entrants * (FACTOR[s.placement] ?? 0.15)),
          torneos: prev.torneos + 1,
          mejor: Math.min(prev.mejor, s.placement),
        })
      }
    }
  }

  const jugadores = [...acum.entries()]
    .map(([nombre, a]) => ({ nombre, ...a }))
    .sort((a, b) => b.puntos - a.puntos || a.mejor - b.mejor)
    .slice(0, 16)

  return NextResponse.json({ juego, nTorneos, dias: 120, actualizado: Date.now(), jugadores })
}
