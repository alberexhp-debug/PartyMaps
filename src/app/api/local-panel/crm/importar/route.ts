import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { tierPermite } from '@/lib/crm/tier'
import { registrarConsentimiento } from '@/lib/consentimiento'

const GESTION = ['dueno', 'gestor']
type Fila = { nombre?: string; telefono?: string; email?: string }

/**
 * POST /api/local-panel/crm/importar — importa la clientela previa del local (doc 02 §5.3).
 * Requiere declaración responsable. Tier Pro + contrato. Reglas duras:
 *  - el teléfono es la llave: si ya hay usuario con ese tel, se ata a su ficha;
 *  - si esa identidad ya dijo "no" a este local, el NO gana (no se resucita);
 *  - origen del consentimiento = 'importado_declarado' (distinto del captado por Torneum).
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const { data: local } = await db.from('locales').select('tier, crm_contrato_aceptado_at').eq('id', t.local_id).maybeSingle()
  if (!tierPermite(local?.tier, 'segmentos')) return NextResponse.json({ error: 'Importar clientela es una función de Pro' }, { status: 403 })
  if (!local?.crm_contrato_aceptado_at) return NextResponse.json({ error: 'Acepta el contrato de encargo antes de importar' }, { status: 403 })

  const body = await req.json().catch(() => null) as { filas?: Fila[]; declaracion?: boolean } | null
  if (!body?.declaracion) return NextResponse.json({ error: 'Debes aceptar la declaración responsable' }, { status: 400 })
  const filas = (body.filas ?? []).slice(0, 5000)

  const localId = t.local_id
  let importados = 0, omitidos = 0, sinTelefono = 0

  // Vigente actual de una identidad para este local (para respetar un "no" previo).
  const vigente = async (col: 'usuario_id' | 'contacto_id', id: string) =>
    (await db.from('consentimientos_marketing').select('estado').eq(col, id).eq('local_id', localId).order('created_at', { ascending: false }).limit(1).maybeSingle()).data?.estado

  for (const f of filas) {
    const tel = (f.telefono ?? '').replace(/\s+/g, '').trim()
    if (!tel) { sinTelefono++; continue }
    const nombre = (f.nombre ?? '').trim() || 'Importado'
    const email = (f.email ?? '').trim() || null

    // 1) ¿usuario registrado con ese teléfono?
    const { data: usuario } = await db.from('usuarios').select('id').eq('telefono', tel).maybeSingle()
    let ident: { usuario_id?: string; contacto_id?: string }
    if (usuario) {
      ident = { usuario_id: usuario.id }
    } else {
      // 2) contacto por teléfono (crea si no existe) con origen 'importado'.
      const { data: existente } = await db.from('contactos').select('id').eq('telefono', tel).maybeSingle()
      if (existente) {
        ident = { contacto_id: existente.id }
      } else {
        const { data: nuevo, error } = await db.from('contactos').insert({
          telefono: tel, nombre, email, primer_local_id: localId, fuente_origen: 'importado',
        }).select('id').single()
        if (error || !nuevo) { omitidos++; continue }
        ident = { contacto_id: nuevo.id }
      }
    }

    // 3) Si ya dijo "no" a este local, el NO gana (la importación nunca resucita un rechazo).
    const col = ident.usuario_id ? 'usuario_id' : 'contacto_id'
    const id = ident.usuario_id ?? ident.contacto_id!
    if ((await vigente(col, id)) === 'retira') { omitidos++; continue }

    try {
      await registrarConsentimiento(db, { ...ident, local_id: localId, estado: 'acepta', origen: 'importado_declarado' })
      importados++
    } catch { omitidos++ }
  }

  return NextResponse.json({ ok: true, importados, omitidos, sinTelefono, total: filas.length })
}
