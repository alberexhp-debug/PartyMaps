-- =============================================
-- Migración 015: Aforo por día de la semana
-- ─────────────────────────────────────────────
-- El dueño puede prefijar la ocupación que ve la gente ("si está lleno o no")
-- para cada día de la semana, en vez de ajustarla solo en vivo.
--
-- aforo_por_dia: JSONB { lunes, martes, miercoles, jueves, viernes, sabado, domingo }
--   cada valor 0-100 (%). NULL o día ausente = sin preajuste para ese día.
--
-- La ocupación mostrada al usuario se resuelve así (de mayor a menor prioridad):
--   1) override en vivo reciente (aforo_estimado_porcentaje actualizado hoy)
--   2) aforo_por_dia[día actual]
--   3) aforo_estimado_porcentaje
-- =============================================

ALTER TABLE locales
  ADD COLUMN IF NOT EXISTS aforo_por_dia JSONB;

COMMENT ON COLUMN locales.aforo_por_dia IS
  'Perfil semanal de ocupación (%) que ve el usuario. { lunes..domingo: 0-100 }. NULL = sin preajuste.';
