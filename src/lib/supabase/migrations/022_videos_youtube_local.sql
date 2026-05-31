-- =============================================
-- MIGRACIÓN 022 — Vídeos de YouTube del local (mini-web)
-- El dueño puede añadir hasta 3 vídeos que se muestran en la página del local.
-- Idempotente.
-- =============================================

ALTER TABLE locales ADD COLUMN IF NOT EXISTS videos_youtube TEXT[] DEFAULT '{}';
