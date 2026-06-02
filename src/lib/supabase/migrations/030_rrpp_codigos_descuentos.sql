-- =============================================
-- MIGRACIÓN 030 — Códigos de RRPP + descuentos por RRPP + solicitudes de interés
--
-- 1) rrpp_venue.descuentos (JSONB): el local/manager fija, por RRPP y por
--    categoría, el % de descuento que aplican sus códigos. Forma:
--      { "entrada": 10, "consumicion": 5, "reservado": 0 }
-- 2) rrpp_codigo: códigos que GENERA el RRPP para un local concreto de su lista.
--    Al crearlo se "congela" el descuento vigente (snapshot en `descuentos`).
-- 3) rrpp_codigo_uso: control de usos (un usuario no reutiliza el mismo código).
-- 4) rrpp_solicitud: el RRPP marca "me interesa trabajar contigo" desde el mapa;
--    el local lo ve en su panel y acepta/rechaza.
--
-- Idempotente: rrpp_venue.descuentos vía ADD COLUMN IF NOT EXISTS; las 3 tablas
-- vía DROP TABLE IF EXISTS + CREATE (se crean desde cero — no existían).
-- =============================================

ALTER TABLE rrpp_venue ADD COLUMN IF NOT EXISTS descuentos JSONB NOT NULL DEFAULT '{}'::jsonb;

DROP TABLE IF EXISTS rrpp_codigo_uso CASCADE;
DROP TABLE IF EXISTS rrpp_codigo CASCADE;
DROP TABLE IF EXISTS rrpp_solicitud CASCADE;

-- Códigos generados por el RRPP para un local de su lista.
CREATE TABLE rrpp_codigo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  usos_max INTEGER,                                 -- null = ilimitado
  usos_actuales INTEGER NOT NULL DEFAULT 0,
  descuentos JSONB NOT NULL DEFAULT '{}'::jsonb,     -- snapshot {entrada,consumicion,reservado}
  activo BOOLEAN NOT NULL DEFAULT true,
  expira_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_rrpp_codigo_unico ON rrpp_codigo (local_id, lower(codigo));
CREATE INDEX idx_rrpp_codigo_rrpp ON rrpp_codigo (rrpp_id);

-- Un usuario no reutiliza el mismo código.
CREATE TABLE rrpp_codigo_uso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_id UUID NOT NULL REFERENCES rrpp_codigo(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  entrada_id UUID,
  descuento_aplicado NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_rrpp_codigo_uso_unico ON rrpp_codigo_uso (codigo_id, usuario_id);

-- Interés del RRPP hacia un local (desde el mapa de descubrimiento).
CREATE TABLE rrpp_solicitud (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  mensaje TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respondido_at TIMESTAMPTZ,
  UNIQUE (rrpp_id, local_id)
);
CREATE INDEX idx_rrpp_solicitud_local ON rrpp_solicitud (local_id, estado);

-- RLS. Las escrituras van por endpoints con service_role (ignora RLS); estas
-- policies son para lecturas directas y blindaje. Patrón seguro: sin JOIN a
-- auth.users.
ALTER TABLE rrpp_codigo ENABLE ROW LEVEL SECURITY;
ALTER TABLE rrpp_codigo_uso ENABLE ROW LEVEL SECURITY;
ALTER TABLE rrpp_solicitud ENABLE ROW LEVEL SECURITY;

-- El RRPP ve sus propios códigos y solicitudes.
DROP POLICY IF EXISTS "RRPP ve sus codigos" ON rrpp_codigo;
CREATE POLICY "RRPP ve sus codigos" ON rrpp_codigo
  FOR SELECT USING (
    rrpp_id IN (SELECT r.id FROM rrpp r JOIN usuarios u ON u.id = r.usuario_id WHERE u.auth_id = auth.uid())
  );
DROP POLICY IF EXISTS "RRPP ve sus solicitudes" ON rrpp_solicitud;
CREATE POLICY "RRPP ve sus solicitudes" ON rrpp_solicitud
  FOR SELECT USING (
    rrpp_id IN (SELECT r.id FROM rrpp r JOIN usuarios u ON u.id = r.usuario_id WHERE u.auth_id = auth.uid())
  );

-- Los trabajadores del local ven los códigos y solicitudes de su local.
DROP POLICY IF EXISTS "Local ve codigos de su local" ON rrpp_codigo;
CREATE POLICY "Local ve codigos de su local" ON rrpp_codigo
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuario_local ul WHERE ul.local_id = rrpp_codigo.local_id
      AND lower(trim(ul.email)) = lower(trim(auth.email())) AND ul.activo = true)
  );
DROP POLICY IF EXISTS "Local ve solicitudes de su local" ON rrpp_solicitud;
CREATE POLICY "Local ve solicitudes de su local" ON rrpp_solicitud
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuario_local ul WHERE ul.local_id = rrpp_solicitud.local_id
      AND lower(trim(ul.email)) = lower(trim(auth.email())) AND ul.activo = true)
  );
