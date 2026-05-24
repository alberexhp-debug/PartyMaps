-- =============================================
-- Migración 009: Detección de votación sospechosa
-- Idempotente. Añade columnas de trazabilidad al voto y una función
-- SECURITY DEFINER que computa señales de fraude por participación.
-- =============================================

ALTER TABLE votos_concurso
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_votos_ip ON votos_concurso(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votos_participacion_created ON votos_concurso(participacion_id, created_at);

-- Función: por participación devuelve total de votos, IPs únicas, % cuentas nuevas y bandera de sospecha.
-- Reglas de flag automático (cualquiera de ellas):
--   a) >5 votos pero <40% IPs únicas (cluster IP)
--   b) >5 votos y >60% provienen de cuentas creadas hace <48h
--   c) >3 votos desde la misma IP a la misma participación
CREATE OR REPLACE FUNCTION detectar_votos_sospechosos(p_concurso_id UUID)
RETURNS TABLE (
  participacion_id UUID,
  total_votos INTEGER,
  ips_unicas INTEGER,
  porcentaje_ips_unicas NUMERIC,
  porcentaje_cuentas_nuevas NUMERIC,
  max_votos_por_ip INTEGER,
  flag_sospechoso BOOLEAN,
  motivos TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH v AS (
    SELECT
      vc.participacion_id,
      vc.ip_address,
      vc.usuario_id,
      u.created_at AS usuario_created_at
    FROM votos_concurso vc
    LEFT JOIN usuarios u ON u.id = vc.usuario_id
    WHERE vc.concurso_id = p_concurso_id
  ),
  agg AS (
    SELECT
      v.participacion_id,
      COUNT(*)::INT AS total,
      COUNT(DISTINCT v.ip_address)::INT AS ips,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(DISTINCT v.ip_address)::NUMERIC * 100 / COUNT(*), 1)
        ELSE 0
      END AS pct_ips,
      CASE WHEN COUNT(*) > 0 THEN
        ROUND(
          SUM(CASE WHEN v.usuario_created_at > NOW() - INTERVAL '48 hours' THEN 1 ELSE 0 END)::NUMERIC
          * 100 / COUNT(*), 1)
        ELSE 0
      END AS pct_nuevas,
      COALESCE((
        SELECT MAX(c) FROM (
          SELECT COUNT(*) AS c FROM votos_concurso v2
          WHERE v2.participacion_id = v.participacion_id
            AND v2.ip_address IS NOT NULL
          GROUP BY v2.ip_address
        ) t
      ), 0)::INT AS max_por_ip
    FROM v
    GROUP BY v.participacion_id
  )
  SELECT
    a.participacion_id,
    a.total,
    a.ips,
    a.pct_ips,
    a.pct_nuevas,
    a.max_por_ip,
    (
      (a.total > 5 AND a.pct_ips < 40)
      OR (a.total > 5 AND a.pct_nuevas > 60)
      OR (a.max_por_ip > 3)
    ) AS flag,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN a.total > 5 AND a.pct_ips < 40 THEN 'cluster_ip' END,
      CASE WHEN a.total > 5 AND a.pct_nuevas > 60 THEN 'cuentas_nuevas' END,
      CASE WHEN a.max_por_ip > 3 THEN 'misma_ip_repetida' END
    ], NULL) AS motivos
  FROM agg a;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir solo a admins llamar la función
REVOKE EXECUTE ON FUNCTION detectar_votos_sospechosos(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION detectar_votos_sospechosos(UUID) TO service_role;
