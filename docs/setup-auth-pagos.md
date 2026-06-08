# Puesta en marcha: Google, Correo, SMS y Stripe

> El **código** de los tres métodos de acceso (Google, correo, SMS) ya está
> escrito y auditado. Lo que falta es **configuración en paneles externos**.
> Este documento es el checklist ordenado de lo que tienes que hacer tú.
> Proyecto Supabase: `cyeunxszrivubdexirul`.

---

## 1. Registro con Google  (≈15 min, gratis)

### A) Google Cloud Console — crear credenciales
1. https://console.cloud.google.com → nuevo proyecto "Rumbo".
2. **APIs y servicios → Pantalla de consentimiento OAuth** → tipo *Externo*.
   Rellena nombre de app, correo de soporte y logo.
3. **Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web**.
4. En **URIs de redirección autorizados** pon la URL **de Supabase** (no la tuya):
   `https://cyeunxszrivubdexirul.supabase.co/auth/v1/callback`
5. Copia **Client ID** y **Client Secret**.

### B) Supabase Dashboard
1. Authentication → Providers → **Google** → activar y pegar Client ID + Secret.
2. Authentication → URL Configuration → **Redirect URLs**, añade:
   - `http://localhost:3000/auth/callback`
   - `https://party-maps-hojy.vercel.app/auth/callback`

Hecho esto, "Continuar con Google" funciona. Usuario nuevo → `/completar-perfil`.

---

## 2. Correo de confirmación de registro

Hay **dos sistemas de correo independientes**:
- **Auth** (confirmar registro, recuperar contraseña) → lo manda **Supabase Auth**.
- **Transaccional** (entrada, reembolso…) → `src/lib/email.ts` vía **Resend**. Otro tema.

### Opción rápida para probar YA (gratis)
Supabase → Authentication → Providers → **Email** → desactivar **"Confirm email"**.
El usuario que se registra con correo entra directo a `/completar-perfil`, sin esperar email.
Ideal para los locales pioneros.

### Opción producción (correo de verdad)
Supabase → Authentication → **Emails → SMTP Settings** → activar Custom SMTP con las
credenciales SMTP de **Resend** (o Brevo/Mailgun). Requiere dominio verificado
(p. ej. `rumbomap.com`). El servidor interno de Supabase solo manda ~3-4 correos/hora.

> Caveat PKCE: el enlace de confirmación funciona si se abre en el **mismo
> navegador** donde se hizo el registro. Otro dispositivo = falla la verificación.

---

## 3. SMS con teléfono  (Twilio Verify — cuesta dinero)

Detalle completo en `docs/twilio-setup.md`. Resumen:
1. Twilio → **Verify → Services → Create** (nombre "Rumbo", código 6 dígitos, idioma `es`, canal SMS).
2. Copia `Account SID`, `Auth Token`, `Service SID`.
3. Supabase → Authentication → Providers → **Phone** → activar → proveedor **Twilio Verify** → pegar las 3 credenciales.
4. Para probar sin gastar: deja el **Test OTP** `+34666000001` → `123456`.

Coste real: ~0,05 €/SMS a España. No hay SMS de producción gratis.

---

## 4. Stripe  (lo ÚLTIMO, pero ya respondemos la duda)

- **Modo test**: NO necesitas ser empresa ni verificar identidad. Tarjetas de
  prueba (`4242 4242 4242 4242`), pagos/reembolsos/suscripciones y hasta
  **Stripe Connect** (reparto Rumbo↔local). Gratis e ilimitado.
- **Modo live** (dinero real): te piden identidad y cuenta bancaria. Vale con
  darse de alta como **autónomo**; no hace falta S.L. Se migra a empresa luego.

Regla del proyecto: Stripe se integra al final. Hasta entonces, UI con disclaimer
"Stripe próximamente".

---

## Estado del código (auditado 2026-06-02)
- `src/app/login/page.tsx`, `registro/page.tsx` — botones Google/correo/teléfono OK.
- `src/app/auth/callback/route.ts` — PKCE `exchangeCodeForSession` + cookies OK.
- `src/app/completar-perfil/page.tsx` — insert en `usuarios` OK (Google/correo).
- Cliente `@supabase/ssr` → flujo PKCE por defecto. Nada que tocar en código.
