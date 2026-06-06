import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const GESTION = ['dueno', 'gestor']

/**
 * POST /api/local-panel/crm/contrato — acepta el contrato de encargo (art. 28 RGPD) con
 * un click-through. Deja quién y cuándo. Solo dueño/gestor.
 */
export async function POST() {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const aceptado_at = new Date().toISOString()
  const { error } = await db.from('locales')
    .update({ crm_contrato_aceptado_at: aceptado_at, crm_contrato_aceptado_por: t.id })
    .eq('id', t.local_id)
  if (error) return NextResponse.json({ error: 'No se pudo registrar (¿migración 044?)' }, { status: 500 })
  return NextResponse.json({ ok: true, crm_contrato_aceptado_at: aceptado_at })
}
