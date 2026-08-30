import { redirect } from 'next/navigation'

// Detalle de entrada de la era nocturna (consumiciones, QR de barra), retirado.
// La entrada de Torneum es el TicketModal de /entradas (limpieza 30-08).
export default function EntradaDetallePage() {
  redirect('/entradas')
}
