import { redirect } from 'next/navigation'

// Panel LEGADO de Rumbo, capado entero (decisión Albert 30-08): todo el árbol
// /local-panel/** redirige a /inicio. El código de dentro NO se borra (reversible).
export default function Layout(_props: { children: React.ReactNode }) {
  redirect('/inicio')
}
