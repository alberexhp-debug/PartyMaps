-- =============================================
-- MIGRACIÓN 028 — Soporte: tickets local ↔ admin
-- El local abre tickets de soporte desde /local-panel/soporte. El equipo de
-- Rumbo los gestiona en /admin/soporte: responde y cambia el estado. Hilo de
-- mensajes por ticket. Patrón RLS seguro: email del JWT, sin JOIN a auth.users.
-- Las escrituras van por endpoints con service_role tras verificar identidad.
-- Idempotente.
--
-- NOTA IMPORTANTE: en la BD existían `tickets_soporte` y `ticket_mensajes`
-- de un scaffold anterior NO documentado (otro esquema, 0 filas, sin uso).
-- Como están vacías, las recreamos con el esquema definitivo de este módulo.
-- ⚠️  Si en tu entorno estas tablas tuvieran datos, NO ejecutes los DROP:
--     adapta a ALTER TABLE ADD COLUMN en su lugar.
-- =============================================

DROP TABLE IF EXISTS ticket_mensajes CASCADE;
DROP TABLE IF EXISTS tickets_soporte CASCADE;

CREATE TABLE tickets_soporte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  abierto_por_email TEXT NOT NULL,
  abierto_por_nombre TEXT,
  asunto TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'general'
    CHECK (categoria IN ('general', 'tecnico', 'facturacion', 'cuenta', 'sugerencia', 'otro')),
  prioridad TEXT NOT NULL DEFAULT 'normal'
    CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  estado TEXT NOT NULL DEFAULT 'abierto'
    CHECK (estado IN ('abierto', 'en_curso', 'resuelto', 'cerrado')),
  -- Marcas de "no leído" por lado para resaltar novedades sin tabla de lecturas.
  no_leido_admin BOOLEAN NOT NULL DEFAULT true,   -- novedad del local pendiente para el admin
  no_leido_local BOOLEAN NOT NULL DEFAULT false,  -- respuesta del admin sin leer por el local
  ultimo_mensaje_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tickets_local ON tickets_soporte (local_id, created_at DESC);
CREATE INDEX idx_tickets_estado ON tickets_soporte (estado, ultimo_mensaje_at DESC);

CREATE TABLE ticket_mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets_soporte(id) ON DELETE CASCADE,
  autor TEXT NOT NULL CHECK (autor IN ('local', 'admin')),
  autor_email TEXT,
  autor_nombre TEXT,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ticket_mensajes_hilo ON ticket_mensajes (ticket_id, created_at);

ALTER TABLE tickets_soporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_mensajes ENABLE ROW LEVEL SECURITY;

-- Trabajadores del local ven los tickets de su local (lectura). El admin opera
-- siempre por service_role, que ignora RLS.
DROP POLICY IF EXISTS "Trabajadores ven tickets de su local" ON tickets_soporte;
CREATE POLICY "Trabajadores ven tickets de su local" ON tickets_soporte
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = tickets_soporte.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );

DROP POLICY IF EXISTS "Trabajadores ven mensajes de sus tickets" ON ticket_mensajes;
CREATE POLICY "Trabajadores ven mensajes de sus tickets" ON ticket_mensajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets_soporte t
      JOIN usuario_local ul ON ul.local_id = t.local_id
      WHERE t.id = ticket_mensajes.ticket_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );
