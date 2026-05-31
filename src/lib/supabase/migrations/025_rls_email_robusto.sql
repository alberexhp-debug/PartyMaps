-- =============================================
-- MIGRACIÓN 025 — RLS de equipo robusta al email (case/espacios)
-- Las funciones mis_locales() y mis_locales_gestor() comparaban
-- `email = auth.email()` de forma EXACTA. Si un usuario_local quedó con el
-- email en otra capitalización o con espacios (p.ej. un registro de local que
-- guardó form.email sin normalizar), `auth.email()` (que Supabase guarda en
-- minúsculas) no casaba y la RLS bloqueaba INSERT/UPDATE de mesas, plantas,
-- productos, etc. (síntoma: "new row violates row-level security policy").
--
-- Aquí comparamos con lower(trim(...)) en ambos lados. Idempotente y seguro.
-- =============================================

CREATE OR REPLACE FUNCTION mis_locales()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT local_id FROM usuario_local
  WHERE lower(trim(email)) = lower(trim(auth.email())) AND activo = true
$$;

CREATE OR REPLACE FUNCTION mis_locales_gestor()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT local_id FROM usuario_local
  WHERE lower(trim(email)) = lower(trim(auth.email())) AND activo = true
    AND rol IN ('dueno', 'gestor')
$$;

-- Normaliza de paso los emails ya guardados (a minúsculas y sin espacios)
-- para que cualquier dato existente quede coherente.
UPDATE usuario_local
SET email = lower(trim(email))
WHERE email IS NOT NULL AND email <> lower(trim(email));
