import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { tierPermite } from '@/lib/crm/tier'
import { cifrar, brevoCuenta } from '@/lib/crm/brevo'

const GESTION = ['dueno', 'gestor']

/** GET — estado de la integración Brevo (sin exponer credenciales). */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const { data } = await db.from('local_integraciones').select('estado, cuenta, ultima_sync').eq('local_id', t.local_id).eq('proveedor', 'brevo').maybeSingle()
  return NextResponse.json({ estado: data?.estado ?? 'desconectada', cuenta: data?.cuenta ?? null, ultima_sync: data?.ultima_sync ?? null })
}

/** POST { apiKey } — valida contra Brevo y guarda la key CIFRADA. Tier Pro+. */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const { data: local } = await db.from('locales').select('tier').eq('id', t.local_id).maybeSingle()
  if (!tierPermite(local?.tier, 'email')) return NextResponse.json({ error: 'Email (Brevo) es una función de Pro' }, { status: 403 })

  const body = await req.json().catch(() => null) as { apiKey?: string } | null
  const apiKey = body?.apiKey?.trim()
  if (!apiKey) return NextResponse.json({ error: 'Falta la API key' }, { status: 400 })

  const cuenta = await brevoCuenta(apiKey)
  if (!cuenta.ok) return NextResponse.json({ error: 'La API key no es válida (Brevo la rechazó)' }, { status: 400 })

  const { error } = await db.from('local_integraciones').upsert({
    local_id: t.local_id, proveedor: 'brevo', credenciales: cifrar(apiKey),
    estado: 'conectada', cuenta: cuenta.email ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'local_id,proveedor' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar (¿migración 045?)' }, { status: 500 })
  return NextResponse.json({ ok: true, estado: 'conectada', cuenta: cuenta.email ?? null })
}

/** DELETE — desconecta (borra la credencial). */
export async function DELETE() {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  await db.from('local_integraciones').update({ estado: 'desconectada', credenciales: null, cuenta: null, updated_at: new Date().toISOString() })
    .eq('local_id', t.local_id).eq('proveedor', 'brevo')
  return NextResponse.json({ ok: true })
}
