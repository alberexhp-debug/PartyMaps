-- =============================================
-- MIGRACIÓN 049 — "Pedidos": barra + mesas — modelo (Cambio 3 · §4.4-4.7 · PR-1)
-- Convierte el módulo de Barra en Pedidos. Añade el QR por mesa, las sesiones de
-- mesa (sentar walk-in / sentar reserva), el origen del pedido y la prioridad por
-- tipo de zona. Idempotente.
-- =============================================

-- QR propio por mesa (PMM:<token>), regenerable.
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS qr_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mesas_qr_token ON mesas(qr_token) WHERE qr_token IS NOT NULL;

-- Sesión de mesa: se abre al sentar clientes (o al sentar una reserva) y se cierra
-- al liberar. Es la "cuenta" de esa mesa esta noche.
CREATE TABLE IF NOT EXISTS mesa_sesiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  reserva_id UUID REFERENCES reservas(id) ON DELETE SET NULL,
  personas INTEGER NOT NULL DEFAULT 2 CHECK (personas > 0),
  nombre TEXT,
  telefono TEXT,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  abierta_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL,
  abierta_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cerrada_at TIMESTAMPTZ,
  cerrada_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_mesa_sesiones_local ON mesa_sesiones(local_id, abierta_at DESC);
-- Una mesa solo puede tener UNA sesión abierta a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mesa_sesion_abierta ON mesa_sesiones(mesa_id) WHERE cerrada_at IS NULL;

-- Pedido: de barra o de mesa (+ su sesión), y override de prioridad manual.
ALTER TABLE pedidos_bar ADD COLUMN IF NOT EXISTS mesa_sesion_id UUID REFERENCES mesa_sesiones(id) ON DELETE SET NULL;
ALTER TABLE pedidos_bar ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'barra' CHECK (origen IN ('barra', 'mesa'));
ALTER TABLE pedidos_bar ADD COLUMN IF NOT EXISTS priorizado_at TIMESTAMPTZ;
ALTER TABLE pedidos_bar ADD COLUMN IF NOT EXISTS priorizado_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_bar_sesion ON pedidos_bar(mesa_sesion_id) WHERE mesa_sesion_id IS NOT NULL;

-- Prioridad de la cola por tipo de zona (config de 30s, no un motor de reglas).
-- Claves = mesas.tipo (reservado / mesa / barra / otro). Niveles: alta | media | baja.
ALTER TABLE locales ADD COLUMN IF NOT EXISTS prioridad_zonas JSONB NOT NULL
  DEFAULT '{"reservado":"alta","mesa":"media","barra":"media","otro":"media"}'::jsonb;

-- RLS de mesa_sesiones: trabajadores del local leen; la escritura va por endpoints
-- con service_role tras verificar rol (patrón del proyecto).
ALTER TABLE mesa_sesiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trabajadores ven sesiones de su local" ON mesa_sesiones;
CREATE POLICY "Trabajadores ven sesiones de su local" ON mesa_sesiones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = mesa_sesiones.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );

-- Realtime para que la cola de mesas se actualice en vivo entre camareros.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mesa_sesiones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mesa_sesiones;
  END IF;
END $$;
