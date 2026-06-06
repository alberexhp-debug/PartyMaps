// Integración con Brevo (doc 02 §10.3). La API key se cifra en reposo (AES-256-GCM con
// una clave derivada de un secreto del servidor) y nunca sale al cliente. La sincronización
// empuja los contactos del segmento como lista de Brevo; las bajas vuelven y apagan el
// consentimiento (la parte que casi todos hacen mal). Server-only.
import crypto from 'node:crypto'

const SECRETO = process.env.CRM_ENCRYPT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'rumbo-dev-key'
const KEY = crypto.createHash('sha256').update(SECRETO).digest() // 32 bytes

export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64')
}

export function descifrar(b64: string): string | null {
  try {
    const buf = Buffer.from(b64, 'base64')
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, buf.subarray(0, 12))
    d.setAuthTag(buf.subarray(12, 28))
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8')
  } catch { return null }
}

const BASE = 'https://api.brevo.com/v3'
const headers = (apiKey: string) => ({ 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' })

/** Valida la API key contra la cuenta de Brevo. */
export async function brevoCuenta(apiKey: string): Promise<{ ok: boolean; email?: string }> {
  try {
    const r = await fetch(`${BASE}/account`, { headers: headers(apiKey) })
    if (!r.ok) return { ok: false }
    const j = await r.json() as { email?: string }
    return { ok: true, email: j.email }
  } catch { return { ok: false } }
}

/** Sincroniza los contactos (por teléfono/SMS) como una lista de Brevo con el nombre del segmento. */
export async function brevoSyncLista(apiKey: string, nombreLista: string, contactos: { tel: string; nombre: string }[]): Promise<{ ok: boolean; importados: number; error?: string }> {
  try {
    // 1) Carpeta (reutiliza la primera o crea "Rumbo").
    let folderId: number | undefined
    const fr = await fetch(`${BASE}/contacts/folders?limit=1`, { headers: headers(apiKey) })
    if (fr.ok) folderId = (await fr.json() as { folders?: { id: number }[] }).folders?.[0]?.id
    if (!folderId) {
      const cf = await fetch(`${BASE}/contacts/folders`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ name: 'Rumbo' }) })
      folderId = cf.ok ? (await cf.json() as { id: number }).id : undefined
    }
    if (!folderId) return { ok: false, importados: 0, error: 'No se pudo crear la carpeta en Brevo' }

    // 2) Lista (crea; si ya existe, la busca por nombre).
    let listId: number | undefined
    const cl = await fetch(`${BASE}/contacts/lists`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ name: nombreLista, folderId }) })
    if (cl.ok) listId = (await cl.json() as { id: number }).id
    else {
      const ls = await fetch(`${BASE}/contacts/lists?limit=50`, { headers: headers(apiKey) })
      if (ls.ok) listId = (await ls.json() as { lists?: { id: number; name: string }[] }).lists?.find(l => l.name === nombreLista)?.id
    }
    if (!listId) return { ok: false, importados: 0, error: 'No se pudo crear la lista en Brevo' }

    // 3) Importa los contactos por SMS.
    const jsonBody = contactos.filter(c => c.tel).map(c => ({ SMS: c.tel, attributes: { NOMBRE: c.nombre } }))
    if (jsonBody.length === 0) return { ok: true, importados: 0 }
    const imp = await fetch(`${BASE}/contacts/import`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ listIds: [listId], updateEnabled: true, jsonBody }) })
    if (!imp.ok) return { ok: false, importados: 0, error: 'Brevo rechazó la importación' }
    return { ok: true, importados: jsonBody.length }
  } catch (e) {
    return { ok: false, importados: 0, error: (e as Error).message }
  }
}
