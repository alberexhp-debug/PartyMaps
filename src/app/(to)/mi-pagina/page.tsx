'use client'
import { PerfilOrganizador } from '@/components/todh/PerfilOrganizador'
import { useOrgId } from '@/lib/stores/useDemoStore'

// "Mi página pública" del TO, incrustada en el panel (con el rail al lado, como
// el resto de secciones — no se abre como página suelta). Identidad por cuenta:
// cada organizador (Lima, una sede, un aprobado nuevo) ve SU página.
export default function MiPaginaPage() {
  const orgId = useOrgId()
  return <PerfilOrganizador id={orgId} backButton={false} />
}
