-- =============================================
-- Migración 018: Fix definitivo RLS productos_local para anon
-- ─────────────────────────────────────────────────────────
-- La migración 012 separó la policy FOR ALL pero las nuevas policies
-- de trabajadores SEGUÍAN haciendo JOIN a auth.users. La policy de
-- SELECT de trabajadores se evalúa también para el rol `anon` (todas
-- las policies permissive de SELECT se combinan con OR), y como `anon`
-- no tiene privilegio sobre auth.users, Postgres lanza:
--   42501 permission denied for table users
-- Resultado: anon NO puede leer la carta del bar en producción.
--
-- Solución: no tocar auth.users desde las policies. Usar el email del
-- JWT vía auth.jwt() ->> 'email' (función accesible por anon/authenticated,
-- no requiere privilegios de tabla). Para anon el JWT no trae email, así
-- que el EXISTS es falso y no aporta filas, pero tampoco rompe.
-- Idempotente.
-- =============================================

-- ── SELECT trabajadores (ven también productos NO disponibles) ──────
DROP POLICY IF EXISTS "Trabajadores ven todos los productos del local" ON productos_local;
CREATE POLICY "Trabajadores ven todos los productos del local" ON productos_local
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = productos_local.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
    )
  );

-- ── INSERT trabajadores ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Trabajadores insertan productos" ON productos_local;
CREATE POLICY "Trabajadores insertan productos" ON productos_local
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = productos_local.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- ── UPDATE trabajadores ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Trabajadores actualizan productos" ON productos_local;
CREATE POLICY "Trabajadores actualizan productos" ON productos_local
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = productos_local.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- ── DELETE trabajadores ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Trabajadores borran productos" ON productos_local;
CREATE POLICY "Trabajadores borran productos" ON productos_local
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = productos_local.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );
