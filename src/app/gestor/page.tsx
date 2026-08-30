import { redirect } from 'next/navigation'

// /gestor no tenía página raíz (404): con el panel capado (Albert 30-08), la
// URL a pelo también aterriza en /inicio, como el resto del árbol.
export default function GestorRootPage() {
  redirect('/inicio')
}
