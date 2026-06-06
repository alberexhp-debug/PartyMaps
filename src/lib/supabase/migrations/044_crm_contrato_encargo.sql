-- =============================================
-- MIGRACIÓN 044 — Contrato de encargo art. 28 RGPD (PR-11, doc 02 §9.1)
-- El local (responsable) firma con un click-through que Rumbo (encargado) trata los datos
-- por su cuenta. Sin aceptarlo, las acciones de marketing del CRM quedan bloqueadas.
-- Idempotente.
-- =============================================

ALTER TABLE locales ADD COLUMN IF NOT EXISTS crm_contrato_aceptado_at TIMESTAMPTZ;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS crm_contrato_aceptado_por UUID REFERENCES usuario_local(id) ON DELETE SET NULL;

COMMENT ON COLUMN locales.crm_contrato_aceptado_at IS 'Cuándo se aceptó el contrato de encargo (art. 28 RGPD). NULL = sin aceptar.';
COMMENT ON COLUMN locales.crm_contrato_aceptado_por IS 'Trabajador que aceptó el contrato de encargo.';
