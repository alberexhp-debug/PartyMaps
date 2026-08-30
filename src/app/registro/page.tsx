import { redirect } from 'next/navigation'

// Alta con Supabase de la era Rumbo, retirada (el proyecto ya no existe).
// La entrada a Torneum es /login (cuentas demo por rol).
export default function RegistroPage() {
  redirect('/login')
}
