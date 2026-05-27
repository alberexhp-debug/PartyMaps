-- =============================================
-- Migración 016: Coste de producto (para margen/beneficio)
-- ─────────────────────────────────────────────
-- El dueño puede registrar lo que le cuesta cada producto del bar, para que el
-- panel calcule el beneficio (precio − coste) por unidad vendida.
--   coste: NUMERIC(10,2) NULL = sin coste registrado (no se calcula beneficio).
-- =============================================

ALTER TABLE productos_local
  ADD COLUMN IF NOT EXISTS coste NUMERIC(10, 2) CHECK (coste IS NULL OR coste >= 0);

COMMENT ON COLUMN productos_local.coste IS
  'Coste unitario para el local (€). NULL = sin registrar. Beneficio = precio − coste.';
