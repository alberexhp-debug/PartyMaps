import { redirect } from 'next/navigation'

// QA del rediseño de iconos COMPLETADO (31-08): el barrido global sustituyó
// lucide por el set propio (iconosTorneum + gameGlyphs) en toda la app, así
// que esta galería de comparación ya cumplió su función. Capada como
// /dev-emblemas (reversible; el código de los sets sigue en producción).
export default function DevIconosPage() {
  redirect('/explorar')
}
