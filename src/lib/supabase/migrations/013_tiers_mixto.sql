-- =============================================
-- Migración 013: Modelo de tiers mixto (suscripción + comisión)
-- ─────────────────────────────────────────────────────────
-- Antes: 3 tiers (basico/pro/destacado) + comisión fija 8% para todos.
-- Ahora: 4 tiers, cada uno con su % de comisión + cuota mensual:
--   visibility:  0€/mes, 0%   (solo aparece en mapa, no vende)
--   venta:       0€/mes, 4%   (gratis mensual, ideal para empezar)
--   pro:        49€/mes, 2.5% (break-even ~3.300€/mes en ventas)
--   destacado: 149€/mes, 1.5% (break-even ~10.000€/mes + posicionamiento)
--
-- Tope absoluto: 3€ por transacción.
-- Reembolsos: NO cobran comisión (solo venta consumada).
--
-- Idempotente. 'basico' se mantiene como alias legacy de 'venta'.
-- =============================================

-- ── 1. CHECK constraint del tier — ampliar a 5 valores ──────────
DO $$
BEGIN
  -- Buscar y soltar el constraint actual (cualquiera sea su nombre)
  BEGIN
    ALTER TABLE locales DROP CONSTRAINT IF EXISTS locales_tier_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  ALTER TABLE locales ADD CONSTRAINT locales_tier_check
    CHECK (tier IN ('visibility', 'venta', 'basico', 'pro', 'destacado'));
END $$;

-- Default de tier para nuevos locales: 'visibility' (alta gratis, sin venta).
ALTER TABLE locales ALTER COLUMN tier SET DEFAULT 'visibility';

-- ── 2. Free trial Pro: si el local se da de alta en Pro, le damos 3 meses gratis
ALTER TABLE locales
  ADD COLUMN IF NOT EXISTS tier_trial_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comision_porcentaje_override NUMERIC(4, 2);

COMMENT ON COLUMN locales.tier_trial_until IS
  'Fecha hasta la que el local disfruta el tier actual gratis. NULL = no hay trial.';
COMMENT ON COLUMN locales.comision_porcentaje_override IS
  'Comisión personalizada para este local (overrides el tier). Solo casos VIP, gestionado por admin.';

-- ── 3. Configuración del sistema — añadir nuevos parámetros ───────
-- Estructura: cada fila es clave -> valor (texto que parseamos en runtime).
-- La tabla configuracion_sistema ya existe (migración 007). Aquí solo UPSERT.

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('comision_visibility', '0',     'Comisión % del tier visibility (no vende)'),
  ('comision_venta',      '4.0',   'Comisión % del tier venta (gratis mensual)'),
  ('comision_pro',        '2.5',   'Comisión % del tier pro'),
  ('comision_destacado',  '1.5',   'Comisión % del tier destacado'),
  ('comision_max_trans',  '3.0',   'Comisión máxima absoluta por transacción (€)'),
  ('precio_tier_visibility', '0',    'Cuota mensual € del tier visibility'),
  ('precio_tier_venta',      '0',    'Cuota mensual € del tier venta'),
  ('precio_tier_pro',        '49',   'Cuota mensual € del tier pro'),
  ('precio_tier_destacado',  '149',  'Cuota mensual € del tier destacado'),
  ('trial_pro_meses',        '3',    'Meses gratis al subir a Pro como onboarding')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

-- ── 4. Migración de locales existentes ────────────────────────────
-- Cualquier local con tier='basico' pasa a 'venta' (es el mismo concepto: gratis
-- mensual + comisión, pero con porcentaje reducido del 8% → 4%).
-- No tocamos los 'pro' ni 'destacado' (ya tenían su tier correcto).
-- (No forzamos UPDATE porque 'basico' sigue siendo válido como alias en runtime.)

-- ── 5. Función helper: comisión efectiva de un local ──────────────
-- Devuelve el % de comisión que debe aplicarse al local, considerando override.
CREATE OR REPLACE FUNCTION comision_porcentaje_de(local_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  l RECORD;
  pct NUMERIC;
BEGIN
  SELECT tier, comision_porcentaje_override INTO l FROM locales WHERE id = local_id_param;
  IF NOT FOUND THEN RETURN 4.0; END IF;
  IF l.comision_porcentaje_override IS NOT NULL THEN
    RETURN l.comision_porcentaje_override;
  END IF;
  pct := CASE l.tier
    WHEN 'visibility' THEN 0
    WHEN 'venta'      THEN 4.0
    WHEN 'basico'     THEN 4.0
    WHEN 'pro'        THEN 2.5
    WHEN 'destacado'  THEN 1.5
    ELSE 4.0
  END;
  RETURN pct;
END;
$$ LANGUAGE plpgsql STABLE;
