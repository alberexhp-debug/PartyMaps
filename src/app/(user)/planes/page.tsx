import { redirect } from 'next/navigation'

// Ruta nocturna retirada en el pivote a Tourneum (torneos). Redirige a Explorar.
export default function PlanesPage() {
  redirect('/explorar')
}
