import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'

/**
 * fetch para llamadas del panel del local. Si el servidor responde 401
 * (sesión caducada o de otra identidad: las 4 superficies comparten una sola
 * sesión de Supabase), cierra sesión local y manda a /local-panel/login en vez
 * de dejar al usuario viendo el panel con un "No autorizado" sin salida.
 */
export async function fetchLocal(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401 && typeof window !== 'undefined') {
    try { useLocalPanelStore.getState().logout() } catch {}
    window.location.assign('/local-panel/login')
  }
  return res
}
