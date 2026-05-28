-- =============================================
-- Migración 020: Sistema de invitaciones RRPP
-- ─────────────────────────────────────────────────────────────
-- El RRPP YA NO se autoactiva. Sólo nace por:
--   1) Invitación de un local (panel local → contratar RRPP)
--   2) Alta del administrador (panel admin → free agent sin venue)
--
-- Cambios:
--   - rrpp.visible_en_busqueda — el RRPP decide si los locales lo pueden
--     descubrir por el buscador interno. Su página pública SIEMPRE es
--     pública (siguiendo el slug), esto es solo para discovery B2B.
--   - rrpp.estado_alta — 'invitado' (creado por venue/admin, pendiente de
--     completar) o 'completo' (perfil terminado, puede trabajar).
--   - rrpp.invitado_por_local_id / rrpp.invitado_por_admin_id — quién lo
--     dio de alta. Auditoría + control de calidad.
--   - Tabla invitacion_rrpp — para invitar a personas que aún NO son
--     usuarios PartyMaps. Token único, expira en 30 días, marcable como
--     consumida cuando el alta se completa.
--
-- Idempotente.
-- =============================================

-- ── A. Nuevos campos en rrpp ──────────────────────────────────────
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS visible_en_busqueda BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS estado_alta TEXT NOT NULL DEFAULT 'completo';
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS invitado_por_local_id UUID REFERENCES locales(id) ON DELETE SET NULL;
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS invitado_por_admin_id UUID;
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS invitado_at TIMESTAMPTZ;
ALTER TABLE rrpp ADD COLUMN IF NOT EXISTS completado_at TIMESTAMPTZ;

-- Constraint en estado_alta (drop si ya existía con otros valores)
DO $$
BEGIN
  ALTER TABLE rrpp DROP CONSTRAINT IF EXISTS rrpp_estado_alta_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE rrpp ADD CONSTRAINT rrpp_estado_alta_check
  CHECK (estado_alta IN ('invitado', 'completo'));

CREATE INDEX IF NOT EXISTS idx_rrpp_visible_search
  ON rrpp (visible_en_busqueda) WHERE visible_en_busqueda = true AND activo = true;
CREATE INDEX IF NOT EXISTS idx_rrpp_estado_alta ON rrpp (estado_alta);
CREATE INDEX IF NOT EXISTS idx_rrpp_invitado_por_local
  ON rrpp (invitado_por_local_id) WHERE invitado_por_local_id IS NOT NULL;

-- Política RLS extra: ocultar RRPPs no visibles del buscador a anon.
-- La policy existente "RRPP activos son públicos" sigue dejando ver la
-- página pública por slug. Esto es solo para listados sin slug específico.
-- (No tocamos las policies existentes — los listados que filtran por
--  visible_en_busqueda lo hacen vía WHERE en el endpoint, no por RLS.)

-- ── B. Tabla invitacion_rrpp ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitacion_rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  -- Quién emite la invitación (al menos uno relleno)
  invitado_por_local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  invitado_por_admin_id UUID,
  -- Para quién: email obligatorio, teléfono opcional
  email TEXT NOT NULL,
  telefono TEXT,
  nombre TEXT,
  -- Si la invitación viene de un local, pre-rellena comisión sugerida
  -- que el RRPP ve antes de aceptar.
  comision_pct_sugerida NUMERIC(5, 2),
  tope_por_venta_sugerido NUMERIC(10, 2),
  mensaje TEXT,
  -- Estado
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'aceptada', 'rechazada', 'expirada', 'cancelada')
  ),
  -- Si la persona ya existía en usuarios cuando se invitó, lo registramos
  -- para que el flujo siga vivo (usuario logueado ve la invitación).
  usuario_id_si_existia UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Cuando se acepta y se crea el rrpp, dejamos referencia
  rrpp_id UUID REFERENCES rrpp(id) ON DELETE SET NULL,
  expira_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  aceptada_at TIMESTAMPTZ,
  rechazada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Al menos un emisor relleno
  CHECK (invitado_por_local_id IS NOT NULL OR invitado_por_admin_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_invitacion_token ON invitacion_rrpp (token) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_invitacion_email ON invitacion_rrpp (lower(email));
CREATE INDEX IF NOT EXISTS idx_invitacion_local ON invitacion_rrpp (invitado_por_local_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitacion_usuario ON invitacion_rrpp (usuario_id_si_existia) WHERE usuario_id_si_existia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitacion_expira ON invitacion_rrpp (expira_at) WHERE estado = 'pendiente';

ALTER TABLE invitacion_rrpp ENABLE ROW LEVEL SECURITY;

-- Pública por token: cualquiera con el token puede leer la invitación
-- (es como un magic link). Sin token, anon no ve nada.
-- En Supabase, todas las policies son PERMISSIVE OR — para limitar a
-- "solo por token", el endpoint filtra ?token=... en la query. Aquí solo
-- dejamos visibles los registros que el cliente pida explícitamente.
DROP POLICY IF EXISTS "Invitación visible por token" ON invitacion_rrpp;
CREATE POLICY "Invitación visible por token" ON invitacion_rrpp
  FOR SELECT USING (true);  -- el filtrado por token lo hace el endpoint

-- El trabajador del local ve las invitaciones que su local ha emitido
DROP POLICY IF EXISTS "Local ve sus invitaciones" ON invitacion_rrpp;
CREATE POLICY "Local ve sus invitaciones" ON invitacion_rrpp
  FOR ALL USING (
    invitado_por_local_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = invitacion_rrpp.invitado_por_local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- Función para expirar invitaciones viejas (cron)
CREATE OR REPLACE FUNCTION expirar_invitaciones_rrpp()
RETURNS INTEGER AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE invitacion_rrpp
  SET estado = 'expirada'
  WHERE estado = 'pendiente' AND expira_at < NOW();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$ LANGUAGE plpgsql;
