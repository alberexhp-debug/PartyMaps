-- =============================================
-- MIGRACIÓN 048 — Realtime para la mensajería (Mensajes PR-2)
-- Habilita Supabase Realtime en las tablas de chat para que la bandeja y los
-- hilos se actualicen al instante (sin depender del sondeo). La RLS de cada
-- tabla (migración 027 / 035) sigue mandando: cada quien solo recibe los
-- cambios de las filas que puede leer. Idempotente.
-- =============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensajes_rrpp'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_rrpp;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensajes_trabajador'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_trabajador;
  END IF;
END $$;
