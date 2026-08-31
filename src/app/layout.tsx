import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// Tipografía japonesa (i18n F9): variable font autoalojada por next/font.
// Va SIEMPRE al final de las pilas (globals.css): Inter/Sora/Oswald no tienen
// glifos CJK, así que el latín no cambia y el japonés cae aquí (pesos 100-900,
// bold de headers incluido). preload:false — los glifos JP se sirven por
// unicode-range y solo se descargan cuando el idioma es ja.
const notoJP = Noto_Sans_JP({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-jp',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Torneum — Torneos presenciales de juegos',
  description: 'Organiza y descubre torneos presenciales de videojuegos y cartas. Brackets en vivo, inscripción, ranking y comunidad.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Torneum',
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
    <html lang="es" className={notoJP.variable}>
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
        {/* Purga de sesiones ZOMBI de Supabase del proyecto MUERTO de Rumbo
            (cyeunxszrivubdexirul): cualquier token suyo provocaba reintentos de
            refresh contra un host inexistente en cada página («la app va super
            lenta»). SOLO purga las claves de ese proyecto: las sesiones del
            Supabase NUEVO de Torneum (fase A del backend, 31-08) se respetan. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var MUERTO = 'sb-cyeunxszrivubdexirul';
            document.cookie.split(';').forEach(function (c) {
              var n = c.split('=')[0]; if (n) n = n.trim();
              if (n && n.indexOf(MUERTO) === 0) document.cookie = n + '=; Max-Age=0; path=/';
            });
            Object.keys(localStorage).forEach(function (k) {
              if (k.indexOf(MUERTO) === 0) localStorage.removeItem(k);
            });
          } catch (e) {}
        ` }} />
        <Providers>{children}</Providers>
        {/* SW v2 mínimo (sin caché): hace la app instalable y prepara las push.
            El kill-switch anterior ya curó a los navegadores con el SW de Rumbo. */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}) });
          }
        ` }} />
      </body>
    </html>
  )
}
