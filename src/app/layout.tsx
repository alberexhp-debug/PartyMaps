import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Tourneum — Torneos presenciales de juegos',
  description: 'Organiza y descubre torneos presenciales de videojuegos y cartas. Brackets en vivo, inscripción, ranking y comunidad.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tourneum',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#11141C',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@500;600;700;800&family=Oswald:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        {/* Purga de sesiones ZOMBI de Supabase (Rumbo): el proyecto ya no existe
            y cualquier cookie/token guardado provocaba reintentos de refresh
            contra un host muerto en cada página («la app va super lenta»).
            Corre ANTES de cualquier bundle para que ningún cliente Supabase
            arranque con esa sesión. Quitar cuando exista el Supabase nuevo. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            document.cookie.split(';').forEach(function (c) {
              var n = c.split('=')[0]; if (n) n = n.trim();
              if (n && n.indexOf('sb-') === 0) document.cookie = n + '=; Max-Age=0; path=/';
            });
            Object.keys(localStorage).forEach(function (k) {
              if (k.indexOf('sb-') === 0) localStorage.removeItem(k);
            });
          } catch (e) {}
        ` }} />
        <Providers>{children}</Providers>
        {/* SW sin registrar durante el pivote Tourneum: evita caché vieja de Tourneum
            (el /sw.js es ahora un kill-switch que purga y se desregistra). */}
      </body>
    </html>
  )
}
