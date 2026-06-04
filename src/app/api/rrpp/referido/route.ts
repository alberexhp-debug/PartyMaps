import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/rrpp/referido?codigo=SLUG
 * Valida un código de referido (= slug del RRPP) durante el registro, ANTES de
 * tener sesión. Devuelve el nombre del RRPP si existe, está activo y con perfil
 * completo, para dar feedback ("Te invita Leo") y evitar referidos huérfanos.
 * Público a propósito (no expone nada sensible: solo nombre/foto públicos).
 */
export async function GET(req: NextRequest) {
  const codigo = (new URL(req.url).searchParams.get('codigo') || '').trim()
  if (codigo.length < 2) return NextResponse.json({ valido: false })

  const db = createServiceRoleClient()
  const { data } = await db
    .from('rrpp')
    .select('nombre_publico, foto_url, activo, estado_alta')
    .ilike('slug', codigo)
    .maybeSingle()

  if (!data || !data.activo || data.estado_alta !== 'completo') {
    return NextResponse.json({ valido: false })
  }
  return NextResponse.json({ valido: true, nombre_publico: data.nombre_publico, foto_url: data.foto_url ?? null })
}
