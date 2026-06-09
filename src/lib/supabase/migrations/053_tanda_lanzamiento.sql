-- =============================================
-- MIGRACIÓN 053 — Tanda de lanzamiento (consolidada)
-- Reúne, en UN solo archivo idempotente y por secciones, todo el SQL de la
-- tanda autónoma rumbo al lanzamiento (25-sep-2026). Aplicar de una sola vez.
-- Cada sección es independiente y re-ejecutable (IF NOT EXISTS / DROP POLICY).
-- El código de la app es "graceful": funciona aunque esta migración aún no
-- esté aplicada (lecturas con respaldo vacío; escrituras detectan 42P01).
-- =============================================

-- ─────────────────────────────────────────────
-- §1 · Chat local ↔ RumboGestor (Mensajes PR-4)
-- Conversación 1-a-1 entre un local y el gestor de Rumbo que lleva su cartera
-- (locales.gestor_id → gestores.id, mig 023). Mismo patrón que mensajes_rrpp.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes_gestor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  gestor_id UUID NOT NULL REFERENCES gestores(id) ON DELETE CASCADE,
  emisor TEXT NOT NULL CHECK (emisor IN ('local', 'gestor')),
  mensaje TEXT NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_gestor_hilo ON mensajes_gestor (local_id, gestor_id, created_at);

ALTER TABLE mensajes_gestor ENABLE ROW LEVEL SECURITY;

-- Trabajadores del local (dueño/gestor del local) ven el hilo de su local.
DROP POLICY IF EXISTS "Trabajadores ven chat con gestor" ON mensajes_gestor;
CREATE POLICY "Trabajadores ven chat con gestor" ON mensajes_gestor
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = mensajes_gestor.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );

-- El RumboGestor ve los hilos de los locales de su cartera.
DROP POLICY IF EXISTS "Gestor ve su chat con locales" ON mensajes_gestor;
CREATE POLICY "Gestor ve su chat con locales" ON mensajes_gestor
  FOR SELECT USING (
    gestor_id IN (
      SELECT g.id FROM gestores g
      WHERE lower(trim(g.email)) = lower(trim(auth.email())) AND g.activo = true
    )
  );

-- Las escrituras van por endpoints con service_role tras verificar identidad y
-- permiso, así que no añadimos INSERT policies (igual que mensajes_rrpp).

-- Realtime para el chat con el gestor (la RLS de arriba scope-a los eventos).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensajes_gestor'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_gestor;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- §2 · Permisos por módulos del equipo (§2.1 avanzado)
-- Override a medida sobre el rol base: { extra: [...zonas], quitar: [...zonas] }.
-- null = exactamente los permisos del rol (comportamiento previo). El código lo
-- lee graceful (login con select * ; la escritura es best-effort).
-- ─────────────────────────────────────────────
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS permisos_override JSONB;
