# Tests E2E — Rumbo

Smoke tests con Playwright. Comprueban que las pantallas críticas (bienvenida, login PWA, login admin, login local-panel, vista pública de carta, banner cookies) renderizan sin crash.

## Primera vez
```
npm install
npm run test:e2e:install      # descarga el navegador
```

## Correr
```
npm run test:e2e              # headless contra dev server local
npm run test:e2e:ui           # modo interactivo con time-travel
```

## Contra producción
```
PLAYWRIGHT_BASE_URL=https://party-maps-hojy.vercel.app npm run test:e2e
```

## Qué cubren
- bienvenida: el carrusel y los CTAs
- /login PWA: formulario de teléfono
- /admin/login: formulario y campos email/contraseña
- /local-panel/login: campos
- /c/[slug-invalido]: estado vacío de carta no encontrada
- /explorar: shell del mapa sin error 500
- banner de cookies: aparece y desaparece al pulsar "Solo esenciales"

## Qué NO cubren (a propósito)
- Login real (necesita cuentas demo + Supabase env)
- Compra de entrada (necesita pago)
- Scanner QR (necesita cámara)

Si quieres añadir tests con credenciales, usa las cuentas de `~/memory/project_cuentas_demo.md` y mete las variables `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASS`, `E2E_TOTP_SECRET` en un `.env.test.local`.
