import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { resolverOnboarding, type OnboardingCtx, type PerfilOnboarding } from '@/lib/onboarding/pasos'

const SIN_CHECKLIST = { pasos: [], pct: 100, obligatoriosPendientes: 0 }

/**
 * GET /api/onboarding — checklist de puesta a punto del local activo (dueño/gestor).
 * Calcula el estado con DATOS REALES (no casillas): nunca se desincroniza.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (t.rol !== 'dueno' && t.rol !== 'gestor') return NextResponse.json(SIN_CHECKLIST)

  const perfil = t.rol as PerfilOnboarding
  const db = createServiceRoleClient()
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
