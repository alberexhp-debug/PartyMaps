import { redirect } from 'next/navigation'

// Ficha de local nocturno retirada en el pivote a TODH. La sede de torneos se ve
// desde la ficha del torneo. Redirige a Explorar.
export default function LocalPage() {
  redirect('/explorar')
}
