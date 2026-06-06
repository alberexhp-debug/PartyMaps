-- =============================================
-- MIGRACIÓN 046 — Origen "importado" en contactos (PR-15, doc 02 §5.3)
-- El dueño importa su clientela previa (Excel) bajo declaración responsable; esas fichas
-- llevan fuente_origen='importado' y consentimiento origen='importado_declarado'
-- (distinto del captado por Rumbo → se ve diferente en la ficha). Idempotente.
-- =============================================

ALTER TABLE contactos DROP CONSTRAINT IF EXISTS contactos_fuente_origen_check;
ALTER TABLE contactos ADD CONSTRAINT contactos_fuente_origen_check CHECK (
  fuente_origen IN (
    'checkout_entrada', 'checkout_bar', 'lista_rrpp', 'invitacion_sms', 'invitacion_whatsapp',
    'qr_rrpp', 'registro_directo', 'admin', 'desconocido', 'importado'
  )
);
