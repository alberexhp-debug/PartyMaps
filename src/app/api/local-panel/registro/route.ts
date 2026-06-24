import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { TipoLocal } from '@/types'

const TIPOS_VALIDOS: TipoLocal[] = ['discoteca', 'bar_copas', 'rooftop', 'sala_conciertos', 'bar_cocteleria', 'otro']
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * POST /api/local-panel/registro
 * Auto-registro de un local desde la web (sin pasar por el Gestor).
 *
 * Por qué en servidor: la RLS de `locales` y `usuario_local` no permite
 * INSERT a usuarios normales, así que estas filas SOLO pueden crearse con
 * service_role. Además creamos la cuenta de auth con `email_confirm: true`
 * para que el alta sea directa, sin correo de confirmación.
 *
 * El local nace en `pendiente_verificacion`: aparece como solicitud en
 * /admin/locales, donde el equipo de TODH lo Verifica o Rechaza.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const nombreResponsable = String(body.nombre_responsable ?? '').trim()
  const nombreLocal = String(body.nombre_local ?? '').trim()
  const tipoLocal = String(body.tipo_local ?? '') as TipoLocal
  const ciudad = String(body.ciudad ?? '').trim() || 'Madrid'
  const direccion = String(body.direccion ?? '').trim()
  const latitud = body.latitud != null ? Number(body.latitud) : NaN
  const longitud = body.longitud != null ? Number(body.longitud) : NaN
  const aforoMaximo = Number(body.aforo_maximo) || 200
  const descripcion = String(body.descripcion ?? '').trim() || null
  const cif = String(body.cif ?? '').trim() || null

  // Validación (espejo de la del cliente, pero la fuente de verdad es esta).
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email no válido' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  if (!nombreResponsable) return NextResponse.json({ error: 'Introduce tu nombre' }, { status: 400 })
  if (!nombreLocal) return NextResponse.json({ error: 'Introduce el nombre del local' }, { status: 400 })
  if (!TIPOS_VALIDOS.includes(tipoLocal)) return NextResponse.json({ error: 'Selecciona el tipo de local' }, { status: 400 })
  if (!direccion) return NextResponse.json({ error: 'Introduce la dirección' }, { status: 400 })
  if (Number.isNaN(latitud) || Number.isNaN(longitud)) {
    return NextResponse.json({ error: 'Falta la ubicación del local' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // 1. Cuenta de acceso ya confirmada (alta directa, sin correo).
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr || !created?.user) {
    const yaExiste = /already.*regist|already been registered|duplicate|exists/i.test(authErr?.message ?? '')
    return NextResponse.json(
      { error: yaExiste ? 'Este email ya está registrado. Inicia sesión o usa otro correo.' : 'No se pudo crear la cuenta' },
      { status: yaExiste ? 409 : 500 },
    )
  }

  // 2. Local en pendiente_verificacion (lo aprobará el admin).
  const { data: local, error: localErr } = await admin
    .from('locales')
    .insert({
      nombre: nombreLocal,
      tipo_local: tipoLocal,
      ciudad,
      direccion,
      latitud,
      longitud,
      aforo_maximo: aforoMaximo,
      descripcion,
      cif,
      musica: [],
      imagenes: [],
      modulos_activos: [],
      consumiciones_bienvenida: [],
      estado: 'pendiente_verificacion',
      tier: 'basico',
      radio_verificacion_metros: 150,
      horario: {},
      num_suscriptores: 0,
      notificaciones_semana_count: 0,
    })
    .select('id')
    .single()

  if (localErr || !local) {
    // Limpieza: si el local falla, no dejamos una cuenta huérfana.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
    return NextResponse.json({ error: `No se pudo registrar el local: ${localErr?.message ?? ''}` }, { status: 500 })
  }

  // 3. Vínculo dueño ↔ local (los trabajadores se resuelven por email).
  const { error: workerErr } = await admin.from('usuario_local').insert({
    usuario_id: null,
    local_id: local.id,
    rol: 'dueno',
    email,
    nombre: nombreResponsable,
    activo: true,
  })

  if (workerErr) {
    return NextResponse.json({ error: 'No se pudo vincular la cuenta con el local' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, local_id: local.id })
}
