import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET /api/startgg/proximos?juego=smash — próximos torneos REALES en España
// (start.gg) para nutrir Explorar mientras el catálogo propio coge densidad.
// Solo lectura, caché 1 h.

const GQL = 'https://api.start.gg/gql/alpha'
const VIDEOGAME_IDS: Record<string, number> = { smash: 1386, sf6: 43868, tekken: 49783 }

const QUERY = `query P($ids: [ID!]) {
  tournaments(query: { perPage: 10, sortBy: "startAt asc", filter: { upcoming: true, countryCode: "ES", videogameIds: $ids } }) {
    nodes { name slug city venueName startAt numAttendees }
  }
}`

export async function GET(req: NextRequest) {
  const juego = req.nextUrl.searchParams.get('juego') ?? ''
  const vid = VIDEOGAME_IDS[juego]
  if (!vid) return NextResponse.json({ error: 'sin-datos' }, { status: 404 })
  const token = process.env.STARTGG_TOKEN
  if (!token) return NextResponse.json({ error: 'sin-token' }, { status: 503 })

  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: QUERY, variables: { ids: [vid] } }),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return NextResponse.json({ error: 'startgg-caido' }, { status: 502 })

  const json = await res.json()
  const nodos: { name: string; slug: string; city: string | null; venueName: string | null; startAt: number | null; numAttendees: number | null }[] =
    json?.data?.tournaments?.nodes ?? []

  const torneos = nodos.map(t => ({
    nombre: t.name,
    url: `https://www.start.gg/${t.slug}`,
    ciudad: t.city ?? '',
    sede: t.venueName ?? '',
    fecha: t.startAt ? t.startAt * 1000 : null,
    asistentes: t.numAttendees ?? 0,
  }))
  return NextResponse.json({ juego, torneos })
}
