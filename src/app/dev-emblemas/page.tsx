import { redirect } from 'next/navigation'

// QA aprobado por Albert 30-08: la galería interna de emblemas de crew queda
// capada. CrewEmblema y crewEmblemGlyphs SIGUEN en uso en la app (no borrar).
export default function DevEmblemasPage() {
  redirect('/perfil/logros')
}
