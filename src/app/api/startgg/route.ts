import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { parseStartggSlug, type StartggDatos } from '@/lib/torneos/startgg'

// GET /api/startgg?slug=<url|slug> — espejo de lectura de un torneo de start.gg.
// El token vive SOLO en el servidor (STARTGG_TOKEN en .env.local / Vercel):
// se crea gratis en start.gg → Settings → Developer Settings.
// slug=demo devuelve datos de muestra para enseñar el flujo sin token.

const GQL = 'https://api.start.gg/gql/alpha'
const QUERY = `query T($slug: String!) {
  tournament(slug: $slug) {
    name slug numAttendees startAt
    events {
      name slug numEntrants state
      standings(query: { perPage: 8, page: 1 }) { nodes { placement entrant { name } } }
    }
  }
}`

type EventoGql = {
  name: string; slug: string; numEntrants: number | null; state: string | null
  standings?: { nodes?: { placement: number; entrant: { name: string } | null }[] | null } | null
}

const DEMO: StartggDatos = {
  demo: true,
  nombre: 'Lima Smash Weekly #41', slug: 'demo',
  url: 'https://www.start.gg', asistentes: 64, inicio: null,
  evento: { nombre: 'Ultimate Singles', entrants: 64, estado: 'finalizado' },
  top8: [
    { puesto: 1, nombre: 'Kaze' }, { puesto: 2, nombre: 'Sora' },
    { puesto: 3, nombre: 'Volt' }, { puesto: 4, nombre: 'Zen' },
    { puesto: 5, nombre: 'Drako' }, { puesto: 5, nombre: 'Lux' },
    { puesto: 7, nombre: 'Vega' }, { puesto: 7, nombre: 'Kira' },
  ],
}

export async function GET(req: NextRequest) {
  const bruto = req.nextUrl.searchParams.get('slug') ?? ''
  const parsed = parseStartggSlug(bruto)
  if (!parsed) return NextResponse.json({ error: 'slug-invalido' }, { status: 400 })
  if (parsed.torneo === 'demo') return NextResponse.json(DEMO)

  const token = process.env.STARTGG_TOKEN
  if (!token) return NextResponse.json({ error: 'sin-token' }, { status: 503 })

  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: QUERY, variables: { slug: `tournament/${parsed.torneo}` } }),
    // La clasificación de un torneo en vivo cambia por minutos, no por segundos
    next: { revalidate: 90 },
  })
  if (res.status === 429) return NextResponse.json({ error: 'rate-limit' }, { status: 429 })
  if (!res.ok) return NextResponse.json({ error: 'startgg-caido' }, { status: 502 })

  const json = await res.json()
  const t = json?.data?.tournament
  if (!t) return NextResponse.json({ error: 'no-encontrado' }, { status: 404 })

  // Evento: el pedido en la URL si vino; si no, el más multitudinario
  const eventos: EventoGql[] = t.events ?? []
  const elegido = (parsed.evento && eventos.find(e => e.slug?.endsWith(parsed.evento!)))
    || [...eventos].sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0))[0]

  const estado = elegido?.state === 'ACTIVE' ? 'en-juego' : elegido?.state === 'COMPLETED' ? 'finalizado' : 'inscripciones'
  const datos: StartggDatos = {
    nombre: t.name, slug: t.slug?.replace(/^tournament\//, '') ?? parsed.torneo,
    url: `https://www.start.gg/${t.slug ?? `tournament/${parsed.torneo}`}`,
    asistentes: t.numAttendees ?? elegido?.numEntrants ?? 0,
    inicio: t.startAt ? t.startAt * 1000 : null,
    evento: elegido ? { nombre: elegido.name, entrants: elegido.numEntrants ?? 0, estado } : null,
    top8: (elegido?.standings?.nodes ?? [])
      .filter(n => n?.entrant)
      .map(n => ({ puesto: n.placement, nombre: n.entrant!.name })),
  }
  return NextResponse.json(datos)
}
