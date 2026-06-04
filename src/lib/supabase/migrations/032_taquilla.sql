-- 032: Taquilla / venta en puerta (Box Office).
-- Permite al local vender entradas a walk-ins que pagan en efectivo/datáfono/bizum,
-- sin cuenta de usuario. La entrada nace 'activa' con su QR (PM2:) como cualquier
-- otra, así el scanner la valida igual.
-- Idempotente.

-- El comprador de taquilla es anónimo: usuario_id pasa a ser opcional.
ALTER TABLE entradas ALTER COLUMN usuario_id DROP NOT NULL;

-- Metadatos de la venta en puerta.
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS canal TEXT NOT NULL DEFAULT 'online'
  CHECK (canal IN ('online', 'taquilla'));
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS metodo_pago TEXT;        -- efectivo | datafono | bizum | otro
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS vendido_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS comprador_nombre TEXT;   -- opcional, para el recibo / CRM
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS comprador_telefono TEXT;

CREATE INDEX IF NOT EXISTS idx_entradas_taquilla ON entradas (local_id, created_at) WHERE canal = 'taquilla';

COMMENT ON COLUMN entradas.canal IS 'online (comprada en la app) o taquilla (vendida en puerta por el local)';
COMMENT ON COLUMN entradas.metodo_pago IS 'Solo taquilla: efectivo/datafono/bizum/otro. El dinero lo cobra el local; comisión 0.';
