-- =============================================
-- MIGRACIÓN 051 — Afters: el local admite "after" / abre de madrugada (§3.1)
-- Interruptor para salir en el filtro "Afters" del mapa cuando está abierto de
-- madrugada, aunque su horario sea raro. Idempotente.
-- =============================================
ALTER TABLE locales ADD COLUMN IF NOT EXISTS admite_after BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN locales.admite_after IS 'El local admite after (abre de madrugada): aparece en el filtro Afters del mapa/Explorar.';
