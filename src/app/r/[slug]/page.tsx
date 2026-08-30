import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, CalendarDays } from 'lucide-react'
import type { Metadata } from 'next'

// Página pública del RRPP. Server component — SEO indexable, sin JS de cliente.

type Params = { slug: string }

async function fetchRRPP(slug: string) {
  const admin = await createAdminSupabaseClient()
  const { data: rrpp } = await admin
    .from('rrpp')
    .select('id, slug, nombre_publico, foto_url, bio, instagram, tiktok')
    .eq('slug', slug).eq('activo', true).maybeSingle()
  if (!rrpp) return null

  const { data: venues } = await admin
    .from('rrpp_venue')
    .select(`local_id, locales!inner(id, nombre, foto_url, tier)`)
    .eq('rrpp_id', rrpp.id).eq('estado', 'activa')

  const localIds = (venues ?? []).map(v => v.local_id)
  let eventos: Array<{
    id: string; local_id: string; nombre: string;
    fecha_inicio: string; fecha_fin: string | null;
    foto_url: string | null; precio: number | null;
  }> = []
  if (localIds.length > 0) {
    const ahora = new Date().toISOString()
    const masTreinta = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await admin
      .from('eventos')
      .select('id, local_id, nombre, fecha_inicio, fecha_fin, foto_url, precio')
      .in('local_id', localIds)
      .gte('fecha_inicio', ahora)
      .lte('fecha_inicio', masTreinta)
      .eq('estado', 'publicado')
      .order('fecha_inicio', { ascending: true })
      .limit(20)
    eventos = (data ?? []) as typeof eventos
  }

  const { count: numFollowers } = await admin
    .from('rrpp_seguidor')
    .select('*', { head: true, count: 'exact' })
    .eq('rrpp_id', rrpp.id)

  return { rrpp, venues: venues ?? [], eventos, numFollowers: numFollowers ?? 0 }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchRRPP(slug)
  if (!data) return { title: 'RRPP no encontrado' }
  const { rrpp } = data
  return {
    title: `${rrpp.nombre_publico} — RRPP en Torneum`,
    description: rrpp.bio || `Eventos donde está ${rrpp.nombre_publico} esta semana en Madrid.`,
    openGraph: {
      title: rrpp.nombre_publico,
      description: rrpp.bio || `Eventos de ${rrpp.nombre_publico} en Torneum`,
      images: rrpp.foto_url ? [rrpp.foto_url] : undefined,
    },
  }
}

export default async function PaginaRRPP({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const data = await fetchRRPP(slug)
  if (!data) notFound()
  const { rrpp, venues, eventos, numFollowers } = data

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
        <header className="flex items-center gap-4">
          {rrpp.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rrpp.foto_url} alt={rrpp.nombre_publico}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-rose-400/40" />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-rose-400/20 flex items-center justify-center text-display text-3xl">
              {rrpp.nombre_publico.slice(0, 1)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-display text-3xl sm:text-4xl truncate">{rrpp.nombre_publico}</h1>
            <p className="text-secondary text-sm">@{rrpp.slug}</p>
            <p className="text-tertiary text-xs mt-1">{numFollowers} seguidores</p>
          </div>
        </header>

        {rrpp.bio && (
          <p className="text-secondary text-base leading-relaxed">{rrpp.bio}</p>
        )}

        {(rrpp.instagram || rrpp.tiktok) && (
          <div className="flex gap-2">
            {rrpp.instagram && (
              <a href={`https://instagram.com/${rrpp.instagram}`} target="_blank" rel="noreferrer"
                className="btn-ghost inline-flex items-center gap-1.5 text-sm">
                IG @{rrpp.instagram}
              </a>
            )}
            {rrpp.tiktok && (
              <a href={`https://tiktok.com/@${rrpp.tiktok}`} target="_blank" rel="noreferrer"
                className="btn-ghost inline-flex items-center gap-1.5 text-sm">
                TikTok @{rrpp.tiktok}
              </a>
            )}
          </div>
        )}

        {venues.length > 0 && (
          <section>
            <h2 className="eyebrow eyebrow-rose mb-2">Trabaja en</h2>
            <div className="flex flex-wrap gap-2">
              {venues.map(v => {
                // join con !inner devuelve objeto, no array
                const local = (v.locales as unknown) as { id: string; nombre: string }
                return (
                  <Link key={local.id} href={`/local/${local.id}`}
                    className="card-premium px-3 py-1.5 text-sm inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-300" />
                    {local.nombre}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="eyebrow eyebrow-rose mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Próximos eventos
          </h2>
          {eventos.length === 0 ? (
            <p className="text-tertiary text-sm">No hay eventos publicados todavía.</p>
          ) : (
            <ul className="space-y-3">
              {eventos.map(ev => (
                <li key={ev.id}>
                  <Link href={`/e/${ev.id}?r=${rrpp.slug}`}
                    className="card-premium p-3 flex gap-3 hover:bg-white/[0.03] transition-colors">
                    {ev.foto_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.foto_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-display text-lg truncate">{ev.nombre}</p>
                      <p className="text-secondary text-xs">
                        {new Date(ev.fecha_inicio).toLocaleDateString('es-ES', {
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {ev.precio && (
                        <p className="text-display text-base mt-1">desde {ev.precio}€</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pt-6 border-t border-white/5 text-center">
          <p className="text-tertiary text-xs">
            Comprar por aquí <strong className="text-rose-300">apoya a {rrpp.nombre_publico}</strong> automáticamente.
            <br />Las cifras y comisiones las pactan el RRPP y el local — Torneum solo lo refleja.
          </p>
        </footer>
      </div>
    </div>
  )
}
