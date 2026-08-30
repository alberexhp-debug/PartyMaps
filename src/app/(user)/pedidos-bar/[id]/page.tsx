import { redirect } from 'next/navigation'

// Ruta nocturna (pedidos de barra) retirada en el pivote a Torneum. Redirige.
export default function PedidosBarPage() {
  redirect('/entradas')
}
