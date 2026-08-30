import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado, generarPasswordTemporal } from '@/lib/gestor/auth'
import type { TipoLocal } from '@/types'

const TIPOS_VALIDOS: TipoLocal[] = ['discoteca', 'bar_copas', 'rooftop', 'sala_conciertos', 'bar_cocteleria', 'otro']

/**
 * GET /api/gestor/locales
 * Cartera del TorneumGestor autenticado: locales con su gestor_id.
 */
export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: locales, error } = await admin
    .from('locales')
    .select('id, nombre, ciudad, tipo_local, tier, estado, imagenes, aforo_maximo, created_at')
    .eq('gestor_id', ctx.gestor.id)
    .neq('estado', 'eliminado')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ locales: locales ?? [] })
}

/**
 * POST /api/gestor/locales
 * Alta rápida de local en la cartera del gestor. Crea el local en
 * `pendiente_verificacion` y, si se aporta email del dueño, su cuenta de
 * acceso (rol dueno) devolviendo una contraseña temporal de un solo uso
 * para entregar en mano. El dueño completa el resto en su panel.
 */
export async function POST(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const nombre = String(body.nombre ?? '').trim()
  const ciudad = String(body.ciudad ?? '').trim()
  const direccion = String(body.direccion ?? '').trim()
  const tipo_local = String(body.tipo_local ?? '') as TipoLocal
  const aforo_maximo = Number(body.aforo_maximo) || 200
  const latitud = body.latitud != null ? Number(body.latitud) : 40.4168
  const longitud = body.longitud != null ? Number(body.longitud) : -3.7038
  const duenoEmail = String(body.dueno_email ?? '').trim().toLowerCase()
  const duenoNombre = String(body.dueno_nombre ?? '').trim() || 'Dueño'

  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  if (!ciudad) return NextResponse.json({ error: 'La ciudad es obligatoria' }, { status: 400 })
  if (!direccion) return NextResponse.json({ error: 'La dirección es obligatoria' }, { status: 400 })
  if (!TIPOS_VALIDOS.includes(tipo_local)) return NextResponse.json({ error: 'Tipo de local no válido' }, { status: 400 })
  if (duenoEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(duenoEmail)) {
    return NextResponse.json({ error: 'Email del dueño no válido' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // 1. Crear el local en la cartera del gestor (activo, onboarding de confianza).
  const { data: local, error: localErr } = await admin
    .from('locales')
    .insert({
      nombre,
      tipo_local,
      ciudad,
      direccion,
      musica: [],
      latitud,
      longitud,
      radio_verificacion_metros: 500,
      aforo_maximo,
      imagenes: [],
      tier: 'basico',
      modulos_activos: [],
      consumiciones_bienvenida: [],
      horario: {},
      // El Gestor es personal de Torneum (onboarding presencial), así que el
      // local nace ACTIVO y se ve en el mapa al instante. (El auto-registro de
      // un dueño desde la web sí queda pendiente de verificación.)
      estado: 'activo',
      num_suscriptores: 0,
      notificaciones_semana_count: 0,
      gestor_id: ctx.gestor.id,
    })
    .select('id, nombre, ciudad, tipo_local, tier, estado, imagenes, aforo_maximo, created_at')
    .single()

  if (localErr || !local) {
    return NextResponse.json({ error: `No se pudo crear el local: ${localErr?.message}` }, { status: 500 })
  }

  // 2. Cuenta del dueño (opcional). Si falla, el local queda creado igualmente.
  let credenciales: { email: string; password: string } | null = null
  if (duenoEmail) {
    const password = generarPasswordTemporal()
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: duenoEmail,
      password,
      email_confirm: true,
    })

    if (authErr || !created?.user) {
      // El email ya existe o falló: damos de alta el vínculo igualmente y avisamos.
      await admin.from('usuario_local').upsert({
        usuario_id: null,
        local_id: local.id,
        rol: 'dueno',
        email: duenoEmail,
        nombre: duenoNombre,
        activo: true,
      }, { onConflict: 'email,local_id' })
      return NextResponse.json({
        local,
        aviso: 'El local se creó y se vinculó al dueño, pero ese email ya tenía cuenta: usará su contraseña actual.',
      })
    }

    await admin.from('usuario_local').upsert({
      usuario_id: null,
      local_id: local.id,
      rol: 'dueno',
      email: duenoEmail,
      nombre: duenoNombre,
      activo: true,
    }, { onConflict: 'email,local_id' })

    credenciales = { email: duenoEmail, password }
  }

  return NextResponse.json({ local, credenciales })
}
