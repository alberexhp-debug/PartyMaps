-- =============================================
-- MIGRACIÓN 047 — Consumiciones DENTRO del QR de la entrada (Taquilla v2 · cambios_070626 §2c)
-- Una entrada puede incluir N consumiciones (0-5) que se canjean en barra una a una,
-- con el CONTADOR en servidor: el saldo (incluidas − canjeadas) vive en la BD, no en el
-- QR → imposible de falsificar. Sustituye a las "cartitas" de papel.
-- Convive con la consumición de bienvenida legacy (entradas.consumicion_id +
-- consumicion_canjeada), que NO se toca. Idempotente.
-- =============================================

-- Contador por entrada.
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS consumiciones_incluidas INT NOT NULL DEFAULT 0;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS consumiciones_canjeadas INT NOT NULL DEFAULT 0;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS consumiciones_descripcion TEXT;  -- "qué incluye" (snapshot): p. ej. "cubata, copa o refresco"

-- Nunca más canjeadas que incluidas, nunca negativas.
DO $$ BEGIN
  ALTER TABLE entradas ADD CONSTRAINT chk_consumiciones_rango
    CHECK (consumiciones_canjeadas >= 0 AND consumiciones_canjeadas <= consumiciones_incluidas);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN entradas.consumiciones_incluidas IS 'Nº de consumiciones que incluye la entrada (0-5). Se canjean en barra con el scanner.';
COMMENT ON COLUMN entradas.consumiciones_canjeadas IS 'Nº ya canjeadas. El saldo vive en servidor (anti-falsificación).';

-- Config a nivel de evento: las compras ONLINE de este evento incluyen estas consumiciones.
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS consumiciones_incluidas INT NOT NULL DEFAULT 0;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS consumiciones_descripcion TEXT;
COMMENT ON COLUMN eventos.consumiciones_incluidas IS 'Consumiciones que se incluyen al comprar entrada online de este evento (0-5).';

-- Auditoría: una fila por cada consumición servida (qué entrada, quién la sirvió, cuándo).
CREATE TABLE IF NOT EXISTS consumicion_canjes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrada_id UUID NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
  canjeado_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consumicion_canjes_entrada ON consumicion_canjes (entrada_id);

-- Solo el servidor (service_role, que salta RLS) escribe/lee los canjes.
ALTER TABLE consumicion_canjes ENABLE ROW LEVEL SECURITY;

-- Canje atómico: bloquea la fila (FOR UPDATE), valida saldo, decrementa y audita en una
-- sola transacción. Dos barmans escaneando a la vez NO pueden canjear la misma consumición.
CREATE OR REPLACE FUNCTION canjear_consumicion(p_entrada_id UUID, p_trabajador UUID)
RETURNS TABLE(ok BOOLEAN, incluidas INT, canjeadas INT, descripcion TEXT, motivo TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_incluidas INT;
  v_canjeadas INT;
  v_desc TEXT;
BEGIN
  SELECT consumiciones_incluidas, consumiciones_canjeadas, consumiciones_descripcion
    INTO v_incluidas, v_canjeadas, v_desc
  FROM entradas WHERE id = p_entrada_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, NULL::TEXT, 'no_encontrada'::TEXT; RETURN;
  END IF;
  IF COALESCE(v_incluidas, 0) = 0 THEN
    RETURN QUERY SELECT false, COALESCE(v_incluidas, 0), COALESCE(v_canjeadas, 0), v_desc, 'sin_consumiciones'::TEXT; RETURN;
  END IF;
  IF v_canjeadas >= v_incluidas THEN
    RETURN QUERY SELECT false, v_incluidas, v_canjeadas, v_desc, 'agotadas'::TEXT; RETURN;
  END IF;

  UPDATE entradas SET consumiciones_canjeadas = consumiciones_canjeadas + 1 WHERE id = p_entrada_id;
  INSERT INTO consumicion_canjes (entrada_id, canjeado_por, descripcion)
  VALUES (p_entrada_id, p_trabajador, v_desc);

  RETURN QUERY SELECT true, v_incluidas, v_canjeadas + 1, v_desc, 'ok'::TEXT;
END;
$$;

-- Solo el servidor (service_role, vía el endpoint /api/local-panel/consumiciones/canjear)
-- puede ejecutarla. Sin esto, un usuario autenticado podría canjear por RPC directo.
REVOKE ALL ON FUNCTION canjear_consumicion(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION canjear_consumicion(UUID, UUID) TO service_role;
