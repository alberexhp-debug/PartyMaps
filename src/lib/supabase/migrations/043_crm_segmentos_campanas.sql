-- =============================================
-- MIGRACIÓN 043 — Segmentos, exports y campañas del CRM (PR-10, doc 02 §10.1)
-- Los segmentos PRE-CREADOS viven en código (no se siembran por local); aquí solo se
-- guardan los segmentos PROPIOS del local. Exports y campañas dejan auditoría.
-- Escrituras vía endpoints con service_role tras verificar rol. Idempotente.
-- =============================================

-- Segmentos propios (filtros guardados). filtros = lista de condiciones en AND (doc 04 §2.3).
CREATE TABLE IF NOT EXISTS crm_segmentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  emoji TEXT,
  filtros JSONB NOT NULL DEFAULT '[]',
  pre_creado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_segmentos_local ON crm_segmentos (local_id);

-- Auditoría de exportaciones (RGPD §9.4): quién, cuándo, qué filtros, cuántos registros.
CREATE TABLE IF NOT EXISTS crm_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  usuario_local_id UUID REFERENCES usuario_local(id) ON DELETE SET NULL,
  modo TEXT NOT NULL CHECK (modo IN ('operativo', 'marketing')),
  filtros JSONB NOT NULL DEFAULT '[]',
  num_registros INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_exports_local ON crm_exports (local_id, created_at DESC);

-- Campañas (push/email/whatsapp/export) con su resultado para medir el retorno.
CREATE TABLE IF NOT EXISTS crm_campanas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('push', 'email', 'whatsapp', 'cortesia', 'export')),
  segmento_nombre TEXT,
  filtros JSONB NOT NULL DEFAULT '[]',
  titulo TEXT,
  enviados INT NOT NULL DEFAULT 0,
  resultado JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_campanas_local ON crm_campanas (local_id, created_at DESC);

ALTER TABLE crm_segmentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campanas ENABLE ROW LEVEL SECURITY;

-- Lecturas: dueño/gestor del local (email del JWT, sin tocar auth.users). Escrituras: service_role.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_segmentos', 'crm_exports', 'crm_campanas'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Gestores leen %1$s del local" ON %1$s', t);
    EXECUTE format($f$
      CREATE POLICY "Gestores leen %1$s del local" ON %1$s
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM usuario_local ul
            WHERE ul.local_id = %1$s.local_id
              AND lower(trim(ul.email)) = lower(trim(auth.email()))
              AND ul.activo = true AND ul.rol IN ('dueno', 'gestor')
          )
        )
    $f$, t);
  END LOOP;
END $$;
