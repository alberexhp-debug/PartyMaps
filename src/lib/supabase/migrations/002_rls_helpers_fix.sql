-- =============================================
-- MIGRACIÓN 002: Helpers SECURITY DEFINER + reset RLS
-- Reemplaza la 001. Es idempotente: se puede ejecutar varias veces.
-- Pegar entera en Supabase SQL Editor → Run.
-- =============================================

-- ── 1. HELPER FUNCTIONS (rompen la recursión RLS) ────────────────────────────

-- ¿El usuario autenticado es admin activo?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM administradores WHERE auth_id = auth.uid() AND activo = true
  )
$$;

-- Locales en los que el usuario autenticado trabaja (cualquier rol activo)
CREATE OR REPLACE FUNCTION mis_locales()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT local_id FROM usuario_local
  WHERE email = auth.email() AND activo = true
$$;

-- Locales en los que el usuario autenticado es dueño o gestor
CREATE OR REPLACE FUNCTION mis_locales_gestor()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT local_id FROM usuario_local
  WHERE email = auth.email() AND activo = true
    AND rol IN ('dueno', 'gestor')
$$;

-- id del usuario PWA (tabla usuarios) que corresponde a auth.uid()
CREATE OR REPLACE FUNCTION mi_usuario_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1
$$;

-- ── 2. RESET POLICIES (drop si existen, recrear) ─────────────────────────────
-- Esto evita errores si la migración se aplica más de una vez.

-- USUARIO_LOCAL
DROP POLICY IF EXISTS "Trabajadores ven equipo de su local" ON usuario_local;
DROP POLICY IF EXISTS "Dueños y gestores gestionan equipo" ON usuario_local;
DROP POLICY IF EXISTS "Trabajador ve su propia fila" ON usuario_local;

CREATE POLICY "Trabajador ve su propia fila" ON usuario_local
  FOR SELECT USING (email = auth.email());

CREATE POLICY "Trabajadores ven equipo de su local" ON usuario_local
  FOR SELECT USING (local_id IN (SELECT mis_locales()));

CREATE POLICY "Dueños y gestores gestionan equipo" ON usuario_local
  FOR ALL USING (local_id IN (SELECT mis_locales_gestor()));

-- LOCALES (recrear las recursivas del schema base)
DROP POLICY IF EXISTS "Panel local puede leer su local" ON locales;
DROP POLICY IF EXISTS "Panel local puede actualizar su local" ON locales;
DROP POLICY IF EXISTS "Admins ven todos los locales" ON locales;
DROP POLICY IF EXISTS "Admins actualizan cualquier local" ON locales;

CREATE POLICY "Panel local puede leer su local" ON locales
  FOR SELECT USING (id IN (SELECT mis_locales()));

CREATE POLICY "Panel local puede actualizar su local" ON locales
  FOR UPDATE USING (id IN (SELECT mis_locales_gestor()));

CREATE POLICY "Admins ven todos los locales" ON locales
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins actualizan cualquier local" ON locales
  FOR UPDATE USING (is_admin());

-- EVENTOS
DROP POLICY IF EXISTS "Panel local gestiona sus eventos" ON eventos;

CREATE POLICY "Panel local gestiona sus eventos" ON eventos
  FOR ALL USING (local_id IN (SELECT mis_locales()));

-- CONCURSOS
DROP POLICY IF EXISTS "Panel local gestiona sus concursos" ON concursos;
DROP POLICY IF EXISTS "Panel local gestiona participaciones de sus concursos" ON participaciones_concurso;
DROP POLICY IF EXISTS "Admins ven todos los concursos" ON concursos;

CREATE POLICY "Panel local gestiona sus concursos" ON concursos
  FOR ALL USING (local_id IN (SELECT mis_locales()));

CREATE POLICY "Panel local gestiona participaciones de sus concursos" ON participaciones_concurso
  FOR ALL USING (
    concurso_id IN (SELECT id FROM concursos WHERE local_id IN (SELECT mis_locales()))
  );

CREATE POLICY "Admins ven todos los concursos" ON concursos
  FOR SELECT USING (is_admin());

-- RETOS
DROP POLICY IF EXISTS "Retos activos son públicos" ON retos;
DROP POLICY IF EXISTS "Panel local gestiona sus retos" ON retos;
DROP POLICY IF EXISTS "Admins ven todos los retos" ON retos;

CREATE POLICY "Retos activos son públicos" ON retos
  FOR SELECT USING (estado = 'activo');

CREATE POLICY "Panel local gestiona sus retos" ON retos
  FOR ALL USING (local_id IN (SELECT mis_locales()));

CREATE POLICY "Admins ven todos los retos" ON retos
  FOR SELECT USING (is_admin());

-- SUGERENCIAS
DROP POLICY IF EXISTS "Usuarios envían sugerencias" ON sugerencias;
DROP POLICY IF EXISTS "Panel local gestiona sugerencias de su local" ON sugerencias;

CREATE POLICY "Usuarios envían sugerencias" ON sugerencias
  FOR INSERT WITH CHECK (usuario_id = mi_usuario_id());

CREATE POLICY "Panel local gestiona sugerencias de su local" ON sugerencias
  FOR ALL USING (local_id IN (SELECT mis_locales()));

-- PARTICIPANTES_PLAN
DROP POLICY IF EXISTS "Usuarios gestionan sus participaciones en planes" ON participantes_plan;
DROP POLICY IF EXISTS "Creadores ven participantes de sus planes" ON participantes_plan;

CREATE POLICY "Usuarios gestionan sus participaciones en planes" ON participantes_plan
  FOR ALL USING (usuario_id = mi_usuario_id());

CREATE POLICY "Creadores ven participantes de sus planes" ON participantes_plan
  FOR SELECT USING (
    plan_id IN (SELECT id FROM planes_publicos WHERE creador_id = mi_usuario_id())
  );

-- VOTOS_CONCURSO
DROP POLICY IF EXISTS "Usuarios gestionan sus votos en concursos" ON votos_concurso;

ALTER TABLE votos_concurso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus votos en concursos" ON votos_concurso
  FOR ALL USING (usuario_id = mi_usuario_id());

-- ADMINISTRADORES (sin RLS estricta — necesaria para que el admin pueda leerse a sí mismo tras login)
-- Habilitamos RLS y damos política SELECT propia
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin ve su propia fila" ON administradores;
DROP POLICY IF EXISTS "Admins ven otros admins" ON administradores;

CREATE POLICY "Admin ve su propia fila" ON administradores
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Admins ven otros admins" ON administradores
  FOR SELECT USING (is_admin());

-- USUARIOS (admins ven todos)
DROP POLICY IF EXISTS "Admins ven todos los usuarios" ON usuarios;
DROP POLICY IF EXISTS "Admins actualizan cualquier usuario" ON usuarios;

CREATE POLICY "Admins ven todos los usuarios" ON usuarios
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins actualizan cualquier usuario" ON usuarios
  FOR UPDATE USING (is_admin());

-- REVIEWS (admins moderan)
DROP POLICY IF EXISTS "Admins ven todas las reviews" ON reviews;
DROP POLICY IF EXISTS "Admins moderan reviews" ON reviews;

CREATE POLICY "Admins ven todas las reviews" ON reviews
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins moderan reviews" ON reviews
  FOR UPDATE USING (is_admin());

-- ENTRADAS (admins + panel local del local)
DROP POLICY IF EXISTS "Admins ven todas las entradas" ON entradas;
DROP POLICY IF EXISTS "Panel local verifica entradas de su local" ON entradas;
DROP POLICY IF EXISTS "Panel local marca entradas como usadas" ON entradas;

CREATE POLICY "Admins ven todas las entradas" ON entradas
  FOR SELECT USING (is_admin());

CREATE POLICY "Panel local verifica entradas de su local" ON entradas
  FOR SELECT USING (local_id IN (SELECT mis_locales()));

CREATE POLICY "Panel local marca entradas como usadas" ON entradas
  FOR UPDATE USING (local_id IN (SELECT mis_locales()));

-- HISTORIAL_AFORO (lectura para panel local + admins)
ALTER TABLE historial_aforo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Panel local lee su historial aforo" ON historial_aforo;
DROP POLICY IF EXISTS "Lectura pública historial aforo" ON historial_aforo;

CREATE POLICY "Lectura pública historial aforo" ON historial_aforo
  FOR SELECT USING (true);

-- ── 3. PERMISOS A FUNCIONES (anon + authenticated) ───────────────────────────
GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mis_locales() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mis_locales_gestor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mi_usuario_id() TO anon, authenticated;
