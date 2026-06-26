-- =============================================
-- MIGRACIÓN 057 — TODH · RANKING por juego + temporadas
-- Ranking competitivo por juego y temporada. Se recalcula tras cada torneo
-- finalizado ponderando CALIDAD de rival y de torneo (no victorias brutas).
-- DEFINICION_TOD.md §4 / MODELO_DATOS_TODH.md §1. Idempotente.
-- =============================================

-- Temporadas (ventanas de ranking; cierre da snapshot histórico).
CREATE TABLE IF NOT EXISTS temporadas (
  id          TEXT PRIMARY KEY,                 -- '2026-s1'…
  nombre      TEXT NOT NULL,
  inicio      DATE NOT NULL,
  fin         DATE,
  activa      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE temporadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Temporadas públicas" ON temporadas;
CREATE POLICY "Temporadas públicas" ON temporadas FOR SELECT USING (true);

INSERT INTO temporadas (id, nombre, inicio, activa) VALUES
  ('2026-s1', 'Temporada 2026 · S1', DATE '2026-01-01', true)
ON CONFLICT (id) DO NOTHING;

-- Ranking calculado (tabla materializada que recalcula el motor, no la escribe el usuario).
CREATE TABLE IF NOT EXISTS ranking (
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  juego_id    TEXT NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
  temporada   TEXT NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  rating      NUMERIC(8,1) NOT NULL DEFAULT 1000,
  tier        TEXT NOT NULL DEFAULT 'Bronce'
                CHECK (tier IN ('Bronce','Plata','Oro','Platino','Diamante','Maestro')),
  victorias   INTEGER NOT NULL DEFAULT 0,
  derrotas    INTEGER NOT NULL DEFAULT 0,
  torneos     INTEGER NOT NULL DEFAULT 0,
  pais        TEXT,
  posicion    INTEGER,                          -- ranking nacional cacheado
  posicion_mundial INTEGER,
  tendencia   INTEGER NOT NULL DEFAULT 0,       -- +/- puestos desde el último recálculo
  mejor_puesto INTEGER,
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, juego_id, temporada)
);
CREATE INDEX IF NOT EXISTS idx_ranking_juego_temp ON ranking(juego_id, temporada, rating DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_pais ON ranking(juego_id, temporada, pais, rating DESC);

ALTER TABLE ranking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ranking es público" ON ranking;
CREATE POLICY "Ranking es público" ON ranking FOR SELECT USING (true);
-- Escritura: solo el motor con service_role tras finalizar torneo.
