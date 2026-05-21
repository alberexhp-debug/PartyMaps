-- =============================================
-- MIGRACIÓN 004 — Precio dinámico (Doc4 §6.2)
-- Idempotente.
-- =============================================

-- 1. Columna JSONB con la configuración de precio dinámico
--    Forma: { "activo": bool, "curva": "lineal"|"tramos", "tramos": [{ "pct": int, "precio": number }] }
ALTER TABLE locales  ADD COLUMN IF NOT EXISTS precio_dinamico JSONB;
ALTER TABLE eventos  ADD COLUMN IF NOT EXISTS precio_dinamico JSONB;

-- 2. Promoción de última hora (Doc4 §6.3). Aplica solo a locales.
--    precio_promocional: € a aplicar mientras la promo esté vigente
--    promo_ultima_hora_hasta: timestamp de expiración (máx 4h desde activación)
ALTER TABLE locales ADD COLUMN IF NOT EXISTS precio_promocional NUMERIC(10,2);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS promo_ultima_hora_hasta TIMESTAMPTZ;
