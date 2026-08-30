import { redirect } from 'next/navigation'

// Página de la era Rumbo (valorar compañeros de plan), retirada en el pivote.
// Las valoraciones de Torneum viven en /perfil/valoraciones (limpieza 30-08).
export default function ValoracionesPendientesPage() {
  redirect('/perfil/valoraciones')
}
