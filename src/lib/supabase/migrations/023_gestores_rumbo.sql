-- =============================================
-- MIGRACIÓN 023 — RumboGestor (gestores de Rumbo) + login propio
-- El Gestor de Rumbo (TuMorenitoBoss) da de alta locales y RRPP.
-- Cobra un % de lo que genera su cartera (incentivo_pct).
-- Login propio email+contraseña (sin TOTP), separado del admin.
-- Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS gestores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  incentivo_pct FLOAT NOT NULL DEFAULT 0,   -- % de lo que genera su cartera (su cobro)
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_gestores_email ON gestores(email);

-- Qué gestor lleva cada local (su cartera). Null = sin asignar.
ALTER TABLE locales ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES gestores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_locales_gestor ON locales(gestor_id);

-- RLS: el gestor solo puede leer su propia ficha (patrón seguro: sin JOIN a auth.users).
ALTER TABLE gestores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestor lee su propio perfil" ON gestores;
CREATE POLICY "Gestor lee su propio perfil" ON gestores
  FOR SELECT USING (email = (SELECT auth.jwt() ->> 'email'));
