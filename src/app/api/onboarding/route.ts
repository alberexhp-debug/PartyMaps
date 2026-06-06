import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal, getRRPPAutenticado } from '@/lib/rrpp/auth'
import { getGestorAutenticado } from '@/lib/gestor/auth'
import { getMiembroGrupoAutenticado } from '@/lib/grupo/auth'
import { resolverOnboarding, type OnboardingCtx, type PerfilOnboarding } from '@/lib/onboarding/pasos'

const SIN_CHECKLIST = { pasos: [], pct: 100, obligatoriosPendientes: 0 }
const NO_AUTH = NextResponse.json({ error: 'No autorizado' }, { status: 401 })

type PasoInline = { id: string; titulo: string; motivo: string; ruta: string; tipo: 'obligatorio' | 'recomendado'; hecho: boolean }
function resumir(pasos: PasoInline[]) {
  const out = pasos.map(p => ({ id: p.id, titulo: p.titulo, motivo: p.motivo, ruta: p.ruta, tipo: p.tipo, estado: p.hecho ? 'hecho' : 'pendiente' }))
  const pct = pasos.length ? Math.round((pasos.filter(p => p.hecho).length / pasos.length) * 100) : 100
  return { pasos: out, pct, obligatoriosPendientes: pasos.filter(p => p.tipo === 'obligatorio' && !p.hecho).length }
}
// Conteo tolerante: si la tabla/columna no existe, cuenta 0 en vez de romper.
const cnt = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then(r => r.count ?? 0, () => 0)

/**
 * GET /api/onboarding?panel=local-panel|rrpp|gestor|grupo — checklist del perfil.
 * Calcula con DATOS REALES (no casillas): nunca se desincroniza.
 */
export async function GET(req: NextRequest) {
  const panel = new URL(req.url).searchParams.get('panel') || 'local-panel'
  const db = createServiceRoleClient()
  if (panel === 'rrpp') return onboardingRrpp(db)
  if (panel === 'gestor') return onboardingGestor(db)
  if (panel === 'grupo') return onboardingGrupo(db)
  return onboardingLocal(db)
}

async function onboardingLocal(db: SupabaseClient) {
  const t = await getTrabajadorLocal()
  if (!t) return NO_AUTH
  if (t.rol !== 'dueno' && t.rol !== 'gestor') return NextResponse.json(SIN_CHECKLIST)
  const perfil = t.rol as PerfilOnboarding
  const localId = t.local_id

  const [localRes, equipo, productos, eventos, mesas, rrpp, est] = await Promise.all([
    db.from('locales').select('nombre, direccion, latitud, longitud, tipo_local, musica, horario, imagenes, aforo_por_dia, aforo_maximo, reservas_activas').eq('id', localId).maybeSingle(),
    db.from('usuario_local').select('id', { count: 'exact', head: true }).eq('local_id', localId),
    db.from('productos_local').select('id', { count: 'exact', head: true }).eq('local_id', localId).eq('disponible', true),
    db.from('eventos').select('id', { count: 'exact', head: true }).eq('local_id', localId).eq('estado', 'publicado'),
    db.from('mesas').select('id', { count: 'exact', head: true }).eq('local_id', localId).eq('activa', true),
    db.from('rrpp_venue').select('id', { count: 'exact', head: true }).eq('local_id', localId).in('estado', ['activa', 'pendiente']),
    db.from('onboarding_estado').select('pasos_visitados').eq('perfil_tipo', perfil).eq('perfil_id', t.id).eq('local_id', localId).maybeSingle(),
  ])

  const ctx: OnboardingCtx = {
    local: localRes.data ?? {},
    equipoCount: equipo.count ?? 0,
    productosActivosCount: productos.count ?? 0,
    eventosPublicadosCount: eventos.count ?? 0,
    mesasCount: mesas.count ?? 0,
    rrppCount: rrpp.count ?? 0,
    pasosVisitados: est.data?.pasos_visitados ?? [],
  }
  return NextResponse.json(resolverOnboarding(perfil, ctx))
}

async function onboardingRrpp(db: SupabaseClient) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NO_AUTH
  const r = ctx.rrpp as { id: string; slug?: string; foto_url?: string | null; bio?: string | null; estado_alta?: string; visible_en_busqueda?: boolean }
  const [relaciones, codigos] = await Promise.all([
    cnt(db.from('rrpp_venue').select('id', { count: 'exact', head: true }).eq('rrpp_id', r.id).in('estado', ['activa', 'pendiente'])),
    cnt(db.from('codigos_descuento').select('id', { count: 'exact', head: true }).eq('rrpp_id', r.id)),
  ])
  return NextResponse.json(resumir([
    { id: 'perfil', titulo: 'Perfil público', motivo: `Tu página /r/${r.slug ?? 'tu-nombre'} es lo que ven los locales y tu gente.`, ruta: '/rrpp', tipo: 'obligatorio', hecho: !!r.foto_url && !!r.bio && !!r.slug && r.estado_alta === 'completo' },
    { id: 'relacion', titulo: 'Primera relación con un local', motivo: 'Sin local no hay comisiones. Acepta una invitación o solicita una.', ruta: '/rrpp/descubrir', tipo: 'obligatorio', hecho: relaciones > 0 },
    { id: 'codigo', titulo: 'Primer código o lista', motivo: 'Es tu herramienta de calle: descuento con tu cara.', ruta: '/rrpp/codigos', tipo: 'recomendado', hecho: codigos > 0 },
    { id: 'visible', titulo: 'Visible en el directorio', motivo: 'Los locales te encuentran y te invitan ellos.', ruta: '/rrpp/descubrir', tipo: 'recomendado', hecho: r.visible_en_busqueda === true },
  ]))
}

async function onboardingGestor(db: SupabaseClient) {
  const ctx = await getGestorAutenticado()
  if (!ctx) return NO_AUTH
  const [locales, rrpps] = await Promise.all([
    cnt(db.from('locales').select('id', { count: 'exact', head: true }).eq('gestor_id', ctx.gestor.id)),
    cnt(db.from('rrpp').select('id', { count: 'exact', head: true }).eq('gestor_id', ctx.gestor.id)),
  ])
  return NextResponse.json(resumir([
    { id: 'local', titulo: 'Tu primer local', motivo: 'Da de alta el primer local de tu cartera.', ruta: '/gestor/locales', tipo: 'obligatorio', hecho: locales > 0 },
    { id: 'rrpp', titulo: 'Tu primer RRPP', motivo: 'Vincula un RRPP para que traiga gente a tus locales.', ruta: '/gestor/rrpp', tipo: 'recomendado', hecho: rrpps > 0 },
  ]))
}

async function onboardingGrupo(db: SupabaseClient) {
  const ctx = await getMiembroGrupoAutenticado()
  if (!ctx) return NO_AUTH
  const [locales, managers] = await Promise.all([
    cnt(db.from('locales').select('id', { count: 'exact', head: true }).eq('grupo_id', ctx.grupo.id)),
    cnt(db.from('grupo_miembros').select('id', { count: 'exact', head: true }).eq('grupo_id', ctx.grupo.id).eq('rol', 'manager')),
  ])
  return NextResponse.json(resumir([
    { id: 'locales', titulo: 'Locales del grupo', motivo: 'Vincula los locales que forman tu grupo.', ruta: '/grupo/locales', tipo: 'obligatorio', hecho: locales > 0 },
    { id: 'managers', titulo: 'Managers y asignaciones', motivo: 'Da acceso a tus managers con los locales que gestionan.', ruta: '/grupo/managers', tipo: 'recomendado', hecho: managers > 0 },
  ]))
}

/**
 * POST /api/onboarding — marca un paso tipo "Revisar" como visitado (p. ej. 'tier'
 * al entrar en Facturación). Body: { paso: string }.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (t.rol !== 'dueno' && t.rol !== 'gestor') return NextResponse.json({ ok: true })

  const body = await req.json().catch(() => null) as { paso?: string } | null
  const paso = body?.paso?.trim()
  if (!paso) return NextResponse.json({ error: 'Falta el paso' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data: existing } = await db.from('onboarding_estado')
    .select('id, pasos_visitados')
    .eq('perfil_tipo', t.rol).eq('perfil_id', t.id).eq('local_id', t.local_id)
    .maybeSingle()

  if (existing) {
    if (!existing.pasos_visitados.includes(paso)) {
      await db.from('onboarding_estado')
        .update({ pasos_visitados: [...existing.pasos_visitados, paso], updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
  } else {
    await db.from('onboarding_estado').insert({
      perfil_tipo: t.rol, perfil_id: t.id, local_id: t.local_id, pasos_visitados: [paso],
    })
  }
  return NextResponse.json({ ok: true })
}
