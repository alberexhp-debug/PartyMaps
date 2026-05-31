-- =============================================
-- MIGRACIÓN 026 — Códigos de descuento (pactados por el Gestor con el local)
-- El RumboGestor crea códigos para un local de su cartera; el usuario los
-- aplica en el checkout de entradas. Descuento por % o por importe fijo,
-- con cupo de usos y caducidad opcionales.
-- Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS codigos_descuento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  gestor_id UUID REFERENCES gestores(id) ON DELETE SET NULL,   -- quién lo creó (null si lo crea el propio local en el futuro)
  codigo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'porcentaje' CHECK (tipo IN ('porcentaje', 'importe')),
  valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),             -- % (1-100) o € según tipo
  usos_max INTEGER CHECK (usos_max IS NULL OR usos_max > 0),  -- null = ilimitado
  usos_actuales INTEGER NOT NULL DEFAULT 0,
  expira_at TIMESTAMPTZ,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Código único por local (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_codigo_local ON codigos_descuento (local_id, lower(codigo));
CREATE INDEX IF NOT EXISTS idx_codigos_gestor ON codigos_descuento (gestor_id);

-- Registro de usos (un usuario no puede usar el mismo código dos veces)
CREATE TABLE IF NOT EXISTS codigo_descuento_uso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_id UUID NOT NULL REFERENCES codigos_descuento(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  entrada_id UUID REFERENCES entradas(id) ON DELETE SET NULL,
  descuento_aplicado NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_codigo_uso_usuario ON codigo_descuento_uso (codigo_id, usuario_id);

-- ── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE codigos_descuento ENABLE ROW LEVEL SECURITY;

-- Códigos activos: lectura pública por código (el checkout valida). No expone
-- nada sensible (es un código promocional pensado para compartirse).
DROP POLICY IF EXISTS "Codigos activos legibles" ON codigos_descuento;
CREATE POLICY "Codigos activos legibles" ON codigos_descuento
  FOR SELECT USING (activo = true);

-- El gestor ve/gestiona los códigos de su cartera (su gestor_id).
-- (Las escrituras del panel del Gestor van por service_role tras verificar
--  identidad; esta policy permite además lecturas directas si hicieran falta.)
DROP POLICY IF EXISTS "Gestor ve sus codigos" ON codigos_descuento;
CREATE POLICY "Gestor ve sus codigos" ON codigos_descuento
  FOR SELECT USING (
    gestor_id IN (SELECT id FROM gestores WHERE email = (SELECT auth.jwt() ->> 'email'))
  );

-- Trabajadores del local ven los códigos de su local.
DROP POLICY IF EXISTS "Trabajadores ven codigos del local" ON codigos_descuento;
CREATE POLICY "Trabajadores ven codigos del local" ON codigos_descuento
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = codigos_descuento.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );

ALTER TABLE codigo_descuento_uso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario ve sus usos de codigo" ON codigo_descuento_uso;
CREATE POLICY "Usuario ve sus usos de codigo" ON codigo_descuento_uso
  FOR SELECT USING (usuario_id = mi_usuario_id());
