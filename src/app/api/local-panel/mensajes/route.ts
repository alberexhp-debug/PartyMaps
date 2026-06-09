import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const GESTORES = ['dueno', 'gestor']

type Conversacion = {
  clave: string
  tipo: 'rrpp' | 'empleado' | 'local' | 'gestor'
  ref_id: string
  nombre: string
  rol_label: string
  ultimo_mensaje: string
  ultimo_at: string | null
  no_leidos: number
  fijado?: boolean
  silenciado?: boolean
  archivado?: boolean
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
export async function GET(req: NextRequest) {
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

    // ── Mi gestor de Rumbo (si el local tiene gestor asignado) ──
    // Graceful con la 053 pendiente: si mensajes_gestor aún no existe, la
    // conversación aparece igualmente (sin mensajes) para poder iniciarla.
    const { data: localRow } = await db.from('locales').select('gestor_id').eq('id', t.local_id).maybeSingle()
    const gestorId = (localRow?.gestor_id as string | null) || null
    if (gestorId) {
      const { data: g } = await db.from('gestores').select('nombre').eq('id', gestorId).maybeSingle()
      const { data: msgsG } = await db.from('mensajes_gestor')
        .select('emisor, mensaje, leido, created_at')
        .eq('local_id', t.local_id).eq('gestor_id', gestorId)
        .order('created_at', { ascending: false }).limit(500)
      const filasG = (msgsG ?? []) as { emisor: string; mensaje: string; leido: boolean; created_at: string }[]
      const noLeidosG = filasG.filter(m => m.emisor === 'gestor' && !m.leido).length
      const ultG = filasG[0]
      conversaciones.push({
        clave: `gestor:${gestorId}`, tipo: 'gestor', ref_id: gestorId,
        nombre: (g?.nombre as string) || 'Mi gestor', rol_label: 'Mi gestor',
        ultimo_mensaje: ultG?.mensaje || '', ultimo_at: ultG?.created_at ?? null, no_leidos: noLeidosG,
      })
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

  // Estado por conversación (fijar/silenciar/archivar), por trabajador.
  const archivadosView = new URL(req.url).searchParams.get('archivados') === '1'
  const { data: estados } = await db.from('conversacion_estado')
    .select('clave, fijado, silenciado, archivado').eq('usuario_local_id', t.id)
  const estadoPorClave = new Map((estados ?? []).map(e => [e.clave as string, e]))
  for (const c of conversaciones) {
    const e = estadoPorClave.get(c.clave)
    c.fijado = !!e?.fijado; c.silenciado = !!e?.silenciado; c.archivado = !!e?.archivado
  }
  const archivados_count = conversaciones.filter(c => c.archivado).length
  const visibles = conversaciones.filter(c => archivadosView ? c.archivado : !c.archivado)

  // Orden: fijados primero, luego las que tienen no-leídos, luego por fecha.
  visibles.sort((a, b) => {
    if (!!a.fijado !== !!b.fijado) return a.fijado ? -1 : 1
    const ua = a.no_leidos > 0 ? 1 : 0, ub = b.no_leidos > 0 ? 1 : 0
    if (ua !== ub) return ub - ua
    return (b.ultimo_at || '').localeCompare(a.ultimo_at || '')
  })

  // El badge cuenta todo lo no archivado (incl. silenciado); el ping de las
  // silenciadas se omite en cliente con silenciados_match.
  const no_leidos_total = conversaciones.filter(c => !c.archivado).reduce((s, c) => s + c.no_leidos, 0)
  const silenciados_match = conversaciones.filter(c => c.silenciado).map(c => c.ref_id)

  // Soporte (tickets con respuesta sin leer) — solo dueño/gestor; integra el
  // contador del soporte en la bandeja unificada (§1.5).
  let soporte_no_leidos = 0
  if (GESTORES.includes(t.rol)) {
    const { count } = await db.from('tickets_soporte').select('id', { count: 'exact', head: true })
      .eq('local_id', t.local_id).eq('no_leido_local', true)
    soporte_no_leidos = count ?? 0
  }

  return NextResponse.json({ conversaciones: visibles, no_leidos_total, archivados_count, silenciados_match, soporte_no_leidos })
}
