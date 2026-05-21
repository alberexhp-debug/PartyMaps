-- =============================================
-- MIGRACIÓN 007 — Configuración del sistema + locales pioneros Madrid
-- Idempotente.
-- =============================================

-- 1. Valores definitivos de configuración (Doc8 + decisiones del usuario)
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('comision_porcentaje', '8', 'Comisión % sobre precio_local. Se SUMA al precio que paga el usuario'),
  ('precio_tier_pro', '49', 'Precio mensual tier Pro en euros'),
  ('precio_tier_destacado', '149', 'Precio mensual tier Destacado en euros'),
  ('precio_boost_48h', '19', 'Precio del boost de evento puntual 48h en euros'),
  ('precio_boost_72h', '27', 'Precio del boost de evento puntual 72h en euros'),
  ('precio_notif_patrocinada_1000', '5', 'Precio por 1000 destinatarios de notificación patrocinada'),
  ('reembolso_horas_antes', '24', 'Cancelación gratuita hasta X horas antes del evento'),
  ('reembolso_devuelve_comision', 'false', 'Si la comisión se devuelve al cancelar'),
  ('radio_verificacion_default', '100', 'Radio GPS de verificación de presencia por defecto en metros'),
  ('horas_expiracion_chat', '12', 'Horas tras evento para borrar chat de plan')
ON CONFLICT (clave) DO UPDATE SET
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = NOW();

-- Limpieza de claves obsoletas (la comisión ahora es única)
DELETE FROM configuracion_sistema
WHERE clave IN ('comision_basico', 'comision_pro', 'comision_destacado');

-- 2. Locales pioneros icónicos de Madrid en estado 'activo' tier Pro
--    Sirven como demo del mapa y se pueden ajustar / borrar luego desde el admin.
INSERT INTO locales (
  id, nombre, descripcion, tipo_local, musica, direccion, ciudad,
  latitud, longitud, radio_verificacion_metros, aforo_maximo,
  precio_entrada_min, precio_entrada_max, imagenes, tier, modulos_activos,
  consumiciones_bienvenida, horario, estado, aforo_estimado_porcentaje,
  num_suscriptores, notificaciones_semana_count
)
VALUES
  (
    uuid_generate_v4(),
    'Kapital', 'Templo del ocio nocturno madrileño: 7 plantas, 7 ambientes distintos, de techno a reggaeton.',
    'discoteca', ARRAY['techno','house','reggaeton','pop']::text[],
    'Calle de Atocha 125, 28012 Madrid', 'Madrid',
    40.4055, -3.6929, 100, 2500, 18, 25,
    ARRAY['https://images.unsplash.com/photo-1571266028243-d220c6dca1e6?w=800'],
    'pro', ARRAY['concurso','perfil_noche','retos']::text[],
    '[]'::jsonb,
    '{"jueves":{"apertura":"23:30","cierre":"06:00"},"viernes":{"apertura":"23:30","cierre":"07:00"},"sabado":{"apertura":"23:30","cierre":"07:00"}}'::jsonb,
    'activo', 55, 0, 0
  ),
  (
    uuid_generate_v4(),
    'Teatro Barceló', 'Sala histórica en Tribunal con sesiones de música electrónica y eventos especiales.',
    'discoteca', ARRAY['house','electronica','indie']::text[],
    'Calle de Barceló 11, 28004 Madrid', 'Madrid',
    40.4274, -3.6996, 100, 1500, 15, 20,
    ARRAY['https://images.unsplash.com/photo-1542628682-88321d2a4828?w=800'],
    'pro', ARRAY['concurso','perfil_noche']::text[],
    '[]'::jsonb,
    '{"jueves":{"apertura":"23:00","cierre":"06:00"},"viernes":{"apertura":"23:30","cierre":"06:30"},"sabado":{"apertura":"23:30","cierre":"06:30"}}'::jsonb,
    'activo', 62, 0, 0
  ),
  (
    uuid_generate_v4(),
    'Mondo Disko', 'Club referente del techno en Madrid. Sets largos y selección de DJs internacionales.',
    'discoteca', ARRAY['techno','house','electronica']::text[],
    'Calle de Arlabán 7, 28014 Madrid', 'Madrid',
    40.4170, -3.6997, 100, 900, 15, 20,
    ARRAY['https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=800'],
    'pro', ARRAY['concurso','perfil_noche','retos']::text[],
    '[]'::jsonb,
    '{"viernes":{"apertura":"00:00","cierre":"07:00"},"sabado":{"apertura":"00:00","cierre":"07:00"}}'::jsonb,
    'activo', 48, 0, 0
  ),
  (
    uuid_generate_v4(),
    'Bling Bling', 'Discoteca de moda en pleno centro. Mezcla de pop, comercial y reggaeton.',
    'discoteca', ARRAY['pop','reggaeton','hip_hop']::text[],
    'Calle de Génova 28, 28004 Madrid', 'Madrid',
    40.4288, -3.6952, 100, 700, 15, 20,
    ARRAY['https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800'],
    'pro', ARRAY['perfil_noche','retos']::text[],
    '[]'::jsonb,
    '{"jueves":{"apertura":"00:00","cierre":"06:00"},"viernes":{"apertura":"00:00","cierre":"06:30"},"sabado":{"apertura":"00:00","cierre":"06:30"}}'::jsonb,
    'activo', 70, 0, 0
  ),
  (
    uuid_generate_v4(),
    'Joy Eslava', 'Una de las salas más icónicas de Madrid. Eventos temáticos y noches universitarias.',
    'discoteca', ARRAY['pop','reggaeton','indie']::text[],
    'Calle del Arenal 11, 28013 Madrid', 'Madrid',
    40.4170, -3.7080, 100, 1800, 12, 18,
    ARRAY['https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800'],
    'destacado', ARRAY['concurso','perfil_noche','retos']::text[],
    '[]'::jsonb,
    '{"jueves":{"apertura":"23:30","cierre":"06:00"},"viernes":{"apertura":"23:30","cierre":"06:00"},"sabado":{"apertura":"23:30","cierre":"06:00"}}'::jsonb,
    'activo', 58, 0, 0
  )
ON CONFLICT DO NOTHING;
