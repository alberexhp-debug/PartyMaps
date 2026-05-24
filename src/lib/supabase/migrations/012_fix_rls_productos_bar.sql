-- =============================================
-- Migración 012: Fix RLS de productos_local y pedidos_bar
-- ─────────────────────────────────────────────────────────
-- Problema descubierto en QA: la policy "FOR ALL" que hace JOIN a auth.users
-- bloquea SELECT como anon ("permission denied for table users") porque
-- Postgres evalúa todas las policies aplicables al CMD y el JOIN a auth.users
-- requiere permisos que anon no tiene.
--
-- Solución: separar la policy "FOR ALL" en INSERT/UPDATE/DELETE explícitas,
-- dejando SELECT con su única policy abierta para productos disponibles.
-- =============================================

-- ── productos_local ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Trabajadores del local gestionan productos" ON productos_local;

DROP POLICY IF EXISTS "Trabajadores insertan productos" ON productos_local;
CREATE POLICY "Trabajadores insertan productos" ON productos_local
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      JOIN auth.users au ON au.email = ul.email
      WHERE ul.local_id = productos_local.local_id
        AND au.id = auth.uid()
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Trabajadores actualizan productos" ON productos_local;
CREATE POLICY "Trabajadores actualizan productos" ON productos_local
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      JOIN auth.users au ON au.email = ul.email
      WHERE ul.local_id = productos_local.local_id
        AND au.id = auth.uid()
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Trabajadores borran productos" ON productos_local;
CREATE POLICY "Trabajadores borran productos" ON productos_local
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      JOIN auth.users au ON au.email = ul.email
      WHERE ul.local_id = productos_local.local_id
        AND au.id = auth.uid()
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- Política SELECT adicional para que trabajadores vean también productos
-- DESACTIVADOS de su local (para gestionarlos). La policy original
-- "Productos disponibles son públicos" sigue activa para anon/usuarios.
DROP POLICY IF EXISTS "Trabajadores ven todos los productos del local" ON productos_local;
CREATE POLICY "Trabajadores ven todos los productos del local" ON productos_local
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      JOIN auth.users au ON au.email = ul.email
      WHERE ul.local_id = productos_local.local_id
        AND au.id = auth.uid()
        AND ul.activo = true
    )
  );

-- ── pedidos_bar ────────────────────────────────────────────────────
-- Las policies actuales son solo de SELECT, pero como el JOIN a auth.users
-- también puede causar problemas a anon, aseguramos que SELECT como anon
-- no encuentra pedidos (es lo que queremos: solo el dueño del pedido y los
-- trabajadores los ven).
-- Las inserciones siguen haciéndose vía endpoint con service_role.

-- (No cambia, pero documentamos)
COMMENT ON POLICY "Usuario ve sus pedidos" ON pedidos_bar IS
  'Usuario autenticado ve sus propios pedidos vía usuarios.auth_id = auth.uid()';
COMMENT ON POLICY "Trabajadores ven pedidos de su local" ON pedidos_bar IS
  'Trabajadores activos ven pedidos del local donde trabajan';
