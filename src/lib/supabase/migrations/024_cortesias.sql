-- =============================================
-- MIGRACIÓN 024 — Cortesías (consumiciones / descuentos / entradas gratis)
-- El DUEÑO configura, por trabajador, qué puede regalar y cuánto al día.
-- Los "niveles" (1/2/3) son presets en la UI; aquí se guardan los permisos
-- efectivos (el dueño puede dar nivel 2 pero quitarle, p.ej., entradas gratis).
-- Gateado por plan/tier en la app (entrada_gratis: solo pro/destacado).
-- Idempotente.
-- =============================================

-- ── Permisos de cortesía por trabajador (en usuario_local) ──────────────
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS nivel_cortesia SMALLINT NOT NULL DEFAULT 0;       -- 0=ninguno, 1/2/3=preset aplicado (solo informativo para la UI)
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS cortesia_consumiciones BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS cortesia_descuentos BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS cortesia_entradas_gratis BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS cortesia_max_dia SMALLINT NOT NULL DEFAULT 0;      -- tope diario total de cortesías; 0 = sin límite

-- ── Cortesías emitidas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cortesias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  -- Trabajador que la emitió
  otorgada_por UUID NOT NULL REFERENCES usuario_local(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('consumicion', 'descuento', 'entrada_gratis')),
  -- Detalle según tipo (todos opcionales salvo descripcion)
  producto_id UUID REFERENCES productos_local(id) ON DELETE SET NULL,  -- consumición concreta
  descripcion TEXT NOT NULL,                                            -- "Copa de bienvenida", "20% en barra"...
  descuento_pct NUMERIC(5,2) CHECK (descuento_pct IS NULL OR (descuento_pct > 0 AND descuento_pct <= 100)),
  -- Beneficiario (puede ser anónimo: el QR basta)
  beneficiario_nombre TEXT,
  beneficiario_telefono TEXT,
  contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL,
  -- Canje por QR
  qr_code TEXT NOT NULL UNIQUE,                                         -- formato PMK:<uuid>
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'canjeada', 'expirada', 'anulada')),
  canjeada_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL,
  canjeada_at TIMESTAMPTZ,
  expira_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cortesias_local ON cortesias (local_id, estado);
CREATE INDEX IF NOT EXISTS idx_cortesias_otorgante ON cortesias (otorgada_por, created_at);
CREATE INDEX IF NOT EXISTS idx_cortesias_qr ON cortesias (qr_code);

-- ── RLS (patrón seguro: email del JWT, sin JOIN a auth.users) ───────────
ALTER TABLE cortesias ENABLE ROW LEVEL SECURITY;

-- Trabajadores del local ven las cortesías de su local
DROP POLICY IF EXISTS "Trabajadores ven cortesias del local" ON cortesias;
CREATE POLICY "Trabajadores ven cortesias del local" ON cortesias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = cortesias.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
    )
  );

-- Trabajadores del local emiten cortesías (la validación de permisos por tipo
-- y de límite diario se hace en el endpoint con service_role).
DROP POLICY IF EXISTS "Trabajadores emiten cortesias" ON cortesias;
CREATE POLICY "Trabajadores emiten cortesias" ON cortesias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = cortesias.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
    )
  );

-- Trabajadores del local actualizan (canjear/anular) cortesías de su local
DROP POLICY IF EXISTS "Trabajadores actualizan cortesias" ON cortesias;
CREATE POLICY "Trabajadores actualizan cortesias" ON cortesias
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = cortesias.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
    )
  );

-- El beneficiario registrado (por contacto) puede ver su cortesía
DROP POLICY IF EXISTS "Beneficiario ve su cortesia" ON cortesias;
CREATE POLICY "Beneficiario ve su cortesia" ON cortesias
  FOR SELECT USING (
    contacto_id IN (
      SELECT c.id FROM contactos c
      JOIN usuarios u ON u.id = c.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
