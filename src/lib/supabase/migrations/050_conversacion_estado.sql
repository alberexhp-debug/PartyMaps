-- =============================================
-- MIGRACIÓN 050 — Estado por conversación en la bandeja de Mensajes (PR-3 · §1.1)
-- Fijar / silenciar / archivar es POR PERSONA (lo que tú fijas no lo fija el otro).
-- clave = identificador de la conversación tal como la devuelve /api/local-panel/
-- mensajes: 'rrpp:<id>' | 'empleado:<id>' | 'local'. Idempotente.
-- =============================================
CREATE TABLE IF NOT EXISTS conversacion_estado (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_local_id UUID NOT NULL REFERENCES usuario_local(id) ON DELETE CASCADE,
  clave TEXT NOT NULL,
  fijado BOOLEAN NOT NULL DEFAULT false,
  silenciado BOOLEAN NOT NULL DEFAULT false,
  archivado BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_local_id, clave)
);
CREATE INDEX IF NOT EXISTS idx_conversacion_estado_user ON conversacion_estado(usuario_local_id);

-- Lectura/escritura por el endpoint con service_role tras verificar identidad.
ALTER TABLE conversacion_estado ENABLE ROW LEVEL SECURITY;
