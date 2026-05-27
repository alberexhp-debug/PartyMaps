-- =============================================
-- Migración 017: Mesas, plantas y reservas (reservados)
-- Idempotente. Plano del local por plantas con mesas posicionadas
-- (coords normalizadas 0..1) + reservas iniciadas por el usuario.
-- Modo de reservas configurable por local: 'solicitud' | 'instantanea'.
-- =============================================

-- ── 1. Plantas (pisos del local) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS plantas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plantas_local ON plantas(local_id, orden);

-- ── 2. Mesas (incluye reservados, barra, etc.) ────────────────────
-- pos_x/pos_y y ancho/alto son fracciones (0..1) del lienzo de la planta,
-- así el plano es responsive en cualquier pantalla (móvil o tablet).
CREATE TABLE IF NOT EXISTS mesas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  planta_id UUID NOT NULL REFERENCES plantas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  capacidad INTEGER NOT NULL DEFAULT 4 CHECK (capacidad > 0),
  tipo TEXT NOT NULL DEFAULT 'mesa' CHECK (tipo IN ('mesa', 'reservado', 'barra', 'otro')),
  forma TEXT NOT NULL DEFAULT 'redonda' CHECK (forma IN ('redonda', 'cuadrada', 'rect')),
  pos_x NUMERIC(6,5) NOT NULL DEFAULT 0.5 CHECK (pos_x >= 0 AND pos_x <= 1),
  pos_y NUMERIC(6,5) NOT NULL DEFAULT 0.5 CHECK (pos_y >= 0 AND pos_y <= 1),
  ancho NUMERIC(6,5) NOT NULL DEFAULT 0.12 CHECK (ancho > 0 AND ancho <= 1),
  alto NUMERIC(6,5) NOT NULL DEFAULT 0.12 CHECK (alto > 0 AND alto <= 1),
  zona TEXT,
  reservable BOOLEAN NOT NULL DEFAULT true,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (local_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_mesas_local ON mesas(local_id) WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_mesas_planta ON mesas(planta_id);

-- ── 3. Reservas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES eventos(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre_contacto TEXT NOT NULL,
  telefono TEXT,
  personas INTEGER NOT NULL DEFAULT 2 CHECK (personas > 0),
  fecha_noche DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'solicitada' CHECK (
    estado IN ('solicitada', 'confirmada', 'rechazada', 'sentada', 'cancelada', 'no_show')
  ),
  modo TEXT NOT NULL DEFAULT 'solicitud' CHECK (modo IN ('solicitud', 'instantanea')),
  importe NUMERIC(10,2) CHECK (importe IS NULL OR importe >= 0),
  pagada BOOLEAN NOT NULL DEFAULT false,
  notas TEXT,
  confirmada_at TIMESTAMPTZ,
  confirmada_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reservas_local_noche ON reservas(local_id, fecha_noche);
CREATE INDEX IF NOT EXISTS idx_reservas_mesa ON reservas(mesa_id);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);

-- Una mesa solo puede tener una reserva "viva" por noche.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reserva_mesa_noche
  ON reservas (mesa_id, fecha_noche)
  WHERE estado IN ('confirmada', 'sentada');

-- ── 4. Config de reservas en locales + mesa en pedidos_bar ─────────
ALTER TABLE locales ADD COLUMN IF NOT EXISTS reservas_activas BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS reservas_modo TEXT NOT NULL DEFAULT 'solicitud'
  CHECK (reservas_modo IN ('solicitud', 'instantanea'));

ALTER TABLE pedidos_bar ADD COLUMN IF NOT EXISTS mesa_id UUID REFERENCES mesas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_bar_mesa ON pedidos_bar(mesa_id) WHERE mesa_id IS NOT NULL;

-- ── 5. RLS ─────────────────────────────────────────────────────────
ALTER TABLE plantas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- PLANTAS: lectura pública (la app del usuario muestra el plano), edición dueño/gestor.
DROP POLICY IF EXISTS "Plantas son públicas" ON plantas;
CREATE POLICY "Plantas son públicas" ON plantas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestores editan plantas" ON plantas;
CREATE POLICY "Gestores editan plantas" ON plantas
  FOR ALL USING (local_id IN (SELECT mis_locales_gestor()))
  WITH CHECK (local_id IN (SELECT mis_locales_gestor()));

-- MESAS: las activas son públicas; el equipo gestor las edita todas.
DROP POLICY IF EXISTS "Mesas activas son públicas" ON mesas;
CREATE POLICY "Mesas activas son públicas" ON mesas
  FOR SELECT USING (activa = true OR local_id IN (SELECT mis_locales()));

DROP POLICY IF EXISTS "Gestores editan mesas" ON mesas;
CREATE POLICY "Gestores editan mesas" ON mesas
  FOR ALL USING (local_id IN (SELECT mis_locales_gestor()))
  WITH CHECK (local_id IN (SELECT mis_locales_gestor()));

-- RESERVAS: el usuario ve/crea/cancela las suyas; el equipo del local ve y gestiona las de su local.
DROP POLICY IF EXISTS "Usuario ve sus reservas" ON reservas;
CREATE POLICY "Usuario ve sus reservas" ON reservas
  FOR SELECT USING (usuario_id = mi_usuario_id());

DROP POLICY IF EXISTS "Usuario crea sus reservas" ON reservas;
CREATE POLICY "Usuario crea sus reservas" ON reservas
  FOR INSERT WITH CHECK (usuario_id = mi_usuario_id());

DROP POLICY IF EXISTS "Usuario actualiza sus reservas" ON reservas;
CREATE POLICY "Usuario actualiza sus reservas" ON reservas
  FOR UPDATE USING (usuario_id = mi_usuario_id())
  WITH CHECK (usuario_id = mi_usuario_id());

DROP POLICY IF EXISTS "Equipo ve reservas del local" ON reservas;
CREATE POLICY "Equipo ve reservas del local" ON reservas
  FOR SELECT USING (local_id IN (SELECT mis_locales()));

DROP POLICY IF EXISTS "Equipo gestiona reservas del local" ON reservas;
CREATE POLICY "Equipo gestiona reservas del local" ON reservas
  FOR UPDATE USING (local_id IN (SELECT mis_locales()))
  WITH CHECK (local_id IN (SELECT mis_locales()));

-- Admin tiene acceso total (consistente con el resto del esquema).
DROP POLICY IF EXISTS "Admin gestiona plantas" ON plantas;
CREATE POLICY "Admin gestiona plantas" ON plantas FOR ALL USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin gestiona mesas" ON mesas;
CREATE POLICY "Admin gestiona mesas" ON mesas FOR ALL USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admin gestiona reservas" ON reservas;
CREATE POLICY "Admin gestiona reservas" ON reservas FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── 6. Triggers updated_at (reutiliza touch_updated_at de la 011) ──
DROP TRIGGER IF EXISTS trg_plantas_touch ON plantas;
CREATE TRIGGER trg_plantas_touch BEFORE UPDATE ON plantas
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_mesas_touch ON mesas;
CREATE TRIGGER trg_mesas_touch BEFORE UPDATE ON mesas
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_reservas_touch ON reservas;
CREATE TRIGGER trg_reservas_touch BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 7. Realtime para la vista de sala en vivo ─────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reservas;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_bar;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
