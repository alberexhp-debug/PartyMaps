-- =============================================
-- Migración 010: Flujo de entrega de premio del concurso (Doc6 §2.6)
-- Idempotente. Añade campos de canje, confirmación del ganador
-- y notas internas del local.
-- =============================================

ALTER TABLE concursos
  ADD COLUMN IF NOT EXISTS premio_codigo TEXT,
  ADD COLUMN IF NOT EXISTS premio_entregado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premio_confirmado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premio_notas TEXT;

CREATE INDEX IF NOT EXISTS idx_concursos_premio_codigo ON concursos(premio_codigo) WHERE premio_codigo IS NOT NULL;

-- Generador simple de código de canje (8 chars uppercase, sin caracteres ambiguos)
CREATE OR REPLACE FUNCTION generar_codigo_premio()
RETURNS TEXT AS $$
DECLARE
  alfabeto TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  resultado TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    resultado := resultado || substr(alfabeto, floor(random() * length(alfabeto) + 1)::int, 1);
  END LOOP;
  RETURN resultado;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Cuando se asigna ganador_participacion_id se genera código si falta.
-- (Trigger antes de UPDATE: si pasa de NULL a no NULL, genera el código.)
CREATE OR REPLACE FUNCTION asignar_codigo_premio()
RETURNS TRIGGER AS $$
DECLARE
  intentos INT := 0;
  candidato TEXT;
BEGIN
  IF NEW.ganador_participacion_id IS NOT NULL
     AND OLD.ganador_participacion_id IS DISTINCT FROM NEW.ganador_participacion_id
     AND NEW.premio_codigo IS NULL THEN
    LOOP
      candidato := generar_codigo_premio();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM concursos WHERE premio_codigo = candidato);
      intentos := intentos + 1;
      EXIT WHEN intentos > 5;
    END LOOP;
    NEW.premio_codigo := candidato;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asignar_codigo_premio ON concursos;
CREATE TRIGGER trg_asignar_codigo_premio
  BEFORE UPDATE ON concursos
  FOR EACH ROW
  EXECUTE FUNCTION asignar_codigo_premio();
