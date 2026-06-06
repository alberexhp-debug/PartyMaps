-- =============================================
-- MIGRACIÓN 045 — Integraciones de marketing del local (PR-12, doc 02 §10.1)
-- Brevo en fase 1. La API key se guarda CIFRADA (AES-GCM) en `credenciales`; el endpoint
-- NUNCA la devuelve al cliente. Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS local_integraciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  proveedor TEXT NOT NULL CHECK (proveedor IN ('brevo')),
  credenciales TEXT,                                   -- cifrado, nunca en claro
  estado TEXT NOT NULL DEFAULT 'desconectada' CHECK (estado IN ('conectada', 'desconectada', 'error')),
  cuenta TEXT,                                          -- email de la cuenta Brevo (para mostrar)
  ultima_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (local_id, proveedor)
);
CREATE INDEX IF NOT EXISTS idx_local_integraciones ON local_integraciones (local_id);

ALTER TABLE local_integraciones ENABLE ROW LEVEL SECURITY;
-- Lectura dueño/gestor (el endpoint expone solo estado/cuenta/ultima_sync, jamás credenciales).
-- Escritura: service_role.
DROP POLICY IF EXISTS "Gestores leen integraciones del local" ON local_integraciones;
CREATE POLICY "Gestores leen integraciones del local" ON local_integraciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = local_integraciones.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true AND ul.rol IN ('dueno', 'gestor')
    )
  );
