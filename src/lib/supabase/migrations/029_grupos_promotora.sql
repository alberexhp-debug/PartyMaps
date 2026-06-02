-- =============================================
-- MIGRACIÓN 029 — Grupos / Promotoras (multi-local) + Managers
-- Un GRUPO es una empresa/promotora (p.ej. Pachá) que gestiona varios locales.
-- Tiene miembros con dos roles:
--   - propietario: ve y gestiona TODOS los locales del grupo (métricas, equipo).
--   - manager: persona que trabaja para el grupo, con acceso a un SUBCONJUNTO de
--     locales (locales_asignados); enfoque operativo y de métricas, sin facturación.
-- Login propio email+contraseña en /grupo/login (sin TOTP), separado de los demás.
-- Patrón RLS seguro: email del JWT, sin JOIN a auth.users. Idempotente.
--
-- NOTA: en la BD ya existían `grupos` y `grupo_miembros` (vacías) de un diseño
-- previo con ESTAS MISMAS columnas; los CREATE TABLE IF NOT EXISTS son no-op y
-- respetan ese esquema. Lo único que faltaba realmente es `locales.grupo_id`,
-- que añade el ALTER de abajo. Si el CHECK de `rol` difiriera de
-- ('propietario','manager'), ajústalo manualmente.
-- =============================================

CREATE TABLE IF NOT EXISTS grupos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupo_miembros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  rol TEXT NOT NULL DEFAULT 'manager' CHECK (rol IN ('propietario', 'manager')),
  -- Locales que el manager puede ver. NULL = todos los del grupo.
  -- El propietario siempre ve todos, independientemente de este campo.
  locales_asignados UUID[] DEFAULT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ,
  UNIQUE (grupo_id, email)
);
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_email ON grupo_miembros (lower(email));
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_grupo ON grupo_miembros (grupo_id);

-- A qué grupo pertenece cada local (NULL = local independiente).
ALTER TABLE locales ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_locales_grupo ON locales (grupo_id);

-- RLS: el miembro solo lee su(s) propia(s) fila(s) y su grupo. Las operaciones
-- privilegiadas (alta de managers, métricas agregadas) van por endpoints con
-- service_role tras verificar identidad.
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_miembros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Miembro lee su ficha" ON grupo_miembros;
CREATE POLICY "Miembro lee su ficha" ON grupo_miembros
  FOR SELECT USING (lower(trim(email)) = lower(trim(auth.email())));

DROP POLICY IF EXISTS "Miembro lee su grupo" ON grupos;
CREATE POLICY "Miembro lee su grupo" ON grupos
  FOR SELECT USING (
    id IN (
      SELECT gm.grupo_id FROM grupo_miembros gm
      WHERE lower(trim(gm.email)) = lower(trim(auth.email())) AND gm.activo = true
    )
  );
