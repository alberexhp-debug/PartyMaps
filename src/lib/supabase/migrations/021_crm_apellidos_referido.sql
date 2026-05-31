-- =============================================
-- MIGRACIÓN 021 — Campos CRM en usuarios
-- Apellidos + código de referido (RRPP) para atribución.
-- Idempotente.
-- =============================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellidos TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_codigo TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_at TIMESTAMPTZ;

-- Para buscar rápido las captaciones de un RRPP por su código.
CREATE INDEX IF NOT EXISTS idx_usuarios_referido_codigo ON usuarios(referido_codigo);

-- NOTA: la atribución real de comisiones (ventana de 24h sobre entradas/consumiciones)
-- se implementará con el panel de RRPP. De momento solo capturamos el código y el momento.
