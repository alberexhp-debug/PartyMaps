import { redirect } from 'next/navigation'

// Recuperación de clave de la era Rumbo (Supabase retirado). Entrada: /login.
export default function RecuperarClavePage() {
  redirect('/login')
}
