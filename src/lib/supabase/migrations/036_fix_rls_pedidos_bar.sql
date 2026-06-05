-- =============================================
-- MIGRACIÓN 036 — Fix RLS pedidos_bar (auth.users)
-- La policy "Trabajadores ven pedidos de su local" (creada en 011) seguía
-- haciendo JOIN a auth.users. El rol `authenticated` no tiene privilegio sobre
-- auth.users, así que Postgres lanza 42501 ("permission denied for table users")
-- al evaluar CUALQUIER SELECT de pedidos_bar → el dashboard del local recibe 403
-- (rompe el KPI de barra). La 018 ya aplicó este mismo arreglo a productos_local,
-- pero a pedidos_bar se le quedó sin migrar.
--
-- Arreglo (patrón seguro del proyecto): comparar el email del JWT sin tocar
-- auth.users. Idempotente.
-- =============================================

DROP POLICY IF EXISTS "Trabajadores ven pedidos de su local" ON pedidos_bar;
CREATE POLICY "Trabajadores ven pedidos de su local" ON pedidos_bar
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = pedidos_bar.local_id
        AND lower(trim(ul.email)) = lower(trim(auth.email()))
        AND ul.activo = true
    )
  );
