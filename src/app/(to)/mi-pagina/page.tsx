'use client'
import { PerfilOrganizador } from '@/components/todh/PerfilOrganizador'

// "Mi página pública" del TO, incrustada en el panel (con el rail al lado, como
// el resto de secciones — no se abre como página suelta).
export default function MiPaginaPage() {
  return <PerfilOrganizador id="lima" backButton={false} />
}
