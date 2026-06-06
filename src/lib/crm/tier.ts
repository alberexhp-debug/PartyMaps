// Matriz de capacidades del CRM por tier (doc 02 §8). Helper único reutilizado por la UI
// (candados) y los endpoints (defensa en servidor).
export type CapacidadCRM =
  | 'ver' | 'segmentos' | 'push' | 'export' | 'email' | 'whatsapp_manual'
  | 'whatsapp_api' | 'cortesia_masiva' | 'automatizaciones'

const PRO: CapacidadCRM[] = ['ver', 'segmentos', 'push', 'export', 'email', 'whatsapp_manual']
const MATRIZ: Record<string, CapacidadCRM[]> = {
  visibility: ['ver'],
  basico: ['ver'],
  venta: ['ver'],
  pro: PRO,
  destacado: [...PRO, 'whatsapp_api', 'cortesia_masiva', 'automatizaciones'],
}

export function tierPermite(tier: string | undefined, cap: CapacidadCRM): boolean {
  return (MATRIZ[tier ?? 'visibility'] ?? MATRIZ.visibility).includes(cap)
}
