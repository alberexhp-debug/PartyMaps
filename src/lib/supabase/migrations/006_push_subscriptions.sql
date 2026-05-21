-- =============================================
-- MIGRACIÓN 006 — push_subscriptions (Web Push real)
-- Idempotente.
-- =============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_usuario ON push_subscriptions(usuario_id);

-- RLS: el usuario solo gestiona sus propias suscripciones.
-- El envío real se hace con service_role desde el backend.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_sub_select_own ON push_subscriptions;
CREATE POLICY push_sub_select_own ON push_subscriptions
  FOR SELECT USING (usuario_id = mi_usuario_id());

DROP POLICY IF EXISTS push_sub_insert_own ON push_subscriptions;
CREATE POLICY push_sub_insert_own ON push_subscriptions
  FOR INSERT WITH CHECK (usuario_id = mi_usuario_id());

DROP POLICY IF EXISTS push_sub_delete_own ON push_subscriptions;
CREATE POLICY push_sub_delete_own ON push_subscriptions
  FOR DELETE USING (usuario_id = mi_usuario_id());
