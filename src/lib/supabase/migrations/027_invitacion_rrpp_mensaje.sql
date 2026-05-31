-- =============================================
-- MIGRACIÓN 027 — Chat local ↔ RRPP
-- Desde el directorio de RRPP públicos, el local puede contactar a un RRPP por
-- chat (y luego invitarlo a ser miembro). Conversación 1-a-1 por (local, rrpp).
-- La visibilidad del RRPP en el directorio ya se controla con
-- rrpp.visible_en_busqueda (migración 020) + /api/rrpp/visibilidad.
-- Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS mensajes_rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  emisor TEXT NOT NULL CHECK (emisor IN ('local', 'rrpp')),
  mensaje TEXT NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_rrpp_hilo ON mensajes_rrpp (local_id, rrpp_id, created_at);

ALTER TABLE mensajes_rrpp ENABLE ROW LEVEL SECURITY;

-- Trabajadores del local ven/escriben en los hilos de su local.
DROP POLICY IF EXISTS "Trabajadores ven chat del local" ON mensajes_rrpp;
CREATE POLICY "Trabajadores ven chat del local" ON mensajes_rrpp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = mensajes_rrpp.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );

-- El RRPP ve/escribe en sus hilos.
DROP POLICY IF EXISTS "RRPP ve su chat" ON mensajes_rrpp;
CREATE POLICY "RRPP ve su chat" ON mensajes_rrpp
  FOR SELECT USING (
    rrpp_id IN (
      SELECT r.id FROM rrpp r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Las escrituras del chat van por endpoints con service_role tras verificar
-- identidad y permiso, así que no añadimos INSERT policies aquí.
