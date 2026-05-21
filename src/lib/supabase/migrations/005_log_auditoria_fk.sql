-- =============================================
-- MIGRACIÓN 005 — FK e índice para log_auditoria
-- Idempotente.
-- =============================================

-- 1. FK admin_id → administradores.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'log_auditoria_admin_id_fkey'
  ) THEN
    ALTER TABLE log_auditoria
      ADD CONSTRAINT log_auditoria_admin_id_fkey
      FOREIGN KEY (admin_id) REFERENCES administradores(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- 2. RLS: solo el service_role puede escribir/leer.
--    Los admins consultan vía el endpoint /api/admin/auditoria (con service role detrás).
ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS log_auditoria_solo_service ON log_auditoria;
CREATE POLICY log_auditoria_solo_service ON log_auditoria
  FOR ALL USING (false);
