-- =============================================
-- MIGRACIÓN 041 — Onboarding guiado por perfil (PR-7, doc 01 §10.2)
-- Solo persiste lo que NO se deriva de datos reales: pasos "Revisar" visitados,
-- estado del tour y cadencia de recordatorios. El % del checklist se calcula
-- siempre con los datos reales del local (sin casillas manuales → nunca se
-- desincroniza). Escrituras vía endpoint con service_role. Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS onboarding_estado (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_tipo TEXT NOT NULL CHECK (perfil_tipo IN ('dueno', 'gestor', 'rrpp', 'gestor_rumbo', 'grupo', 'usuario')),
  perfil_id UUID NOT NULL,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE, -- checklist por local (perfiles multi-local)
  tour_visto_at TIMESTAMPTZ,                              -- tour completado o saltado
  pasos_visitados TEXT[] NOT NULL DEFAULT '{}',           -- ids de pasos tipo "Revisar"
  recordatorios_enviados INT NOT NULL DEFAULT 0,          -- tope 3 (doc 01 §8)
  ultimo_recordatorio_at TIMESTAMPTZ,                     -- cadencia 7 días
  completado_celebrado_at TIMESTAMPTZ,                    -- la celebración del 100% se dispara UNA vez
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una fila por (perfil, local). El índice único trata el local nulo como un valor
-- (perfiles sin local) para que el upsert tenga un destino determinista.
CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_perfil_local
  ON onboarding_estado (perfil_tipo, perfil_id, COALESCE(local_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE onboarding_estado ENABLE ROW LEVEL SECURITY;
-- Lecturas y escrituras van por el endpoint /api/onboarding con service_role tras
-- verificar identidad (patrón del proyecto): sin policies de cliente.
