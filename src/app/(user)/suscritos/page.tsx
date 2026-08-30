import { redirect } from 'next/navigation'

// Ruta nocturna retirada en el pivote a Torneum. Los "seguidos" viven en el perfil.
export default function SuscritosPage() {
  redirect('/explorar')
}
