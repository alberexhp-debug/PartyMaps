-- =============================================
-- MIGRACIÓN 052 — Tanda 08/06 (varias features juntas para no aplicar de una en una)
-- =============================================

-- §2.1 — Etiqueta de puesto: el local pone un nombre propio al rol del trabajador
-- ("Jefe de sala", "Coordinador"…). Los PERMISOS siguen viniendo del rol base
-- (usuario_local.rol); esto es solo el nombre que se muestra.
ALTER TABLE usuario_local ADD COLUMN IF NOT EXISTS rol_etiqueta TEXT;
COMMENT ON COLUMN usuario_local.rol_etiqueta IS 'Nombre de puesto personalizado del local. Solo display; los permisos vienen de rol.';
