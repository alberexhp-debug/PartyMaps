-- =============================================
-- Migración 014: Campos de configuración nuevos
-- ─────────────────────────────────────────────
-- Añade a locales:
--   instagram_handle           — cuenta IG del local (sin @), para concursos
--   entradas_disponibles_noche — cupo máximo de entradas por noche (null = sin límite)
-- =============================================

ALTER TABLE locales
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS entradas_disponibles_noche INTEGER;

COMMENT ON COLUMN locales.instagram_handle IS
  'Cuenta de Instagram del local, sin @. Ej: kapital_madrid';
COMMENT ON COLUMN locales.entradas_disponibles_noche IS
  'Cupo máximo de entradas que el local quiere vender por noche. NULL = sin límite.';
