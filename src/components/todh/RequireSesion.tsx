'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSesionStore, rutaInicial, type RolSesion } from '@/lib/stores/useSesionStore'

// Puerta de sesión por rol: sin sesión → /login (con ?next para volver);
// con sesión de OTRO rol → a su panel. Espera la rehidratación del store
// persistido para no expulsar a un usuario válido en el primer render.
// `rol` admite varios roles: p.ej. la app pública acepta jugador Y local
// (la sede ve fichas de torneo y su panel; sin capa de organizador).
export function RequireSesion({ rol, children }: { rol: RolSesion | RolSesion[]; children: React.ReactNode }) {
  const sesion = useSesionStore(s => s.sesion)
  const router = useRouter()
  const pathname = usePathname()
  const [hidratado, setHidratado] = useState(false)
  useEffect(() => setHidratado(true), [])
  const roles = Array.isArray(rol) ? rol : [rol]
  const admitido = !!sesion && roles.includes(sesion.rol)

  useEffect(() => {
    if (!hidratado) return
    if (!sesion) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    else if (!admitido) router.replace(rutaInicial(sesion))
  }, [hidratado, sesion, admitido, pathname, router])

  if (!hidratado || !admitido) return <div className="min-h-screen" />
  return <>{children}</>
}
