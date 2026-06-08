import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const CAMPOS = ['fijado', 'silenciado', 'archivado']

/**
 * POST /api/local-panel/mensajes/estado { clave, campo, valor }
 * Fija / silencia / archiva una conversación de la bandeja, por trabajador.
 * Upsert: solo toca el campo indicado; los demás se mantienen.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { clave?: string; campo?: string; valor?: boolean } | null
  if (!body?.clave || !body.campo || !CAMPOS.includes(body.campo)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const db = createServiceRoleClient()
  const { error } = await db.from('conversacion_estado').upsert({
    usuario_local_id: t.id,
    clave: body.clave,
    [body.campo]: !!body.valor,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'usuario_local_id,clave' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
