/**
 * Moderación automática de imágenes con Sightengine.
 * Si SIGHTENGINE_USER / SIGHTENGINE_SECRET no están definidos, todas las imágenes
 * se aprueban automáticamente y se delega a la moderación manual (cola en /admin/moderacion).
 *
 * Modelos consultados: nudity-2.0, weapons, alcohol, drugs, offensive (logos no es necesario).
 * Umbral por defecto 0.6 — ajustable por env SIGHTENGINE_UMBRAL.
 */

interface ResultadoModeracion {
  aprobada: boolean
  motivo?: string
  detalles?: Record<string, number>
  skipped?: boolean
}

interface SightengineResponse {
  status: 'success' | 'failure'
  nudity?: { sexual_activity?: number; sexual_display?: number; erotica?: number; suggestive?: number }
  weapon?: number | { classes?: Record<string, number> }
  alcohol?: number
  drugs?: number
  offensive?: { prob?: number }
  error?: { message?: string }
}

const UMBRAL = Number(process.env.SIGHTENGINE_UMBRAL || '0.6')

export async function moderarImagen(imageUrl: string): Promise<ResultadoModeracion> {
  const user = process.env.SIGHTENGINE_USER
  const secret = process.env.SIGHTENGINE_SECRET
  if (!user || !secret) {
    if (process.env.NODE_ENV !== 'production') console.log('[moderacion-imagen] skipped (no Sightengine creds):', imageUrl)
    return { aprobada: true, skipped: true }
  }

  try {
    const params = new URLSearchParams({
      url: imageUrl,
      models: 'nudity-2.0,weapon,alcohol,drugs,offensive',
      api_user: user,
      api_secret: secret,
    })

    const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`, {
      method: 'GET',
      // Sightengine recomienda no más de 5s en producción para no bloquear UX
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') console.error('[moderacion-imagen] http', res.status)
      return { aprobada: true, skipped: true, motivo: 'API no disponible (se aprueba; pasa a manual)' }
    }

    const j: SightengineResponse = await res.json()
    if (j.status !== 'success') {
      return { aprobada: true, skipped: true, motivo: j.error?.message }
    }

    const detalles: Record<string, number> = {}

    const sexual = Math.max(
      j.nudity?.sexual_activity ?? 0,
      j.nudity?.sexual_display ?? 0,
      j.nudity?.erotica ?? 0,
    )
    detalles.contenido_sexual = sexual

    const armas = typeof j.weapon === 'number' ? j.weapon : 0
    detalles.armas = armas

    const drogas = j.drugs ?? 0
    detalles.drogas = drogas

    const ofensivo = j.offensive?.prob ?? 0
    detalles.ofensivo = ofensivo

    const motivos: string[] = []
    if (sexual > UMBRAL) motivos.push('contenido sexual')
    if (armas > UMBRAL) motivos.push('armas')
    if (drogas > UMBRAL) motivos.push('drogas')
    if (ofensivo > UMBRAL) motivos.push('contenido ofensivo')

    if (motivos.length > 0) {
      return { aprobada: false, motivo: motivos.join(', '), detalles }
    }
    return { aprobada: true, detalles }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('[moderacion-imagen] exception', e)
    // Falla abierta: en caso de error, se aprueba y queda para moderación manual
    return { aprobada: true, skipped: true, motivo: 'Error API; pasa a manual' }
  }
}
