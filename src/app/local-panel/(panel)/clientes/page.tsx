import { redirect } from 'next/navigation'

// La pestaña "Clientes" ahora vive dentro del CRM (doc 02 §14.1). No se rompe ningún enlace.
export default function ClientesRedirect() {
  redirect('/local-panel/crm?tab=clientes')
}
