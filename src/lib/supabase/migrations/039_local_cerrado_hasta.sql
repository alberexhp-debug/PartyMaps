-- =============================================
-- MIGRACIÓN 039 — Cierre puntual "Cerrar esta noche" (PR-2 del mapa estado-apertura)
-- El toggle del dashboard del local escribe aquí "mañana 12:00" (hora Madrid):
-- mientras `cerrado_hasta > now()` el local sale CERRADO en el mapa, sin discusión
-- (la prioridad nº1 del algoritmo `estadoApertura`). Caducado = inactivo, se apaga
-- solo sin cron (autolimpiable).
--
-- IMPORTANTE: `locales.horario` (jsonb) YA EXISTE y se reutiliza tal cual — la
-- lectura "por noches" (si cierre <= apertura cruza la medianoche) es solo de
-- interpretación, NO cambia el formato guardado. Esta migración solo añade la
-- columna `cerrado_hasta`. Idempotente.
-- =============================================

ALTER TABLE locales ADD COLUMN IF NOT EXISTS cerrado_hasta TIMESTAMPTZ;

COMMENT ON COLUMN locales.cerrado_hasta IS
  'Cierre puntual ("Cerrar esta noche"): timestamptz hasta el que el local sale cerrado en el mapa. NULL o < now() = inactivo. Lo escribe el toggle del dashboard con "mañana 12:00".';
