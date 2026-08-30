import { redirect } from 'next/navigation'

// Ruta nocturna retirada en el pivote a Torneum (torneos). Redirige a Explorar.
export default function PlanesPage() {
  redirect('/explorar')
}
