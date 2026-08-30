import { redirect } from 'next/navigation'

// Paso post-alta de la era Rumbo (Supabase retirado). Entrada: /login.
export default function CompletarPerfilPage() {
  redirect('/login')
}
