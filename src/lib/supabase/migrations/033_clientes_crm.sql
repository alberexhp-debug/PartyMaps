-- 033: CRM de clientes del local.
-- `cliente_local` guarda las anotaciones del local sobre un cliente (VIP, notas).
-- La actividad (visitas/gasto) se agrega en caliente desde entradas + pedidos_bar
-- vía la función `clientes_del_local`. Idempotente.

CREATE TABLE IF NOT EXISTS cliente_local (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  vip BOOLEAN NOT NULL DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (local_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_cliente_local ON cliente_local (local_id);

ALTER TABLE cliente_local ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trabajadores ven clientes de su local" ON cliente_local;
CREATE POLICY "Trabajadores ven clientes de su local" ON cliente_local
  FOR SELECT USING (
    local_id IN (SELECT local_id FROM usuario_local WHERE email = auth.email() AND activo = true)
  );
-- Escrituras vía service_role tras verificar identidad en el endpoint.

-- Agrega visitas (entradas + pedidos de bar pagados) y gasto por cliente del local.
CREATE OR REPLACE FUNCTION clientes_del_local(p_local_id UUID)
RETURNS TABLE (usuario_id UUID, entradas_n BIGINT, bar_n BIGINT, gasto NUMERIC, ultima TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  WITH e AS (
    SELECT usuario_id, count(*) AS n, coalesce(sum(precio_total), 0) AS g, max(created_at) AS u
    FROM entradas
    WHERE local_id = p_local_id AND usuario_id IS NOT NULL AND estado <> 'cancelada'
    GROUP BY usuario_id
  ), b AS (
    SELECT usuario_id, count(*) AS n, coalesce(sum(precio_total), 0) AS g, max(created_at) AS u
    FROM pedidos_bar
    WHERE local_id = p_local_id AND usuario_id IS NOT NULL AND estado IN ('pagado', 'entregado')
    GROUP BY usuario_id
  )
  SELECT
    coalesce(e.usuario_id, b.usuario_id) AS usuario_id,
    coalesce(e.n, 0) AS entradas_n,
    coalesce(b.n, 0) AS bar_n,
    coalesce(e.g, 0) + coalesce(b.g, 0) AS gasto,
    greatest(coalesce(e.u, b.u), coalesce(b.u, e.u)) AS ultima
  FROM e FULL OUTER JOIN b ON e.usuario_id = b.usuario_id;
$$;
