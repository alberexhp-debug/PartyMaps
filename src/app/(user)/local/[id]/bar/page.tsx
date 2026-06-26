import { redirect } from 'next/navigation'

// Carta de bar retirada en el pivote a TODH (no hay barra en torneos).
export default function LocalBarPage() {
  redirect('/explorar')
}
