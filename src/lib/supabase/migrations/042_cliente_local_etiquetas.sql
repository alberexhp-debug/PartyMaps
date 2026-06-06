-- =============================================
-- MIGRACIÓN 042 — Etiquetas libres del CRM (PR-9, doc 02 §10.1)
-- El local etiqueta a sus clientes ("techno", "grupo grande", "cumple 14/08").
-- Acompaña a cliente_local (migración 033: vip, notas). Idempotente.
-- =============================================

ALTER TABLE cliente_local ADD COLUMN IF NOT EXISTS etiquetas TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN cliente_local.etiquetas IS 'Etiquetas libres que el local pone a un cliente (CRM).';
