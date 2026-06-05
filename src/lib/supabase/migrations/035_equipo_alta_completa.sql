-- =============================================
-- MIGRACIÓN 035 — Alta real de equipo del local
-- El dueño/gestor da de alta trabajadores con cuenta real: entran con
-- NOMBRE DE USUARIO + contraseña + authenticator (TOTP). No necesitan correo
-- propio: por debajo se usa un email sintético (usuario@trabajadores.rumbomap.com)
-- para Supabase Auth, y el email real queda como dato de contacto opcional.
--
-- Incluye:
--   1. Campos de ficha en usuario_local (username, datos de contacto, flags 2FA).
--   2. Tabla trabajador_totp: el secreto del authenticator, SOLO accesible por
--      el service_role (RLS activa sin policies) — ningún trabajador puede leer
--      el secreto de otro.
--   3. Tabla mensajes_trabajador: chat 1-a-1 dueño/gestor ↔ trabajador.
-- Idempotente.
-- =============================================

-- 1) Ficha del trabajador ---------------------------------------------------
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS email_contacto TEXT;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS fecha_alta DATE DEFAULT CURRENT_DATE;
-- Vínculo con auth.users (para resetear contraseña sin buscar por email).
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS auth_id UUID;
-- Estado del authenticator y del primer acceso.
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS totp_activado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN NOT NULL DEFAULT false;

-- El nombre de usuario es único en TODA la plataforma (insensible a mayúsculas).
-- Parcial: las filas antiguas (dueños por email) tienen username NULL y no estorban.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_local_username
  ON usuario_local (lower(username)) WHERE username IS NOT NULL;

-- 2) Secreto del authenticator (solo servidor) ------------------------------
CREATE TABLE IF NOT EXISTS trabajador_totp (
  usuario_local_id UUID PRIMARY KEY REFERENCES usuario_local(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS activa SIN policies: anon/authenticated no ven nada; solo el service_role
-- (que ignora RLS) lee/escribe el secreto desde los endpoints. Así un trabajador
-- nunca puede leer el secreto de otro vía PostgREST.
ALTER TABLE trabajador_totp ENABLE ROW LEVEL SECURITY;

-- 3) Chat dueño/gestor ↔ trabajador -----------------------------------------
CREATE TABLE IF NOT EXISTS mensajes_trabajador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  trabajador_id UUID NOT NULL REFERENCES usuario_local(id) ON DELETE CASCADE,
  emisor TEXT NOT NULL CHECK (emisor IN ('local', 'trabajador')),
  mensaje TEXT NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_trabajador_hilo
  ON mensajes_trabajador (local_id, trabajador_id, created_at);

ALTER TABLE mensajes_trabajador ENABLE ROW LEVEL SECURITY;

-- Dueño/gestor del local ven los hilos de su local.
-- (Se compara por email del JWT; nunca se toca auth.users en la policy.)
DROP POLICY IF EXISTS "Gestores ven chat de equipo" ON mensajes_trabajador;
CREATE POLICY "Gestores ven chat de equipo" ON mensajes_trabajador
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = mensajes_trabajador.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- El propio trabajador ve su hilo.
DROP POLICY IF EXISTS "Trabajador ve su chat" ON mensajes_trabajador;
CREATE POLICY "Trabajador ve su chat" ON mensajes_trabajador
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.id = mensajes_trabajador.trabajador_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );

-- Las escrituras del chat van por endpoints con service_role tras verificar
-- identidad y permiso, así que no añadimos INSERT policies aquí (igual que 027).
