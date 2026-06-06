-- =============================================
-- MIGRACIÓN 038 — Consentimiento de marketing POR LOCAL (PR-1 del CRM)
-- Base legal del marketing (RGPD): el usuario acepta que UN local concreto le
-- mande promos. Es distinto del `contactos.consentimiento_marketing` (global de
-- RRPP) y de las cookies. Se captura en checkout (entrada/barra/reserva),
-- taquilla, lista de RRPP y se retira desde el perfil o una baja de email.
--
-- HISTÓRICO append-only: cada cambio = fila nueva; NUNCA se borra (es la prueba
-- ante la AEPD). El consentimiento VIGENTE es la última fila por fecha para
-- cada (identidad, local). Identidad = usuario_id (registrado) o contacto_id
-- (lead de taquilla sin cuenta).
-- Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS consentimientos_marketing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  contacto_id UUID REFERENCES contactos(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  estado TEXT NOT NULL CHECK (estado IN ('acepta', 'retira')),
  origen TEXT NOT NULL CHECK (origen IN (
    'checkout_entrada', 'checkout_bar', 'checkout_reserva', 'taquilla',
    'lista_rrpp', 'perfil_usuario', 'importado_declarado', 'baja_email'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT consent_identidad CHECK (usuario_id IS NOT NULL OR contacto_id IS NOT NULL)
);

-- Resolver "el vigente" = última fila por (identidad, local). Los índices van
-- por created_at DESC para esa consulta.
CREATE INDEX IF NOT EXISTS idx_consent_usuario ON consentimientos_marketing (usuario_id, local_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_contacto ON consentimientos_marketing (contacto_id, local_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_local ON consentimientos_marketing (local_id, created_at DESC);

ALTER TABLE consentimientos_marketing ENABLE ROW LEVEL SECURITY;

-- El usuario ve su propio historial (perfil → "Locales que me pueden contactar").
DROP POLICY IF EXISTS "Usuario ve sus consentimientos" ON consentimientos_marketing;
CREATE POLICY "Usuario ve sus consentimientos" ON consentimientos_marketing
  FOR SELECT USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- Dueño/gestor del local ven los de su local (para el CRM). Email del JWT, sin
-- tocar auth.users (patrón seguro del proyecto).
DROP POLICY IF EXISTS "Gestores ven consentimientos del local" ON consentimientos_marketing;
CREATE POLICY "Gestores ven consentimientos del local" ON consentimientos_marketing
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = consentimientos_marketing.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- Las escrituras van por endpoints con service_role (append-only): sin INSERT/
-- UPDATE/DELETE policies. Nunca se modifica ni borra una fila.
