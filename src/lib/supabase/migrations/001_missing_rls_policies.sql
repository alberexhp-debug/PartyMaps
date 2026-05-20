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
