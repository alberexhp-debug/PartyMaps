import { NextRequest, NextResponse } from 'next/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'
import { resolverContacto } from '@/lib/rrpp/contactos'

/**
 * POST /api/rrpp/contactos/resolve
 * Busca o crea un contacto con los datos recibidos. Lo usa el RRPP cuando
 * añade gente a su lista por teléfono/email/nombre.
 * Body: { email?, telefono?, nombre?, local_id }
 */
export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as Partial<{
    email: string; telefono: string; nombre: string; local_id: string
  }> | null
  if (!body || (!body.email && !body.telefono)) {
    return NextResponse.json({ error: 'email o telefono obligatorio' }, { status: 400 })
  }
  try {
    const contacto = await resolverContacto({
      email: body.email, telefono: body.telefono, nombre: body.nombre,
      primer_rrpp_id: ctx.rrpp.id,
      primer_local_id: body.local_id,
      fuente_origen: 'lista_rrpp',
    })
    return NextResponse.json({ contacto })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
