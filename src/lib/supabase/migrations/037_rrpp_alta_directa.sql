-- =============================================
-- MIGRACIÓN 037 — Alta directa de RRPP (como un empleado)
-- El RRPP se da de alta con cuenta real: entra con NOMBRE DE USUARIO +
-- contraseña + authenticator (TOTP). Por debajo usa un email sintético
-- (usuario@rrpp.rumbomap.com) para Supabase Auth; el email real es de contacto.
-- En el primer acceso cambia la contraseña por defecto y configura el
-- authenticator (igual que el equipo del local, migración 035).
-- Idempotente.
-- =============================================

ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS email_contacto TEXT;
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS totp_activado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN NOT NULL DEFAULT false;

-- Username único en TODA la plataforma (insensible a mayúsculas). Las filas
-- antiguas (RRPP por invitación, sin username) tienen NULL y no estorban.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rrpp_username
  ON rrpp (lower(username)) WHERE username IS NOT NULL;

-- Secreto del authenticator del RRPP. RLS activa SIN policies: solo el
-- service_role lo lee/escribe desde los endpoints (ningún RRPP ve el de otro).
CREATE TABLE IF NOT EXISTS rrpp_totp (
  rrpp_id UUID PRIMARY KEY REFERENCES rrpp(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rrpp_totp ENABLE ROW LEVEL SECURITY;
