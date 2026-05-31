# Twilio Verify → Supabase Auth (SMS OTP de producción)

> El SMS OTP de Rumbo va a través de Supabase Auth, que delega en un provider externo de SMS. En desarrollo usamos el test phone `+34666000001` con código fijo `123456`. Para producción hay que conectar Twilio Verify.

## 1. Crear cuenta y configurar Verify

1. Crear cuenta en https://twilio.com con la cuenta personal de Albert (luego se traspasa a la empresa).
2. En la consola → **Verify** → **Services** → **Create new**.
3. Friendly name: `Rumbo`.
4. Code length: **6** (lo que usa nuestra UI).
5. Default template language: `es` (español).
6. Activar canal **SMS**. Dejar Email/WhatsApp desactivados de momento.
7. Guardar el **Service SID** (empieza por `VA...`).

## 2. Conseguir credenciales

Desde **Account Dashboard** copia:
- `Account SID` (empieza por `AC...`)
- `Auth Token`
- `Service SID` del paso anterior

## 3. Conectar con Supabase

1. Dashboard de Supabase del proyecto → **Authentication** → **Providers** → **Phone**.
2. Activar **"Enable phone provider"**.
3. SMS provider: **Twilio Verify** (no "Twilio" a secas — la diferencia es que Verify usa el endpoint de canales Twilio que evita problemas de delivery en España).
4. Pegar las 3 credenciales del paso 2.
5. Save.

## 4. Quitar el test phone hardcodeado

Mientras Twilio dev funcionaba con `+34666000001` / `123456`, esos seguirán funcionando aunque actives prod. Para limpiarlos:

1. Dashboard de Supabase → **Authentication** → **Sign In / Up** → **Phone Auth**.
2. Sección **Test OTP**: borrar el par `+34666000001` → `123456`.
3. Save.

## 5. Activar también en cuentas demo del seed

Las 3 cuentas PWA del seed (`+34666000001/2/3`) usan `signInWithPassword` con phone+password gracias al commit `f9e21a1`. Eso no necesita Twilio — siguen entrando sin SMS.

Si quieres que los **registros nuevos** funcionen sin tocar el seed, no hace falta nada más. El usuario crea cuenta nueva → recibe SMS real por Twilio.

## 6. Verificar que funciona

Desde un móvil real (no localhost):

1. `https://party-maps-hojy.vercel.app/login`
2. Introduce un número español (el tuyo).
3. Pulsa "Enviar código SMS".
4. Debe llegar un SMS de Twilio en 5-10s con código de 6 dígitos.
5. Introdúcelo. Debe redirigir a `/explorar`.

Si no llega:
- Logs de Twilio → **Monitor** → **Errors**.
- Logs de Supabase Auth → Dashboard → Logs → Auth.

## 7. Costes esperados

Twilio cobra ~0.05€ por SMS a España (varía por destino). Con 1.000 logins/mes ≈ 50€/mes. Verify además añade ~0.05$ por verificación pero garantiza entrega.

## 8. Migrar a cuenta de empresa

Cuando se cree la cuenta corporate de Twilio:

1. En la cuenta personal → **Console** → **Service Verify** → **Transfer**.
2. O simplemente: crear nueva cuenta empresa, nuevo Service SID, actualizar Supabase con las nuevas credenciales. **El TestKit pre/post migración debe ejecutarse desde un número diferente para confirmar nuevos SIDs antes de borrar los antiguos.**

## 9. Detección runtime desde el código

Rumbo incluye `/api/dev/check-sms-config` (solo admin) que llama a `supabase.auth.signInWithOtp` con un número inválido y reporta si Supabase responde con error de configuración (provider no configurado) o de validación (provider OK). Útil para confirmar el setup desde la UI.
