-- =============================================
-- MIGRACIÓN 040 — Auditoría del cierre puntual "Cerrar esta noche" (PR-6)
-- Quién y cuándo activó el toggle (doc 03 §4.3). Acompaña a locales.cerrado_hasta
-- (migración 039). Independiente: solo añade dos columnas. Idempotente.
-- =============================================

ALTER TABLE locales ADD COLUMN IF NOT EXISTS cerrado_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS cerrado_en TIMESTAMPTZ;

COMMENT ON COLUMN locales.cerrado_por IS 'Trabajador (usuario_local) que activó el último "Cerrar esta noche".';
COMMENT ON COLUMN locales.cerrado_en IS 'Cuándo se activó el último "Cerrar esta noche".';
