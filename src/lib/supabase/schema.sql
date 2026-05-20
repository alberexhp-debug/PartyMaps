-- =============================================
-- FOURVENUES 2.0 — ESQUEMA COMPLETO DE BD
-- =============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- TABLA: ciudades
-- =============================================
CREATE TABLE IF NOT EXISTS ciudades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  pais TEXT NOT NULL DEFAULT 'España',
  latitud FLOAT NOT NULL,
  longitud FLOAT NOT NULL,
  zoom_inicial FLOAT DEFAULT 13,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ciudades (nombre, pais, latitud, longitud, zoom_inicial)
VALUES ('Madrid', 'España', 40.4168, -3.7038, 13)
ON CONFLICT DO NOTHING;

-- =============================================
-- TABLA: configuracion_sistema
-- =============================================
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('comision_basico', '7', 'Comisión % tier básico'),
  ('comision_pro', '6', 'Comisión % tier pro'),
  ('comision_destacado', '5', 'Comisión % tier destacado'),
  ('precio_tier_pro', '69', 'Precio mensual tier Pro en euros'),
  ('precio_tier_destacado', '169', 'Precio mensual tier Destacado en euros'),
  ('radio_verificacion_default', '100', 'Radio por defecto verificación de presencia en metros'),
  ('radio_verificacion_min', '50', 'Radio mínimo permitido en metros'),
  ('radio_verificacion_max', '300', 'Radio máximo permitido en metros'),
  ('limite_notif_basico_semana', '2', 'Máximo notificaciones manuales semana tier básico'),
  ('horas_expiracion_chat', '12', 'Horas hasta eliminar chat de plan'),
  ('horas_validez_link_pago', '12', 'Horas validez link pago grupal por defecto'),
  ('reduccion_aforo_lluvia', '20', 'Reducción % estimación aforo con lluvia'),
  ('umbral_moderacion_rechazo', '0.8', 'Puntuación riesgo rechazo automático'),
  ('umbral_moderacion_revision', '0.5', 'Puntuación riesgo revisión manual'),
  ('reportes_suspension_auto', '5', 'Reportes validados para suspensión automática'),
  ('horas_bloqueo_intentos', '0.5', 'Horas bloqueo por intentos fallidos login admin'),
  ('boost_48h_precio', '20', 'Precio boost 48 horas en euros'),
  ('boost_72h_precio', '30', 'Precio boost 72 horas en euros')
ON CONFLICT (clave) DO NOTHING;

-- =============================================
-- TABLA: usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  telefono TEXT UNIQUE,
  telefono_verificado BOOLEAN DEFAULT false,
  nombre TEXT NOT NULL,
  foto_perfil_url TEXT,
  fecha_nacimiento DATE NOT NULL,
  reputacion_puntuacion FLOAT,
  reputacion_num_valoraciones INTEGER DEFAULT 0,
  estado_cuenta TEXT NOT NULL DEFAULT 'activa' CHECK (estado_cuenta IN ('activa', 'suspendida_temporal', 'suspendida_permanente', 'eliminada')),
  motivo_suspension TEXT,
  suspension_hasta TIMESTAMPTZ,
  prefs_notificaciones JSONB DEFAULT '{"eventos":true,"promos":true,"planes":true,"sistema":true,"patrocinadas":true}',
  metodo_pago_id TEXT,
  auth_provider TEXT DEFAULT 'ninguno',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefono ON usuarios(telefono);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado_cuenta);

-- =============================================
-- TABLA: locales
-- =============================================
CREATE TABLE IF NOT EXISTS locales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_local TEXT NOT NULL CHECK (tipo_local IN ('discoteca','bar_copas','rooftop','sala_conciertos','bar_cocteleria','otro')),
  musica TEXT[] DEFAULT '{}',
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL DEFAULT 'Madrid',
  latitud FLOAT NOT NULL,
  longitud FLOAT NOT NULL,
  radio_verificacion_metros INTEGER DEFAULT 100,
  aforo_maximo INTEGER NOT NULL,
  horario JSONB DEFAULT '{}',
  precio_entrada_min FLOAT DEFAULT 0,
  precio_entrada_max FLOAT,
  imagenes TEXT[] DEFAULT '{}',
  tier TEXT NOT NULL DEFAULT 'basico' CHECK (tier IN ('basico','pro','destacado')),
  tier_fecha_inicio TIMESTAMPTZ,
  tier_fecha_fin TIMESTAMPTZ,
  cif TEXT,
  email_facturacion TEXT,
  stripe_account_id TEXT,
  modulos_activos TEXT[] DEFAULT '{}',
  consumiciones_bienvenida JSONB DEFAULT '[]',
  num_suscriptores INTEGER DEFAULT 0,
  notificaciones_semana_count INTEGER DEFAULT 0,
  notificaciones_semana_reset TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT NOT NULL DEFAULT 'pendiente_verificacion' CHECK (estado IN ('pendiente_verificacion','activo','suspendido','eliminado')),
  verificado_por UUID,
  aforo_estimado_porcentaje FLOAT DEFAULT 0,
  aforo_estimado_at TIMESTAMPTZ,
  aforo_correccion_manual FLOAT,
  aforo_correccion_manual_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locales_estado ON locales(estado);
CREATE INDEX IF NOT EXISTS idx_locales_ciudad ON locales(ciudad);
CREATE INDEX IF NOT EXISTS idx_locales_tier ON locales(tier);
CREATE INDEX IF NOT EXISTS idx_locales_coords ON locales(latitud, longitud);

-- =============================================
-- TABLA: usuario_local (roles del panel)
-- =============================================
CREATE TABLE IF NOT EXISTS usuario_local (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('dueno','gestor','operador_noche','puerta')),
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, local_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_local_local ON usuario_local(local_id);
CREATE INDEX IF NOT EXISTS idx_usuario_local_email ON usuario_local(email);

-- =============================================
-- TABLA: invitaciones_trabajador
-- =============================================
CREATE TABLE IF NOT EXISTS invitaciones_trabajador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  rol TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  usado BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: eventos
-- =============================================
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tematica TEXT,
  descripcion TEXT,
  imagen_url TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ,
  aforo_maximo INTEGER NOT NULL,
  dress_code TEXT,
  precio_base FLOAT NOT NULL DEFAULT 0,
  precio_maximo FLOAT,
  precio_early_bird FLOAT,
  early_bird_hasta TIMESTAMPTZ,
  early_bird_cupo INTEGER,
  early_bird_vendidos INTEGER DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','publicado','cancelado','finalizado')),
  entradas_vendidas INTEGER DEFAULT 0,
  modulos_activos TEXT[] DEFAULT '{}',
  configuracion_modulos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_local ON eventos(local_id);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON eventos(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha_inicio);

-- =============================================
-- TABLA: entradas
-- =============================================
CREATE TABLE IF NOT EXISTS entradas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  local_id UUID NOT NULL REFERENCES locales(id),
  evento_id UUID REFERENCES eventos(id),
  grupo_pago_id UUID,
  precio_local FLOAT NOT NULL,
  comision_plataforma FLOAT NOT NULL,
  precio_total FLOAT NOT NULL,
  consumicion_id TEXT,
  consumicion_canjeada BOOLEAN DEFAULT false,
  consumicion_canjeada_at TIMESTAMPTZ,
  consumicion_canjeada_por UUID,
  qr_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','usada','cancelada','expirada')),
  usado_at TIMESTAMPTZ,
  usado_por UUID,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entradas_usuario ON entradas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_entradas_local ON entradas(local_id);
CREATE INDEX IF NOT EXISTS idx_entradas_evento ON entradas(evento_id);
CREATE INDEX IF NOT EXISTS idx_entradas_qr ON entradas(qr_code);
CREATE INDEX IF NOT EXISTS idx_entradas_grupo ON entradas(grupo_pago_id);

-- =============================================
-- TABLA: grupos_pago
-- =============================================
CREATE TABLE IF NOT EXISTS grupos_pago (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizador_id UUID NOT NULL REFERENCES usuarios(id),
  local_id UUID NOT NULL REFERENCES locales(id),
  evento_id UUID REFERENCES eventos(id),
  codigo_invitacion TEXT UNIQUE NOT NULL,
  total_entradas INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: suscripciones
-- =============================================
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  silenciada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_usuario ON suscripciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_local ON suscripciones(local_id);

-- =============================================
-- TABLA: planes_publicos
-- =============================================
CREATE TABLE IF NOT EXISTS planes_publicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creador_id UUID NOT NULL REFERENCES usuarios(id),
  local_id UUID NOT NULL REFERENCES locales(id),
  hora_llegada TIMESTAMPTZ NOT NULL,
  total_personas INTEGER NOT NULL,
  huecos_disponibles INTEGER NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','completado','cancelado')),
  miembros_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planes_local ON planes_publicos(local_id);
CREATE INDEX IF NOT EXISTS idx_planes_creador ON planes_publicos(creador_id);
CREATE INDEX IF NOT EXISTS idx_planes_estado ON planes_publicos(estado);

-- =============================================
-- TABLA: participantes_plan
-- =============================================
CREATE TABLE IF NOT EXISTS participantes_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES planes_publicos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada','rechazada','expirada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_participantes_plan ON participantes_plan(plan_id);
CREATE INDEX IF NOT EXISTS idx_participantes_usuario ON participantes_plan(usuario_id);

-- =============================================
-- TABLA: mensajes_chat_plan
-- =============================================
CREATE TABLE IF NOT EXISTS mensajes_chat_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES planes_publicos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_plan ON mensajes_chat_plan(plan_id);

-- =============================================
-- TABLA: valoraciones_plan
-- =============================================
CREATE TABLE IF NOT EXISTS valoraciones_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES planes_publicos(id),
  valorador_id UUID NOT NULL REFERENCES usuarios(id),
  valorado_id UUID NOT NULL REFERENCES usuarios(id),
  puntuacion INTEGER NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, valorador_id, valorado_id)
);

-- =============================================
-- TABLA: reviews
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  local_id UUID NOT NULL REFERENCES locales(id),
  checkin_id UUID,
  puntuacion INTEGER NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario TEXT,
  utiles INTEGER DEFAULT 0,
  censurada BOOLEAN DEFAULT false,
  motivo_censura TEXT,
  respuesta_local TEXT,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa','censurada','eliminada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, local_id, checkin_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_local ON reviews(local_id);
CREATE INDEX IF NOT EXISTS idx_reviews_usuario ON reviews(usuario_id);

-- =============================================
-- TABLA: sugerencias
-- =============================================
CREATE TABLE IF NOT EXISTS sugerencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  local_id UUID NOT NULL REFERENCES locales(id),
  contenido TEXT NOT NULL,
  estado TEXT DEFAULT 'nueva' CHECK (estado IN ('nueva','leida','respondida')),
  nota_interna TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sugerencias_local ON sugerencias(local_id);

-- =============================================
-- TABLA: checkins
-- =============================================
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  local_id UUID NOT NULL REFERENCES locales(id),
  latitud FLOAT NOT NULL,
  longitud FLOAT NOT NULL,
  entrada_at TIMESTAMPTZ DEFAULT NOW(),
  salida_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_checkins_usuario ON checkins(usuario_id);
CREATE INDEX IF NOT EXISTS idx_checkins_local ON checkins(local_id);
CREATE INDEX IF NOT EXISTS idx_checkins_entrada ON checkins(entrada_at);

-- =============================================
-- TABLA: concursos
-- =============================================
CREATE TABLE IF NOT EXISTS concursos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES eventos(id),
  descripcion TEXT NOT NULL,
  tipo_contenido TEXT NOT NULL DEFAULT 'ambos' CHECK (tipo_contenido IN ('foto','video','ambos')),
  fuente_contenido TEXT NOT NULL DEFAULT 'directa' CHECK (fuente_contenido IN ('directa','instagram','ambas')),
  hora_apertura TIMESTAMPTZ NOT NULL,
  hora_cierre TIMESTAMPTZ NOT NULL,
  premio TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado','activo','cerrado','finalizado','cancelado')),
  ganador_participacion_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concursos_local ON concursos(local_id);
CREATE INDEX IF NOT EXISTS idx_concursos_estado ON concursos(estado);

-- =============================================
-- TABLA: participaciones_concurso
-- =============================================
CREATE TABLE IF NOT EXISTS participaciones_concurso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concurso_id UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  contenido_url TEXT,
  instagram_post_id TEXT,
  instagram_post_url TEXT,
  num_votos INTEGER DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente_moderacion' CHECK (estado IN ('pendiente_moderacion','aprobada','rechazada','eliminada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(concurso_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_participaciones_concurso ON participaciones_concurso(concurso_id);

-- =============================================
-- TABLA: votos_concurso
-- =============================================
CREATE TABLE IF NOT EXISTS votos_concurso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participacion_id UUID NOT NULL REFERENCES participaciones_concurso(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  concurso_id UUID NOT NULL REFERENCES concursos(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, concurso_id, participacion_id),
  UNIQUE(usuario_id, participacion_id)
);

-- =============================================
-- TABLA: retos
-- =============================================
CREATE TABLE IF NOT EXISTS retos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES eventos(id),
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  tipo_contenido TEXT NOT NULL CHECK (tipo_contenido IN ('foto','video','texto')),
  metodo_ganador TEXT NOT NULL DEFAULT 'votos' CHECK (metodo_ganador IN ('votos','manual')),
  premio TEXT,
  hora_cierre TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','cerrado','cancelado')),
  ganador_participacion_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retos_local ON retos(local_id);

-- =============================================
-- TABLA: participaciones_reto
-- =============================================
CREATE TABLE IF NOT EXISTS participaciones_reto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reto_id UUID NOT NULL REFERENCES retos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  contenido_url TEXT,
  contenido_texto TEXT,
  num_votos INTEGER DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente_moderacion' CHECK (estado IN ('pendiente_moderacion','aprobada','rechazada','eliminada')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: administradores
-- =============================================
CREATE TABLE IF NOT EXISTS administradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol TEXT NOT NULL DEFAULT 'soporte' CHECK (rol IN ('super_admin','admin','soporte')),
  activo BOOLEAN DEFAULT true,
  totp_secret TEXT,
  totp_activado BOOLEAN DEFAULT false,
  intentos_fallidos INTEGER DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ
);

INSERT INTO administradores (nombre, email, rol, totp_activado)
VALUES ('Super Admin', 'admin@fourvenues.com', 'super_admin', false)
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- TABLA: log_auditoria
-- =============================================
CREATE TABLE IF NOT EXISTS log_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL,
  tipo_accion TEXT NOT NULL,
  entidad_tipo TEXT,
  entidad_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  motivo TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_admin ON log_auditoria(admin_id);
CREATE INDEX IF NOT EXISTS idx_log_entidad ON log_auditoria(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_log_fecha ON log_auditoria(created_at);

-- =============================================
-- TABLA: notificaciones_push_suscripciones
-- =============================================
CREATE TABLE IF NOT EXISTS notificaciones_push_suscripciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth TEXT,
  p256dh TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, endpoint)
);

-- =============================================
-- TABLA: notificaciones_enviadas
-- =============================================
CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID REFERENCES locales(id),
  titulo TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  enlace TEXT,
  num_destinatarios INTEGER DEFAULT 0,
  num_aperturas INTEGER DEFAULT 0,
  enviada_at TIMESTAMPTZ DEFAULT NOW(),
  tipo TEXT DEFAULT 'manual' CHECK (tipo IN ('manual','automatica','patrocinada','sistema'))
);

CREATE INDEX IF NOT EXISTS idx_notif_local ON notificaciones_enviadas(local_id);

-- =============================================
-- TABLA: reportes_contenido
-- =============================================
CREATE TABLE IF NOT EXISTS reportes_contenido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reportado_por UUID NOT NULL REFERENCES usuarios(id),
  tipo_contenido TEXT NOT NULL,
  contenido_id UUID NOT NULL,
  motivo TEXT NOT NULL CHECK (motivo IN ('inapropiado','spam','falso','otro')),
  descripcion TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  gestionado_por UUID,
  gestionado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: tickets_soporte
-- =============================================
CREATE TABLE IF NOT EXISTS tickets_soporte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  local_id UUID REFERENCES locales(id),
  descripcion TEXT NOT NULL,
  estado TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto','en_gestion','resuelto','cerrado')),
  asignado_a UUID,
  resolucion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: historial_aforo (para ML)
-- =============================================
CREATE TABLE IF NOT EXISTS historial_aforo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id UUID NOT NULL REFERENCES locales(id),
  fecha DATE NOT NULL,
  hora INTEGER NOT NULL,
  aforo_estimado FLOAT,
  aforo_real FLOAT,
  entradas_vendidas INTEGER DEFAULT 0,
  checkins_activos INTEGER DEFAULT 0,
  tiene_evento BOOLEAN DEFAULT false,
  clima TEXT,
  es_festivo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_local ON historial_aforo(local_id, fecha);

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER locales_updated_at BEFORE UPDATE ON locales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER eventos_updated_at BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER planes_updated_at BEFORE UPDATE ON planes_publicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función: actualizar contador de suscriptores del local
CREATE OR REPLACE FUNCTION sync_num_suscriptores()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE locales SET num_suscriptores = num_suscriptores + 1 WHERE id = NEW.local_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE locales SET num_suscriptores = GREATEST(0, num_suscriptores - 1) WHERE id = OLD.local_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suscripciones_sync_count
AFTER INSERT OR DELETE ON suscripciones
FOR EACH ROW EXECUTE FUNCTION sync_num_suscriptores();

-- Función: actualizar contador de entradas vendidas en evento
CREATE OR REPLACE FUNCTION sync_entradas_vendidas()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.estado = 'activa' THEN
    IF NEW.evento_id IS NOT NULL THEN
      UPDATE eventos SET entradas_vendidas = entradas_vendidas + 1 WHERE id = NEW.evento_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.estado = 'activa' AND NEW.estado = 'cancelada' THEN
    IF NEW.evento_id IS NOT NULL THEN
      UPDATE eventos SET entradas_vendidas = GREATEST(0, entradas_vendidas - 1) WHERE id = NEW.evento_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entradas_sync_count
AFTER INSERT OR UPDATE ON entradas
FOR EACH ROW EXECUTE FUNCTION sync_entradas_vendidas();

-- Función: actualizar votos en participación
CREATE OR REPLACE FUNCTION sync_votos_participacion()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE participaciones_concurso SET num_votos = num_votos + 1 WHERE id = NEW.participacion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE participaciones_concurso SET num_votos = GREATEST(0, num_votos - 1) WHERE id = OLD.participacion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER votos_sync_count
AFTER INSERT OR DELETE ON votos_concurso
FOR EACH ROW EXECUTE FUNCTION sync_votos_participacion();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_chat_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE concursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE participaciones_concurso ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos_concurso ENABLE ROW LEVEL SECURITY;
ALTER TABLE retos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas para USUARIOS
CREATE POLICY "Usuarios ven su propio perfil" ON usuarios
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Usuarios actualizan su propio perfil" ON usuarios
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Registro de usuario" ON usuarios
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Políticas para LOCALES (lectura pública de activos)
CREATE POLICY "Locales activos son públicos" ON locales
  FOR SELECT USING (estado = 'activo');

CREATE POLICY "Panel local puede leer su local" ON locales
  FOR SELECT USING (
    id IN (SELECT local_id FROM usuario_local WHERE email = auth.email() AND activo = true)
  );

CREATE POLICY "Panel local puede actualizar su local" ON locales
  FOR UPDATE USING (
    id IN (SELECT local_id FROM usuario_local WHERE email = auth.email() AND activo = true AND rol IN ('dueno','gestor'))
  );

-- Políticas para EVENTOS (públicos si están publicados)
CREATE POLICY "Eventos publicados son públicos" ON eventos
  FOR SELECT USING (estado = 'publicado');

CREATE POLICY "Panel local gestiona sus eventos" ON eventos
  FOR ALL USING (
    local_id IN (SELECT local_id FROM usuario_local WHERE email = auth.email() AND activo = true)
  );

-- Políticas para ENTRADAS
CREATE POLICY "Usuarios ven sus entradas" ON entradas
  FOR SELECT USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

CREATE POLICY "Usuarios compran entradas" ON entradas
  FOR INSERT WITH CHECK (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- Políticas para SUSCRIPCIONES
CREATE POLICY "Usuarios gestionan sus suscripciones" ON suscripciones
  FOR ALL USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- Políticas para PLANES PÚBLICOS
CREATE POLICY "Planes activos son públicos" ON planes_publicos
  FOR SELECT USING (estado = 'activo');

CREATE POLICY "Usuarios gestionan sus planes" ON planes_publicos
  FOR ALL USING (creador_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- Políticas para REVIEWS
CREATE POLICY "Reviews activas son públicas" ON reviews
  FOR SELECT USING (estado = 'activa' AND NOT censurada);

CREATE POLICY "Usuarios gestionan sus reviews" ON reviews
  FOR ALL USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- Políticas para CONCURSOS y PARTICIPACIONES
CREATE POLICY "Concursos activos son públicos" ON concursos
  FOR SELECT USING (estado IN ('activo','programado'));

CREATE POLICY "Participaciones aprobadas son públicas" ON participaciones_concurso
  FOR SELECT USING (estado = 'aprobada');

CREATE POLICY "Usuarios gestionan sus participaciones" ON participaciones_concurso
  FOR ALL USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- Políticas para CONFIGURACIÓN (solo lectura pública para claves no sensibles)
CREATE POLICY "Configuración pública" ON configuracion_sistema
  FOR SELECT USING (true);

-- Política para CHECKINS
CREATE POLICY "Usuarios gestionan sus checkins" ON checkins
  FOR ALL USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- Política para MENSAJES de chat
CREATE POLICY "Miembros del plan ven mensajes" ON mensajes_chat_plan
  FOR SELECT USING (
    plan_id IN (
      SELECT plan_id FROM participantes_plan
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
      AND estado = 'aceptada'
    )
    OR plan_id IN (
      SELECT id FROM planes_publicos
      WHERE creador_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Miembros envían mensajes" ON mensajes_chat_plan
  FOR INSERT WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );
