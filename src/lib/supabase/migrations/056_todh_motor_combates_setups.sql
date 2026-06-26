-- =============================================
-- MIGRACIÓN 056 — TODH · MOTOR de torneos: setups + combates + disputas
-- Las estaciones de juego de la sede (setups), el cuadro de combates con avance
-- automático, y las disputas que resuelve el TO. El "Modo Directo" lee/escribe
-- aquí en tiempo real (Supabase Realtime). Reglas en DEFINICION_TOD.md §4.7.
-- Idempotente.
-- =============================================

-- ---------- SETUPS (estaciones de juego de la sede) ----------
-- Sustituyen a las `mesas` nocturnas: consola/PC/mesa/arcade/stream.
CREATE TABLE IF NOT EXISTS setups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id        UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,                 -- "Setup 1", "Mesa A"…
  tipo            TEXT NOT NULL DEFAULT 'consola'
                    CHECK (tipo IN ('consola','pc','mesa','arcade','stream')),
  juegos          TEXT[] NOT NULL DEFAULT '{}',  -- juegos que soporta (ids de juegos)
  es_stream       BOOLEAN NOT NULL DEFAULT false,
  estado          TEXT NOT NULL DEFAULT 'libre'
                    CHECK (estado IN ('libre','ocupado','caido')),
  combate_actual_id UUID,                        -- FK añadida tras crear combates
  orden           INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_setups_local ON setups(local_id);

ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
-- Trabajadores del local ven sus setups (mismo patrón que mesa_sesiones, mig. 049).
DROP POLICY IF EXISTS "Trabajadores ven setups de su local" ON setups;
CREATE POLICY "Trabajadores ven setups de su local" ON setups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = setups.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );

-- ---------- COMBATES (matches del cuadro) ----------
CREATE TABLE IF NOT EXISTS combates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  ronda           TEXT NOT NULL,                 -- 'WB Cuartos', 'LB R2', 'Gran Final'…
  lado            TEXT NOT NULL DEFAULT 'winners'
                    CHECK (lado IN ('winners','losers','final','grupo')),
  orden           INTEGER NOT NULL DEFAULT 0,

  jugador_a       UUID REFERENCES inscripciones(id) ON DELETE SET NULL,
  jugador_b       UUID REFERENCES inscripciones(id) ON DELETE SET NULL,
  score_a         INTEGER NOT NULL DEFAULT 0,
  score_b         INTEGER NOT NULL DEFAULT 0,
  best_of         TEXT NOT NULL DEFAULT 'bo3',

  estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','en_juego','jugado','disputa')),
  ganador         TEXT CHECK (ganador IN ('a','b')),

  setup_id        UUID REFERENCES setups(id) ON DELETE SET NULL,
  -- Reporte por consenso: el ganador reporta, el rival confirma.
  reportado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  confirmado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  reportado_at    TIMESTAMPTZ,

  -- Avance automático del cuadro: a dónde va el ganador (y el perdedor en doble elim.).
  siguiente_combate_id UUID REFERENCES combates(id) ON DELETE SET NULL,
  siguiente_slot       TEXT CHECK (siguiente_slot IN ('a','b')),
  perdedor_combate_id  UUID REFERENCES combates(id) ON DELETE SET NULL,
  perdedor_slot        TEXT CHECK (perdedor_slot IN ('a','b')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_combates_torneo ON combates(torneo_id, lado, orden);
CREATE INDEX IF NOT EXISTS idx_combates_estado ON combates(torneo_id, estado);
CREATE INDEX IF NOT EXISTS idx_combates_setup ON combates(setup_id) WHERE setup_id IS NOT NULL;

-- Ahora sí, cerrar el ciclo setups.combate_actual_id → combates.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_setups_combate_actual'
  ) THEN
    ALTER TABLE setups
      ADD CONSTRAINT fk_setups_combate_actual
      FOREIGN KEY (combate_actual_id) REFERENCES combates(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE combates ENABLE ROW LEVEL SECURITY;
-- El cuadro es público (espectadores ven el bracket en vivo).
DROP POLICY IF EXISTS "Los combates son públicos" ON combates;
CREATE POLICY "Los combates son públicos" ON combates
  FOR SELECT USING (true);
-- Reporte/avance/resolución: por endpoints con service_role tras verificar rol.

-- ---------- DISPUTAS ----------
CREATE TABLE IF NOT EXISTS disputas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  combate_id      UUID NOT NULL REFERENCES combates(id) ON DELETE CASCADE,
  abierta_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  version_a       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- lo que reporta cada lado
  version_b       JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado          TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','resuelta')),
  resuelta_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,  -- el TO
  resultado       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelta_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_disputas_combate ON disputas(combate_id);

ALTER TABLE disputas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Disputas visibles a implicados y TO" ON disputas;
CREATE POLICY "Disputas visibles a implicados y TO" ON disputas
  FOR SELECT USING (true);  -- afinable; el detalle sensible se sirve por endpoint.

-- ---------- REALTIME (Modo Directo en vivo) ----------
-- setups y combates se actualizan en directo entre árbitro, TO y espectadores.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'combates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE combates;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'setups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE setups;
  END IF;
END $$;
