-- =============================================
-- MIGRACIÓN 003 — Storage buckets, índices,
-- helpers para autocierre de módulos, valoraciones de plan
-- Idempotente. Aplicar después de la 002.
-- =============================================

-- 1. Buckets de Storage para imágenes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('concursos', 'concursos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','video/mp4']),
  ('retos', 'retos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','video/mp4']),
  ('reviews', 'reviews', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('perfiles', 'perfiles', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('locales', 'locales', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('eventos', 'eventos', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas Storage (cualquier autenticado puede subir; lectura pública)
DROP POLICY IF EXISTS "Storage lectura pública" ON storage.objects;
CREATE POLICY "Storage lectura pública" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('concursos','retos','reviews','perfiles','locales','eventos')
  );

DROP POLICY IF EXISTS "Storage upload autenticados" ON storage.objects;
CREATE POLICY "Storage upload autenticados" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id IN ('concursos','retos','reviews','perfiles','locales','eventos')
  );

DROP POLICY IF EXISTS "Storage update propios" ON storage.objects;
CREATE POLICY "Storage update propios" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id IN ('concursos','retos','reviews','perfiles','locales','eventos')
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "Storage delete propios" ON storage.objects;
CREATE POLICY "Storage delete propios" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id IN ('concursos','retos','reviews','perfiles','locales','eventos')
    AND owner = auth.uid()
  );

-- 3. Índices para queries frecuentes que se usan en la app
CREATE INDEX IF NOT EXISTS idx_planes_estado_hora ON planes_publicos(estado, hora_llegada);
CREATE INDEX IF NOT EXISTS idx_planes_local_estado ON planes_publicos(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_participantes_plan_usuario ON participantes_plan(usuario_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_checkins_usuario_local ON checkins(usuario_id, local_id) WHERE salida_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_concursos_local_estado ON concursos(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_retos_local_estado ON retos(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_entradas_local_estado ON entradas(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_suscripciones_local ON suscripciones(local_id);
CREATE INDEX IF NOT EXISTS idx_sugerencias_local_estado ON sugerencias(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_historial_aforo_local_fecha ON historial_aforo(local_id, registrado_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_plan_id ON mensajes_chat_plan(plan_id, created_at);

-- 4. Función helper: comprobar si un usuario tiene checkin activo en un local
CREATE OR REPLACE FUNCTION tiene_checkin_activo(p_usuario_id UUID, p_local_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM checkins
    WHERE usuario_id = p_usuario_id
      AND local_id = p_local_id
      AND salida_at IS NULL
  );
END;
$$;
GRANT EXECUTE ON FUNCTION tiene_checkin_activo(UUID, UUID) TO authenticated;

-- 5. Función para calcular reputación de un usuario en planes
CREATE OR REPLACE FUNCTION recalcular_reputacion(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_media FLOAT;
  v_total INTEGER;
BEGIN
  SELECT AVG(puntuacion), COUNT(*)
  INTO v_media, v_total
  FROM valoraciones_plan
  WHERE valorado_id = p_usuario_id;

  UPDATE usuarios
  SET reputacion_puntuacion = v_media,
      reputacion_num_valoraciones = COALESCE(v_total, 0)
  WHERE id = p_usuario_id;
END;
$$;
GRANT EXECUTE ON FUNCTION recalcular_reputacion(UUID) TO authenticated;

-- 6. Trigger para recalcular reputación al insertar valoración
CREATE OR REPLACE FUNCTION trigger_recalcular_reputacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recalcular_reputacion(NEW.valorado_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS valoraciones_plan_recalcular ON valoraciones_plan;
CREATE TRIGGER valoraciones_plan_recalcular
  AFTER INSERT OR UPDATE ON valoraciones_plan
  FOR EACH ROW EXECUTE FUNCTION trigger_recalcular_reputacion();

-- 7. RLS sugerencias: usuario puede insertar
ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario crea sugerencia" ON sugerencias;
CREATE POLICY "Usuario crea sugerencia" ON sugerencias
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "Usuario lee sus sugerencias" ON sugerencias;
CREATE POLICY "Usuario lee sus sugerencias" ON sugerencias
  FOR SELECT TO authenticated
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
    OR local_id IN (SELECT * FROM mis_locales())
    OR local_id IN (SELECT * FROM mis_locales_gestor())
    OR is_admin()
  );

-- 8. Mejorar política reviews: usuario puede crear si tiene checkin
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario crea review con checkin" ON reviews;
CREATE POLICY "Usuario crea review con checkin" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM checkins c
      WHERE c.usuario_id = reviews.usuario_id
        AND c.local_id = reviews.local_id
    )
  );

-- 9. Vista útil: reviews públicas (no censuradas, estado activa)
CREATE OR REPLACE VIEW reviews_publicas AS
SELECT r.*, u.nombre AS usuario_nombre, u.foto_perfil_url AS usuario_foto
FROM reviews r
JOIN usuarios u ON u.id = r.usuario_id
WHERE r.censurada = false AND r.estado = 'activa';

GRANT SELECT ON reviews_publicas TO anon, authenticated;
