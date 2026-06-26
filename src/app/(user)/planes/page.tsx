import { redirect } from 'next/navigation'

// Ruta nocturna retirada en el pivote a TODH (torneos). Redirige a Explorar.
export default function PlanesPage() {
  redirect('/explorar')
}
