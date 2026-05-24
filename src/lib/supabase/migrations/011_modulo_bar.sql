-- =============================================
-- Migración 011: Módulo Bar (pedidos de bebida/comida con QR)
-- Idempotente. Añade rol barman, catálogo de productos del local,
-- pedidos con QR PMB: y políticas RLS por rol del trabajador.
-- =============================================

-- ── 1. Rol nuevo "barman" en usuario_local ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE 'usuario_local%rol%'
      AND check_clause LIKE '%barman%'
  ) THEN
    BEGIN
      ALTER TABLE usuario_local DROP CONSTRAINT IF EXISTS usuario_local_rol_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    ALTER TABLE usuario_local ADD CONSTRAINT usuario_local_rol_check
      CHECK (rol IN ('dueno', 'gestor', 'operador_noche', 'puerta', 'barman'));
  END IF;
END $$;

-- ── 2. Catálogo de productos del local ────────────────────────────
CREATE TABLE IF NOT EXISTS productos_local (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL DEFAULT 'bebida' CHECK (
    categoria IN ('cerveza', 'cubata', 'copa', 'cocktail', 'chupito', 'refresco',
                  'agua', 'comida', 'snack', 'pack', 'otro')
  ),
  precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
  imagen_url TEXT,
  disponible BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  -- Pack/voucher: ej "Pack 5 cubatas". Si es pack, descripción debe explicar.
  es_pack BOOLEAN NOT NULL DEFAULT false,
  unidades_pack INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_local ON productos_local(local_id) WHERE disponible = true;
CREATE INDEX IF NOT EXISTS idx_productos_orden ON productos_local(local_id, orden);

ALTER TABLE productos_local ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Productos disponibles son públicos" ON productos_local;
CREATE POLICY "Productos disponibles son públicos" ON productos_local
  FOR SELECT USING (disponible = true);

DROP POLICY IF EXISTS "Trabajadores del local gestionan productos" ON productos_local;
CREATE POLICY "Trabajadores del local gestionan productos" ON productos_local
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      JOIN auth.users au ON au.email = ul.email
      WHERE ul.local_id = productos_local.local_id
        AND au.id = auth.uid()
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- ── 3. Pedidos del bar ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos_bar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'pagado' CHECK (
    estado IN ('pagado', 'entregado', 'expirado', 'cancelado')
  ),
  precio_total NUMERIC(10, 2) NOT NULL CHECK (precio_total >= 0),
  comision_plataforma NUMERIC(10, 2) NOT NULL DEFAULT 0,
  metodo_pago TEXT NOT NULL DEFAULT 'app',
  pagado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '6 hours',
  entregado_at TIMESTAMPTZ,
  entregado_por UUID REFERENCES usuario_local(id),
  cancelado_at TIMESTAMPTZ,
  cancelado_motivo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_bar_local_estado ON pedidos_bar(local_id, estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_bar_usuario ON pedidos_bar(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_bar_qr ON pedidos_bar(qr_code);
CREATE INDEX IF NOT EXISTS idx_pedidos_bar_expira ON pedidos_bar(expira_at) WHERE estado = 'pagado';

ALTER TABLE pedidos_bar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario ve sus pedidos" ON pedidos_bar;
CREATE POLICY "Usuario ve sus pedidos" ON pedidos_bar
  FOR SELECT USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "Trabajadores ven pedidos de su local" ON pedidos_bar;
CREATE POLICY "Trabajadores ven pedidos de su local" ON pedidos_bar
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      JOIN auth.users au ON au.email = ul.email
      WHERE ul.local_id = pedidos_bar.local_id
        AND au.id = auth.uid()
        AND ul.activo = true
    )
  );

-- (Inserciones y updates se hacen vía endpoints con service_role; no policy aquí)

-- ── 4. Líneas de pedido ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos_bar(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos_local(id) ON DELETE SET NULL,
  -- Snapshot del producto al momento de comprar (para histórico inmutable)
  nombre_snapshot TEXT NOT NULL,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);

ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Items siguen el RLS del pedido" ON pedido_items;
CREATE POLICY "Items siguen el RLS del pedido" ON pedido_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pedidos_bar p WHERE p.id = pedido_items.pedido_id)
  );

-- ── 5. Trigger updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_productos_local_touch ON productos_local;
CREATE TRIGGER trg_productos_local_touch
  BEFORE UPDATE ON productos_local
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_pedidos_bar_touch ON pedidos_bar;
CREATE TRIGGER trg_pedidos_bar_touch
  BEFORE UPDATE ON pedidos_bar
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 6. Vista de pedidos activos (con items agregados) ────────────
CREATE OR REPLACE VIEW v_pedidos_bar_activos AS
SELECT
  p.id,
  p.local_id,
  p.usuario_id,
  p.qr_code,
  p.estado,
  p.precio_total,
  p.notas,
  p.pagado_at,
  p.expira_at,
  u.nombre AS usuario_nombre,
  u.foto_perfil_url AS usuario_foto,
  (
    SELECT json_agg(json_build_object(
      'id', i.id,
      'nombre', i.nombre_snapshot,
      'cantidad', i.cantidad,
      'precio_unitario', i.precio_unitario
    ) ORDER BY i.created_at)
    FROM pedido_items i WHERE i.pedido_id = p.id
  ) AS items
FROM pedidos_bar p
JOIN usuarios u ON u.id = p.usuario_id
WHERE p.estado = 'pagado';

-- ── 7. Función para expirar pedidos viejos (la llama el cron) ────
CREATE OR REPLACE FUNCTION expirar_pedidos_bar()
RETURNS INTEGER AS $$
DECLARE
  expirados INTEGER;
BEGIN
  UPDATE pedidos_bar
  SET estado = 'expirado', cancelado_at = NOW(), cancelado_motivo = 'No canjeado en 6h'
  WHERE estado = 'pagado' AND expira_at < NOW();
  GET DIAGNOSTICS expirados = ROW_COUNT;
  RETURN expirados;
END;
$$ LANGUAGE plpgsql;
