import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const GESTORES = ['dueno', 'gestor']

type Conversacion = {
  clave: string
  tipo: 'rrpp' | 'empleado' | 'local'
  ref_id: string
  nombre: string
  rol_label: string
  ultimo_mensaje: string
  ultimo_at: string | null
  no_leidos: number
}

type FilaRrpp = { rrpp_id: string; emisor: string; mensaje: string; leido: boolean; created_at: string }
type FilaTrab = { trabajador_id: string; emisor: string; mensaje: string; leido: boolean; created_at: string }

/**
 * GET /api/local-panel/mensajes — bandeja unificada del panel del local.
 * AGREGA las conversaciones que ya existen, según el rol:
 *  - dueño/gestor: con sus RRPP (mensajes_rrpp) y con su equipo (mensajes_trabajador).
 *  - puerta/barman (operativos): solo su chat con el local (mensajes_trabajador, su lado).
 * La lectura se unifica aquí; la ESCRITURA sigue en sus endpoints de siempre
 * (rrpp/chat, equipo/chat, cuenta/chat), que es lo que abre la bandeja.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createServiceRoleClient()
  const conversaciones: Conversacion[] = []

  if (GESTORES.includes(t.rol)) {
    // ── RRPP vinculados ──
    const { data: msgsR } = await db.from('mensajes_rrpp')
      .select('rrpp_id, emisor, mensaje, leido, created_at')
      .eq('local_id', t.local_id).order('created_at', { ascending: false }).limit(1000)
    const porRrpp = new Map<string, { ult: FilaRrpp; noLeidos: number }>()
    for (const m of (msgsR ?? []) as FilaRrpp[]) {
      if (!porRrpp.has(m.rrpp_id)) porRrpp.set(m.rrpp_id, { ult: m, noLeidos: 0 })
      if (m.emisor === 'rrpp' && !m.leido) porRrpp.get(m.rrpp_id)!.noLeidos++
    }
    if (porRrpp.size) {
      const { data: rrpps } = await db.from('rrpp').select('id, nombre_publico').in('id', [...porRrpp.keys()])
      const nombres = new Map((rrpps ?? []).map(r => [r.id as string, r.nombre_publico as string]))
      for (const [id, { ult, noLeidos }] of porRrpp) {
        conversaciones.push({
          clave: `rrpp:${id}`, tipo: 'rrpp', ref_id: id,
          nombre: nombres.get(id) || 'RRPP', rol_label: 'RRPP',
          ultimo_mensaje: ult.mensaje, ultimo_at: ult.created_at, no_leidos: noLeidos,
        })
      }
    }

    // ── Equipo del local (excluyéndome a mí mismo) ──
    const { data: msgsT } = await db.from('mensajes_trabajador')
      .select('trabajador_id, emisor, mensaje, leido, created_at')
      .eq('local_id', t.local_id).order('created_at', { ascending: false }).limit(1000)
    const porTrab = new Map<string, { ult: FilaTrab; noLeidos: number }>()
    for (const m of (msgsT ?? []) as FilaTrab[]) {
      if (m.trabajador_id === t.id) continue
      if (!porTrab.has(m.trabajador_id)) porTrab.set(m.trabajador_id, { ult: m, noLeidos: 0 })
      if (m.emisor === 'trabajador' && !m.leido) porTrab.get(m.trabajador_id)!.noLeidos++
    }
    if (porTrab.size) {
      const { data: trabs } = await db.from('usuario_local').select('id, nombre').in('id', [...porTrab.keys()])
      const nombres = new Map((trabs ?? []).map(w => [w.id as string, w.nombre as string]))
      for (const [id, { ult, noLeidos }] of porTrab) {
        conversaciones.push({
          clave: `empleado:${id}`, tipo: 'empleado', ref_id: id,
          nombre: nombres.get(id) || 'Empleado', rol_label: 'Equipo',
          ultimo_mensaje: ult.mensaje, ultimo_at: ult.created_at, no_leidos: noLeidos,
        })
      }
    }
  } else {
    // ── Operativo (puerta/barman): solo su chat con la dirección del local ──
    const { data: msgs } = await db.from('mensajes_trabajador')
      .select('emisor, mensaje, leido, created_at')
      .eq('local_id', t.local_id).eq('trabajador_id', t.id)
      .order('created_at', { ascending: false }).limit(200)
    const filas = (msgs ?? []) as { emisor: string; mensaje: string; leido: boolean; created_at: string }[]
    const noLeidos = filas.filter(m => m.emisor === 'local' && !m.leido).length
    const ult = filas[0]
    const { data: local } = await db.from('locales').select('nombre').eq('id', t.local_id).maybeSingle()
    conversaciones.push({
      clave: 'local', tipo: 'local', ref_id: t.local_id,
      nombre: local?.nombre || 'Tu local', rol_label: 'Dirección',
      ultimo_mensaje: ult?.mensaje || '', ultimo_at: ult?.created_at ?? null, no_leidos: noLeidos,
    })
  }

  // Orden: primero las que tienen no-leídos, luego por fecha del último mensaje (desc).
  conversaciones.sort((a, b) => {
    const ua = a.no_leidos > 0 ? 1 : 0, ub = b.no_leidos > 0 ? 1 : 0
    if (ua !== ub) return ub - ua
    return (b.ultimo_at || '').localeCompare(a.ultimo_at || '')
  })

  const no_leidos_total = conversaciones.reduce((s, c) => s + c.no_leidos, 0)
  return NextResponse.json({ conversaciones, no_leidos_total })
}
