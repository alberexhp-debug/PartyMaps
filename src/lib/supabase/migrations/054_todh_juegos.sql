-- =============================================
-- MIGRACIÓN 054 — TODH · Catálogo de JUEGOS (lo gestiona Admin)
-- Primera migración del pivote a torneos (TODH). Crea el catálogo de juegos
-- soportados y siembra los 6 iniciales (alineados con src/lib/torneos/sample.ts).
-- Los TOs pueden PROPONER juegos nuevos (estado 'propuesto'); Admin los aprueba.
-- Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS juegos (
  id           TEXT PRIMARY KEY,                 -- slug estable: 'smash', 'magic'…
  nombre       TEXT NOT NULL,
  corto        TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#B6FF3A',  -- color de marca del juego
  emoji        TEXT,
  activo       BOOLEAN NOT NULL DEFAULT true,
  -- Reglas de torneo por defecto del juego
  formatos     TEXT[] NOT NULL DEFAULT '{}',     -- formatos permitidos (slugs)
  regla_reporte TEXT NOT NULL DEFAULT 'consenso' CHECK (regla_reporte IN ('consenso','arbitro','auto')),
  bo_default   TEXT NOT NULL DEFAULT 'bo3',      -- best-of por defecto
  tiebreakers  JSONB NOT NULL DEFAULT '[]'::jsonb, -- orden de desempates (suizo)
  -- Flujo de propuestas de TO
  estado       TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','propuesto','archivado')),
  propuesto_por UUID REFERENCES rrpp(id) ON DELETE SET NULL,
  orden        INTEGER NOT NULL DEFAULT 0,       -- orden de aparición en catálogo
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_juegos_activo ON juegos(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_juegos_estado ON juegos(estado);

-- RLS: lectura pública del catálogo; la escritura va por endpoints con
-- service_role tras verificar rol admin (patrón del proyecto, ver mig. 049).
ALTER TABLE juegos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Catálogo de juegos es público" ON juegos;
CREATE POLICY "Catálogo de juegos es público" ON juegos
  FOR SELECT USING (true);

-- Semilla: los 6 juegos del MVP (mismos ids/colores que el demo sample.ts).
INSERT INTO juegos (id, nombre, corto, color, emoji, formatos, bo_default, orden) VALUES
  ('smash',   'Super Smash Bros. Ultimate', 'Smash',   '#E63E54', '⚔️',
     ARRAY['doble_eliminacion','eliminacion_simple','pools_topcut']::text[], 'bo3', 1),
  ('magic',   'Magic: The Gathering',       'Magic',   '#F4912B', '🃏',
     ARRAY['suizo','round_robin','pools_topcut']::text[], 'bo3', 2),
  ('pokemon', 'Pokémon TCG',                'Pokémon', '#FFC83D', '⚡',
     ARRAY['suizo','pools_topcut']::text[], 'bo3', 3),
  ('tft',     'Teamfight Tactics',          'TFT',     '#4F8EF7', '♟️',
     ARRAY['pools_topcut','suizo']::text[], 'bo1', 4),
  ('tekken',  'Tekken 8',                   'Tekken',  '#9B5DE5', '👊',
     ARRAY['doble_eliminacion','eliminacion_simple']::text[], 'bo3', 5),
  ('sf6',     'Street Fighter 6',           'SF6',     '#2EC4B6', '🥊',
     ARRAY['doble_eliminacion','eliminacion_simple','pools_topcut']::text[], 'bo3', 6),
  ('valorant','VALORANT',                   'Valorant','#FF4655', '🎯',
     ARRAY['doble_eliminacion','pools_topcut','suizo']::text[], 'bo3', 7),
  ('lol',     'League of Legends',          'LoL',     '#0AC8B9', '🛡️',
     ARRAY['doble_eliminacion','pools_topcut','round_robin']::text[], 'bo3', 8),
  ('cod',     'Call of Duty',               'CoD',     '#E8913A', '💥',
     ARRAY['doble_eliminacion','eliminacion_simple']::text[], 'bo3', 9)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  corto = EXCLUDED.corto,
  color = EXCLUDED.color,
  emoji = EXCLUDED.emoji,
  formatos = EXCLUDED.formatos,
  orden = EXCLUDED.orden;
