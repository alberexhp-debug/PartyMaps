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

// Notas duras aprendidas de la API:
// - events(filter:{videogameId}) es OBLIGATORIO: sin él, torneos multi-evento
//   disparan el límite de 1000 objetos y la respuesta trae `errors` sin datos.
// - sortBy también: la consulta global sin orden explícito tarda >30 s y muere.
// - No hay orden por tamaño ni filtro de aforo mínimo; para un Mundial digno
//   se usa isFeatured (majors) y, si el juego no tiene destacados, recientes.
type Alcance = { pais?: boolean; featured?: boolean; dias: number; perPage: number }
const QUERY = (a: Alcance) => `query R($after: Timestamp!, $ids: [ID!]) {
  tournaments(query: { perPage: ${a.perPage}, sortBy: "endAt desc", filter: { past: true, ${a.pais ? 'countryCode: "ES",' : ''} ${a.featured ? 'isFeatured: true,' : ''} videogameIds: $ids, afterDate: $after } }) {
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

async function agrega(token: string, vid: number, alcance: Alcance) {
  const after = Math.floor(Date.now() / 1000) - alcance.dias * 86400
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: QUERY(alcance), variables: { after, ids: [vid] } }),
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

  // Ámbito explícito (?ambito=es|global), como en start.gg.
  // - España: toda la escena de los últimos 180 días.
  // - Mundial: majors destacados (isFeatured) de 90 días; si el juego no tiene
  //   destacados (TFT/Valorant/LoL/Pokémon), los recientes de 30 días.
  const pedido = req.nextUrl.searchParams.get('ambito')
  const ambito: 'es' | 'global' = pedido === 'global' ? 'global' : 'es'
  let dias = 180
  let r: Awaited<ReturnType<typeof agrega>> = null
  if (ambito === 'es') {
    r = await agrega(token, vid, { pais: true, dias: 180, perPage: 20 })
  } else {
    dias = 90
    r = await agrega(token, vid, { featured: true, dias: 90, perPage: 16 })
    if (!r || r.nTorneos < 4) {
      // Juegos sin majors destacados (TFT, Valorant, LoL…): recientes con
      // ventana ancha, que su volumen en start.gg es bajo
      const b = await agrega(token, vid, { dias: 120, perPage: 20 })
      if (b && b.acum.size > (r?.acum.size ?? 0)) { r = b; dias = 120 }
    }
    if (!r || r.nTorneos < 2) {
      // Último peldaño (escenas mínimas): un año entero
      const c = await agrega(token, vid, { dias: 365, perPage: 20 })
      if (c && c.acum.size > (r?.acum.size ?? 0)) { r = c; dias = 365 }
    }
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

  return NextResponse.json({ juego, ambito, nTorneos: r.nTorneos, dias, actualizado: Date.now(), jugadores })
}
