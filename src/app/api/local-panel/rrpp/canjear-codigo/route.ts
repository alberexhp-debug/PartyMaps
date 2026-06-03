import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { sanearDescuentos } from '@/lib/rrppCodigos'

/**
 * POST /api/local-panel/rrpp/canjear-codigo  { codigo }
 * Canje en PUERTA del código/QR que el RRPP generó para una persona.
 * Valida que el código es de ESTE local, está activo, no caducado y tiene cupo;
 * registra un uso (rrpp_codigo_uso + incrementa usos_actuales) y devuelve de
 * quién es y el descuento, para que el portero sepa qué aplicar. El cómputo de
 * comisión por venta sigue en el checkout de entrada / bar.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { codigo?: string } | null
  const codigo = body?.codigo?.trim()
  if (!codigo) return NextResponse.json({ error: 'Código vacío' }, { status: 400 })

  const admin = createServiceRoleClient()
  const { data: c } = await admin
    .from('rrpp_codigo')
    .select('id, rrpp_id, local_id, codigo, etiqueta, usos_max, usos_actuales, descuentos, activo, expira_at')
    .eq('local_id', t.local_id)
    .ilike('codigo', codigo)
    .maybeSingle()

  if (!c) return NextResponse.json({ error: 'Código no encontrado o no es de este local' }, { status: 404 })
  if (!c.activo) return NextResponse.json({ error: 'Código desactivado' }, { status: 409 })
  if (c.expira_at && new Date(c.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Código caducado' }, { status: 409 })
  }
  if (c.usos_max != null && c.usos_actuales >= c.usos_max) {
    return NextResponse.json({ error: 'Código ya canjeado (sin usos disponibles)' }, { status: 409 })
  }

  // Registra el uso de forma segura ante carrera: solo incrementa si sigue
  // habiendo cupo. Si otro escaneo se adelantó, afecta 0 filas → ya canjeado.
  const nuevoUsos = c.usos_actuales + 1
  let upd = admin.from('rrpp_codigo').update({ usos_actuales: nuevoUsos }).eq('id', c.id).eq('usos_actuales', c.usos_actuales)
  if (c.usos_max != null) upd = upd.lt('usos_actuales', c.usos_max)
  const { data: aplicado, error: updErr } = await upd.select('id').maybeSingle()
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  if (!aplicado) return NextResponse.json({ error: 'Código ya canjeado (sin usos disponibles)' }, { status: 409 })

  await admin.from('rrpp_codigo_uso').insert({
    codigo_id: c.id, usuario_id: null, entrada_id: null, descuento_aplicado: 0,
  })

  const { data: rrpp } = await admin.from('rrpp').select('nombre_publico').eq('id', c.rrpp_id).maybeSingle()

  return NextResponse.json({
    ok: true,
    etiqueta: c.etiqueta ?? null,
    rrpp_nombre: rrpp?.nombre_publico ?? 'RRPP',
    descuentos: sanearDescuentos(c.descuentos),
    usos_actuales: nuevoUsos,
    usos_max: c.usos_max,
    agotado: c.usos_max != null && nuevoUsos >= c.usos_max,
  })
}
