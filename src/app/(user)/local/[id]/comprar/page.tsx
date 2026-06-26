import { redirect } from 'next/navigation'

// Compra de entradas de evento nocturno retirada. La inscripción a torneos se hace
// desde la ficha del torneo.
export default function LocalComprarPage() {
  redirect('/explorar')
}
