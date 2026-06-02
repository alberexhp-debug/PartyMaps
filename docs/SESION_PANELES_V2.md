# Sesión Paneles v2 — definición y decisiones

> Trabajo autónomo. Todas las decisiones tomadas bajo criterio propio (el usuario
> delegó: "lo que tú consideres"). Rama `feat/paneles-v2`. Cada bloque se prueba.

## Objetivos
1. **Panel Gestor** → mejorar mucho la visualización.
2. **Panel RRPP** → mejorar mucho la visualización.
3. **Panel Local** → "Recibir soporte" → abrir ticket → gestión de tickets en el
   panel Admin, con acceso del admin a editar la configuración de cualquier local.
4. **Panel Manager** (nuevo) → definir utilidades.
5. **Panel Grupo promotora** (nuevo, tipo Pachá) → gestión y métricas de varios locales.

## Decisiones de arquitectura

### Manager + Grupo se unifican en UN panel `/grupo`
El usuario sugirió que quizá no hacen falta dos paneles. Decisión: **un único
panel de Grupo** (`/grupo`) que cubre ambos casos vía roles:
- **`propietario`** del grupo (la empresa, p.ej. Pachá HQ): ve y gestiona TODOS
  los locales del grupo, métricas agregadas, equipo, sin tope.
- **`manager`**: persona que trabaja para el grupo con acceso a un SUBCONJUNTO de
  locales (`locales_asignados`), enfoque operativo y de métricas, sin facturación
  ni datos sensibles de negocio. Un manager es "alguien que trabaja en uno o varios
  locales del grupo y los supervisa".

Esto evita duplicar superficie/auth y responde a los dos requisitos con un solo
panel role-gated. El "manager" del grupo es distinto del rol local `gestor`
(Encargado de UN local) y del `RumboGestor` (comercial de Rumbo).

### Soporte / Tickets
- Tabla `tickets_soporte` + `ticket_mensajes` (hilo). Migración 028.
- El local abre tickets desde `/local-panel/soporte` (rol dueño/encargado).
- El admin los gestiona en `/admin/soporte`: responder, cambiar estado.
- "Acceso a la config de cualquier local": el admin edita la configuración de
  cualquier local desde `/admin/locales/[id]` (vía endpoints admin con service
  role, no impersonación de sesión — más simple y seguro). Desde un ticket hay
  enlace directo a la ficha del local. La impersonación real de sesión queda
  documentada como evolución futura (requiere generar sesión del dueño).

### Pruebas por panel
- `npx tsc --noEmit` tras cada bloque (gate de tipos; baseline limpio).
- `next build` al final (compila todas las rutas — gate fuerte).
- Smoke con servidor dev: cada ruta nueva responde HTML sin 500.
- Scripts `scripts/verify-028-*.mjs` y `verify-029-*.mjs` para las migraciones
  (se ejecutan contra Supabase real una vez aplicadas en el SQL editor — el
  proyecto aplica DDL manualmente, ver memoria).
- Los endpoints nuevos que dependen de tablas nuevas **degradan con elegancia**
  (try/catch → estado vacío) para no romper antes de aplicar la migración.

## Migraciones nuevas
- **028** — Soporte: `tickets_soporte`, `ticket_mensajes`, RLS por email del local.
  ⚠️ Existían tablas homónimas de un scaffold previo **con otro esquema y vacías**;
  028 las **recrea** (DROP+CREATE seguro al estar a 0 filas). Verificado con
  `scripts/verify-028-soporte.mjs`.
- **029** — Grupos: `grupos`, `grupo_miembros` (rol + locales_asignados),
  `locales.grupo_id`, RLS segura. `grupos`/`grupo_miembros` **ya existían vacías
  con las mismas columnas**; 029 es no-op para ellas y solo añade
  `locales.grupo_id`. Verificado con `scripts/verify-029-grupos.mjs`.

## Resultado (todo verde)
- `npx tsc --noEmit` → 0 errores (tras cada fase).
- `npm run build` (producción) → **EXIT 0**, todas las rutas compilan.
- Smoke dev (puerto 3939): las 13 rutas nuevas/modificadas responden **200** sin
  errores en el log: `/gestor/*`, `/rrpp`, `/local-panel/soporte`,
  `/admin/soporte`, `/admin/locales`, `/grupo`, `/grupo/login`, `/grupo/dashboard`,
  `/grupo/locales`, `/grupo/equipo`.

## Pendiente del usuario (1 paso manual)
Aplicar en el SQL editor de Supabase (idempotentes):
1. `028_soporte_tickets.sql`  → luego `node scripts/verify-028-soporte.mjs` (🟢)
2. `029_grupos_promotora.sql` → luego `node scripts/verify-029-grupos.mjs` (🟢)

Para probar el panel de Grupo end-to-end: crear un `grupos` + un `grupo_miembros`
(rol `propietario`) con un email que tenga cuenta, y poner `grupo_id` a 1-2 locales.

## Evolución futura anotada
- Impersonación real de sesión del local por el admin (hoy edita su config vía
  `/admin/locales/[id]`, que ya existía y es suficiente).
- Notificación push al local cuando soporte responde; al admin en ticket nuevo.
- Permiso `soporte` solo dueño/encargado (ya aplicado en `permisosLocal.ts`).
</content>
