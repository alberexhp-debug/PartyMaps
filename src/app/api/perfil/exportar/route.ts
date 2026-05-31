import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/perfil/exportar
 * Derecho de acceso/portabilidad (RGPD): devuelve TODOS los datos del usuario
 * autenticado en un JSON descargable.
 */
export async function GET() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data: usuario } = await db.from('usuarios').select('*').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const uid = usuario.id

  // Cada bloque: tabla + columna que referencia al usuario. Defensivo: si una
  // consulta falla (tabla/col distinta), se omite sin romper el export.
  const bloques: { clave: string; tabla: string; col: string }[] = [
    { clave: 'entradas', tabla: 'entradas', col: 'usuario_id' },
    { clave: 'pedidos_bar', tabla: 'pedidos_bar', col: 'usuario_id' },
    { clave: 'suscripciones', tabla: 'suscripciones', col: 'usuario_id' },
    { clave: 'reviews', tabla: 'reviews', col: 'usuario_id' },
    { clave: 'checkins', tabla: 'checkins', col: 'usuario_id' },
    { clave: 'planes_creados', tabla: 'planes_publicos', col: 'creador_id' },
    { clave: 'participaciones_plan', tabla: 'participantes_plan', col: 'usuario_id' },
    { clave: 'valoraciones_plan', tabla: 'valoraciones_plan', col: 'usuario_id' },
    { clave: 'sugerencias', tabla: 'sugerencias', col: 'usuario_id' },
    { clave: 'rrpp_seguidos', tabla: 'rrpp_seguidor', col: 'usuario_id' },
    { clave: 'codigos_usados', tabla: 'codigo_descuento_uso', col: 'usuario_id' },
    { clave: 'notificaciones', tabla: 'notificaciones_enviadas', col: 'usuario_id' },
  ]

  const datos: Record<string, unknown> = {
    exportado_en: new Date().toISOString(),
    perfil: usuario,
  }

  for (const b of bloques) {
    try {
      const { data, error } = await db.from(b.tabla).select('*').eq(b.col, uid)
      datos[b.clave] = error ? `(no disponible)` : (data ?? [])
    } catch {
      datos[b.clave] = '(no disponible)'
    }
  }

  const json = JSON.stringify(datos, null, 2)
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="mis-datos-rumbo-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
