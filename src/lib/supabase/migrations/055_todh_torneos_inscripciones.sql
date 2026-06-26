-- =============================================
-- MIGRACIÓN 055 — TODH · TORNEOS + INSCRIPCIONES + seguimiento de organizadores
-- El corazón del producto: un TO (rrpp) publica un torneo de un juego, opcionalmente
-- alojado en una sede (local). Los usuarios se inscriben (con QR offline reutilizando
-- el patrón de `entradas`). Reglas en DEFINICION_TOD.md §4 y DISENO_TODH.md §6.
-- Idempotente.
-- =============================================

-- ---------- TORNEOS ----------
CREATE TABLE IF NOT EXISTS torneos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          TEXT NOT NULL,
  juego_id        TEXT NOT NULL REFERENCES juegos(id),
  organizador_id  UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id        UUID REFERENCES locales(id) ON DELETE SET NULL,  -- NULL si es online
  online          BOOLEAN NOT NULL DEFAULT false,

  formato         TEXT NOT NULL DEFAULT 'doble_eliminacion'
                    CHECK (formato IN ('doble_eliminacion','eliminacion_simple','suizo','round_robin','pools_topcut')),
  best_of         JSONB NOT NULL DEFAULT '{"default":"bo3"}'::jsonb,  -- bo por fase
  fecha           TIMESTAMPTZ NOT NULL,
  check_in_obligatorio BOOLEAN NOT NULL DEFAULT true,
  stream_url      TEXT,

  plazas          INTEGER NOT NULL DEFAULT 32 CHECK (plazas > 0),
  precio          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  vip_tier        TEXT CHECK (vip_tier IN ('Oro','Diamante','Platino')),  -- NULL = abierto

  -- Bote / premios. El reparto es un preset (jsonb): [{puesto:1,pct:70}…] o fijos.
  bote_tipo       TEXT NOT NULL DEFAULT 'porcentaje'
                    CHECK (bote_tipo IN ('porcentaje','fijo','producto','mixto')),
  reparto         JSONB NOT NULL DEFAULT '[{"puesto":1,"pct":70},{"puesto":2,"pct":20},{"puesto":3,"pct":10}]'::jsonb,

  descripcion     TEXT,
  reglas          JSONB NOT NULL DEFAULT '[]'::jsonb,
  seeding_congelado BOOLEAN NOT NULL DEFAULT false,

  estado          TEXT NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador','publicado','en_curso','finalizado','cancelado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_torneos_juego ON torneos(juego_id);
CREATE INDEX IF NOT EXISTS idx_torneos_organizador ON torneos(organizador_id);
CREATE INDEX IF NOT EXISTS idx_torneos_local ON torneos(local_id) WHERE local_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_torneos_estado_fecha ON torneos(estado, fecha);

ALTER TABLE torneos ENABLE ROW LEVEL SECURITY;
-- Lectura pública de los torneos ya publicados (Explorar/ficha/mapa anónimos).
DROP POLICY IF EXISTS "Torneos publicados son públicos" ON torneos;
CREATE POLICY "Torneos publicados son públicos" ON torneos
  FOR SELECT USING (estado IN ('publicado','en_curso','finalizado'));
-- El organizador dueño ve también sus borradores/cancelados.
DROP POLICY IF EXISTS "El TO ve sus propios torneos" ON torneos;
CREATE POLICY "El TO ve sus propios torneos" ON torneos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rrpp r JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.id = torneos.organizador_id AND u.auth_id = auth.uid()
    )
  );
-- Escritura: por endpoints con service_role tras verificar que es el TO dueño.

-- ---------- INSCRIPCIONES ----------
CREATE TABLE IF NOT EXISTS inscripciones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado          TEXT NOT NULL DEFAULT 'inscrito'
                    CHECK (estado IN ('inscrito','lista_espera','checkin','baja','reembolsado')),
  seed            INTEGER,
  datos_competitivos JSONB NOT NULL DEFAULT '{}'::jsonb,  -- main / decklist según juego
  pagado          BOOLEAN NOT NULL DEFAULT false,
  importe         NUMERIC(10,2) NOT NULL DEFAULT 0,        -- precio + comisión cobrada
  comision        NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_payment_intent TEXT,
  qr_code         TEXT UNIQUE,                             -- patrón de `entradas` (offline)
  checkin_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (torneo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_torneo ON inscripciones(torneo_id, estado);
CREATE INDEX IF NOT EXISTS idx_inscripciones_usuario ON inscripciones(usuario_id);

ALTER TABLE inscripciones ENABLE ROW LEVEL SECURITY;
-- El usuario ve y consulta sus propias inscripciones.
DROP POLICY IF EXISTS "El usuario ve sus inscripciones" ON inscripciones;
CREATE POLICY "El usuario ve sus inscripciones" ON inscripciones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = inscripciones.usuario_id AND u.auth_id = auth.uid())
  );
-- El organizador del torneo ve la lista de inscritos de su torneo.
DROP POLICY IF EXISTS "El TO ve los inscritos de su torneo" ON inscripciones;
CREATE POLICY "El TO ve los inscritos de su torneo" ON inscripciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM torneos t JOIN rrpp r ON r.id = t.organizador_id
        JOIN usuarios u ON u.id = r.usuario_id
      WHERE t.id = inscripciones.torneo_id AND u.auth_id = auth.uid()
    )
  );

-- ---------- SEGUIMIENTO DE ORGANIZADORES ----------
-- "Sigo" a un TO → atribución + aviso de nuevos torneos (DISENO §4).
CREATE TABLE IF NOT EXISTS seguimientos_organizador (
  usuario_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  organizador_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, organizador_id)
);
CREATE INDEX IF NOT EXISTS idx_seg_org_organizador ON seguimientos_organizador(organizador_id);

ALTER TABLE seguimientos_organizador ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "El usuario gestiona sus seguimientos" ON seguimientos_organizador;
CREATE POLICY "El usuario gestiona sus seguimientos" ON seguimientos_organizador
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = seguimientos_organizador.usuario_id AND u.auth_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = seguimientos_organizador.usuario_id AND u.auth_id = auth.uid())
  );
