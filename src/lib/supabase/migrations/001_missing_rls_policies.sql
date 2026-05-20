-- =============================================
-- MIGRACIÓN 001: Políticas RLS faltantes
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- ── USUARIO_LOCAL ────────────────────────────────────────────────────────────
-- Sin estas políticas el login del panel local siempre falla.

-- Cada trabajador puede ver todos los registros de su local
-- (permite login + ver equipo)
CREATE POLICY "Trabajadores ven equipo de su local" ON usuario_local
  FOR SELECT USING (
    local_id IN (
      SELECT local_id FROM usuario_local ul
      WHERE ul.email = auth.email() AND ul.activo = true
    )
  );

-- Dueños y gestores pueden gestionar el equipo (INSERT/UPDATE/DELETE)
CREATE POLICY "Dueños y gestores gestionan equipo" ON usuario_local
  FOR ALL USING (
    local_id IN (
      SELECT local_id FROM usuario_local ul
      WHERE ul.email = auth.email() AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- ── CONCURSOS: panel local gestiona todos los estados ────────────────────────
-- La política existente solo permite ver activo/programado; el panel
-- necesita ver cerrado/finalizado/cancelado también, e insertar/actualizar.

CREATE POLICY "Panel local gestiona sus concursos" ON concursos
  FOR ALL USING (
    local_id IN (
      SELECT local_id FROM usuario_local
      WHERE email = auth.email() AND activo = true
    )
  );

-- Panel local ve todas las participaciones de sus concursos (incluyendo pendientes)
CREATE POLICY "Panel local gestiona participaciones de sus concursos" ON participaciones_concurso
  FOR ALL USING (
    concurso_id IN (
      SELECT id FROM concursos
      WHERE local_id IN (
        SELECT local_id FROM usuario_local
        WHERE email = auth.email() AND activo = true
      )
    )
  );

-- ── RETOS ─────────────────────────────────────────────────────────────────────

CREATE POLICY "Retos activos son públicos" ON retos
  FOR SELECT USING (estado = 'activo');

CREATE POLICY "Panel local gestiona sus retos" ON retos
  FOR ALL USING (
    local_id IN (
      SELECT local_id FROM usuario_local
      WHERE email = auth.email() AND activo = true
    )
  );

-- ── SUGERENCIAS ───────────────────────────────────────────────────────────────

-- Usuarios autenticados pueden enviar sugerencias
CREATE POLICY "Usuarios envían sugerencias" ON sugerencias
  FOR INSERT WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- Panel local ve y gestiona sugerencias de su local
CREATE POLICY "Panel local gestiona sugerencias de su local" ON sugerencias
  FOR ALL USING (
    local_id IN (
      SELECT local_id FROM usuario_local
      WHERE email = auth.email() AND activo = true
    )
  );

-- ── PARTICIPANTES_PLAN ────────────────────────────────────────────────────────

-- Los usuarios ven sus propias solicitudes
CREATE POLICY "Usuarios gestionan sus participaciones en planes" ON participantes_plan
  FOR ALL USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- El creador del plan ve todas las solicitudes de su plan
CREATE POLICY "Creadores ven participantes de sus planes" ON participantes_plan
  FOR SELECT USING (
    plan_id IN (
      SELECT id FROM planes_publicos
      WHERE creador_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
    )
  );

-- ── VOTOS_CONCURSO ────────────────────────────────────────────────────────────

CREATE POLICY "Usuarios gestionan sus votos en concursos" ON votos_concurso
  FOR ALL USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- ── ADMIN: acceso completo a todas las tablas ─────────────────────────────────
-- Los admins se identifican por auth.uid() en la tabla administradores.

-- Helper: función para verificar si el usuario actual es admin activo
-- (evita repetir la subquery en cada política)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM administradores WHERE auth_id = auth.uid() AND activo = true
  )
$$;

-- Locales: admins ven todos (sin filtro de estado) y pueden actualizar cualquiera
CREATE POLICY "Admins ven todos los locales" ON locales
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins actualizan cualquier local" ON locales
  FOR UPDATE USING (is_admin());

-- Usuarios: admins ven todos y pueden actualizar (suspender/reactivar)
CREATE POLICY "Admins ven todos los usuarios" ON usuarios
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins actualizan cualquier usuario" ON usuarios
  FOR UPDATE USING (is_admin());

-- Reviews: admins ven todas (incluyendo censuradas) y pueden moderar
CREATE POLICY "Admins ven todas las reviews" ON reviews
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins moderan reviews" ON reviews
  FOR UPDATE USING (is_admin());

-- Retos: admins pueden verlos todos
CREATE POLICY "Admins ven todos los retos" ON retos
  FOR SELECT USING (is_admin());

-- Concursos: admins ven todos
CREATE POLICY "Admins ven todos los concursos" ON concursos
  FOR SELECT USING (is_admin());

-- Entradas: admins ven todas
CREATE POLICY "Admins ven todas las entradas" ON entradas
  FOR SELECT USING (is_admin());

-- ── SCANNER: Panel local necesita leer y actualizar entradas de su local ──────
-- Los trabajadores del local panel no están en la tabla usuarios,
-- por lo que la política de usuarios no les aplica.

CREATE POLICY "Panel local verifica entradas de su local" ON entradas
  FOR SELECT USING (
    local_id IN (
      SELECT local_id FROM usuario_local
      WHERE email = auth.email() AND activo = true
    )
  );

CREATE POLICY "Panel local marca entradas como usadas" ON entradas
  FOR UPDATE USING (
    local_id IN (
      SELECT local_id FROM usuario_local
      WHERE email = auth.email() AND activo = true
    )
  );
