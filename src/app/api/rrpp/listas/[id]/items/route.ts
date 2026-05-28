import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'
import { resolverContacto } from '@/lib/rrpp/contactos'

/**
 * GET  /api/rrpp/listas/[id]/items — todos los invitados de la lista
 * POST /api/rrpp/listas/[id]/items { email?, telefono?, nombre? }
 *   Resuelve/crea contacto y lo añade a la lista. Crea binding pendiente
 *   en el local para esa noche.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id: listaId } = await params

  const admin = await createAdminSupabaseClient()
  // verificar ownership
  const { data: lista } = await admin
    .from('lista_rrpp').select('id, rrpp_id, local_id, evento_id')
    .eq('id', listaId).maybeSingle()
  if (!lista || lista.rrpp_id !== ctx.rrpp.id) {
    return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
  }

  const { data: items } = await admin
    .from('lista_rrpp_item')
    .select('*, contactos!inner(id, nombre, email, telefono)')
    .eq('lista_id', listaId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ items: items ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id: listaId } = await params

  const admin = await createAdminSupabaseClient()
  const { data: lista } = await admin
    .from('lista_rrpp').select('id, rrpp_id, local_id, evento_id, activa')
    .eq('id', listaId).maybeSingle()
  if (!lista || lista.rrpp_id !== ctx.rrpp.id || !lista.activa) {
    return NextResponse.json({ error: 'Lista no encontrada o inactiva' }, { status: 404 })
  }

  const body = await req.json().catch(() => null) as Partial<{
    email: string; telefono: string; nombre: string; notas: string;
  }> | null
  if (!body || (!body.email && !body.telefono)) {
    return NextResponse.json({ error: 'email o telefono obligatorio' }, { status: 400 })
  }

  // Resolver contacto
  const contacto = await resolverContacto({
    email: body.email, telefono: body.telefono, nombre: body.nombre,
    primer_rrpp_id: ctx.rrpp.id,
    primer_local_id: lista.local_id,
    fuente_origen: 'lista_rrpp',
  })

  // Insertar item (idempotente: UNIQUE en (lista_id, contacto_id))
  const { data: item, error: errItem } = await admin
    .from('lista_rrpp_item')
    .insert({ lista_id: listaId, contacto_id: contacto.id, notas: body.notas || null })
    .select().single()
  if (errItem) {
    if (errItem.code === '23505') {
      return NextResponse.json({ error: 'Este contacto ya está en la lista' }, { status: 409 })
    }
    return NextResponse.json({ error: errItem.message }, { status: 500 })
  }

  // Crear binding pendiente para esa noche. Expira al final del día del evento.
  const expira = nextDayEndISO()
  await admin.from('binding_rrpp').insert({
    contacto_id: contacto.id,
    rrpp_id: ctx.rrpp.id,
    local_id: lista.local_id,
    evento_id: lista.evento_id,
    estado: 'pendiente',
    mecanismo_creacion: 'lista_rrpp',
    expira_at: expira,
  })

  return NextResponse.json({ item, contacto })
}

function nextDayEndISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(6, 0, 0, 0)  // 6 AM del día siguiente
  return d.toISOString()
}
