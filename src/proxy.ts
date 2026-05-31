import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy (antes "middleware" en Next < 16).
 * Refresca la sesión de Supabase en CADA petición y reescribe las cookies.
 * Sin esto, cuando el token de acceso caduca el usuario se queda "sin sesión"
 * al refrescar o navegar (era el bug de "te saca de la sesión"). Con @supabase/ssr
 * la sesión vive en cookies y necesita refrescarse en el servidor.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Esta llamada refresca el token si hace falta y dispara setAll (reescribe cookies).
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Se ejecuta en todo salvo estáticos, imágenes y el service worker.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
