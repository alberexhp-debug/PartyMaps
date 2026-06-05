'use client'
import { useRouter } from 'next/navigation'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { homeDeRol } from '@/lib/permisosLocal'

/**
 * Hilo del trabajador con su local (el otro lado del chat que abre el dueño
 * desde la ficha de equipo). Reutiliza el componente de chat.
 */
export default function MensajesPage() {
  const router = useRouter()
  const { local, trabajador } = useLocalPanelStore()
  if (!local || !trabajador) return null
  return (
    <ChatRrpp
      titulo={local.nombre}
      subtitulo="Mensajes con tu local"
      getUrl="/api/local-panel/cuenta/chat"
      postUrl="/api/local-panel/cuenta/chat"
      postBody={{}}
      yo="trabajador"
      onClose={() => router.push(`/local-panel/${homeDeRol(trabajador.rol)}`)}
    />
  )
}
