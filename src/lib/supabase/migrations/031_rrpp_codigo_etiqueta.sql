-- 031: códigos de RRPP "por persona".
-- El RRPP genera un código/QR único para UNA persona en un local concreto.
-- Se añade `etiqueta` (nombre/nota de la persona) para que el RRPP identifique
-- de quién es cada código. La caducidad de 24h se gestiona vía `expira_at`
-- (ya existente) que el endpoint fija a created_at + 24h al generar.
-- Idempotente.

ALTER TABLE rrpp_codigo ADD COLUMN IF NOT EXISTS etiqueta TEXT;

COMMENT ON COLUMN rrpp_codigo.etiqueta IS 'Nombre o nota de la persona a la que se le dio el código (opcional).';
