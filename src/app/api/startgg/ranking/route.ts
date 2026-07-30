import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { STARTGG_VIDEOGAMES } from '@/lib/torneos/startgg'

// GET /api/startgg/ranking?juego=smash — ranking REAL por juego agregando los
// standings (top 16) de los torneos de los últimos 180 días en start.gg.
// Primero España; si no da para una tabla (<6 jugadores), cae a Global (TFT,
// Pokémon TCG, Valorant y LoL viven fuera). Puntuación estilo reunión 5-jul:
// el tamaño del torneo multiplica y cada puesto pondera por tramos; el rango
// por letras (E→S+) se adapta normalizando contra el líder. Caché 1 h.

const GQL = 'https://api.start.gg/gql/alpha'

// events filtrados por videogame: sin esto, torneos multi-evento disparaban el
// límite de complejidad de la API (1000 objetos) y la respuesta venía con
// `errors` y sin datos (tekken/tft parecían vacíos).
const QUERY = (conPais: boolean) => `query R($after: Timestamp!, $ids: [ID!]) {
  tournaments(query: { perPage: 20, filter: { past: true, ${conPais ? 'countryCode: "ES",' : ''} videogameIds: $ids, afterDate: $after } }) {
    nodes {
      name
      events(filter: { videogameId: $ids }) {
        videogame { id }
        numEntrants
        standings(query: { perPage: 16 }) { nodes { placement entrant { name } } }
      }
    }
  }
}`

// Ponderación por tramos de puesto (1º manda; la cola también puntúa algo)
function factorPuesto(p: number): number {
  if (p <= 1) return 1
  if (p === 2) return 0.72
  if (p === 3) return 0.55
  if (p === 4) return 0.42
  if (p <= 6) return 0.3
  if (p <= 8) return 0.22
  if (p <= 12) return 0.15
  if (p <= 16) return 0.1
  if (p <= 24) return 0.07
  return 0.05
}

type NodoTorneo = {
  name: string
  events: { videogame: { id: number } | null; numEntrants: number | null; standings: { nodes: { placement: number; entrant: { name: string } | null }[] | null } | null }[] | null
}

async function agrega(token: string, vid: number, conPais: boolean) {
  const after = Math.floor(Date.now() / 1000) - 180 * 86400
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: QUERY(conPais), variables: { after, ids: [vid] } }),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const json = await res.json()
  if (json?.errors?.length) return null   // p.ej. límite de complejidad
  const torneos: NodoTorneo[] = json?.data?.tournaments?.nodes ?? []

  const acum = new Map<string, { puntos: number; torneos: number; mejor: number }>()
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
        // Equipos («A / B» de dobles) fuera: esto es el ranking individual
        if (s.entrant.name.includes(' / ')) continue
        const nombre = s.entrant.name.split('|').pop()!.trim()
        if (!nombre) continue
        const prev = acum.get(nombre) ?? { puntos: 0, torneos: 0, mejor: 99 }
        acum.set(nombre, {
          puntos: prev.puntos + Math.round(entrants * factorPuesto(s.placement)),
          torneos: prev.torneos + 1,
          mejor: Math.min(prev.mejor, s.placement),
        })
      }
    }
  }
  return { nTorneos, acum }
}

export async function GET(req: NextRequest) {
  const juego = req.nextUrl.searchParams.get('juego') ?? ''
  const vid = STARTGG_VIDEOGAMES[juego]
  if (!vid) return NextResponse.json({ error: 'sin-datos' }, { status: 404 })
  const token = process.env.STARTGG_TOKEN
  if (!token) return NextResponse.json({ error: 'sin-token' }, { status: 503 })

  // España primero; Global si la escena local no da para una tabla digna
  // (mínimo 8 jugadores y 4 torneos) y fuera hay más chicha
  let ambito: 'es' | 'global' = 'es'
  let r = await agrega(token, vid, true)
  const esDigno = !!r && r.acum.size >= 8 && r.nTorneos >= 4
  if (!esDigno) {
    const g = await agrega(token, vid, false)
    if (g && g.acum.size > (r?.acum.size ?? 0)) { r = g; ambito = 'global' }
  }
  if (!r) return NextResponse.json({ error: 'startgg-caido' }, { status: 502 })

  const orden = [...r.acum.entries()]
    .map(([nombre, a]) => ({ nombre, ...a }))
    .sort((a, b) => b.puntos - a.puntos || a.mejor - b.mejor)
    .slice(0, 20)

  // Rango por letras (E→S+): puntos normalizados contra el líder sobre la
  // escala de rating que ya usa la app (rangoDe en el cliente)
  const max = orden[0]?.puntos || 1
  const jugadores = orden.map(p => ({ ...p, rating: 1500 + Math.round(900 * Math.pow(p.puntos / max, 0.7)) }))

  return NextResponse.json({ juego, ambito, nTorneos: r.nTorneos, dias: 180, actualizado: Date.now(), jugadores })
}
