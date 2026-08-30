import { redirect } from 'next/navigation'

// Onboarding huérfano de la era Rumbo; sus CTAs apuntaban al alta retirada.
// La portada pública de Torneum es /inicio.
export default function BienvenidaPage() {
  redirect('/inicio')
}
