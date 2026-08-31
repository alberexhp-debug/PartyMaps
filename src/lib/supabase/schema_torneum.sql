-- =============================================================================
-- TORNEUM — ESQUEMA COMPLETO (nueva era, 31-08-2026)
--
-- Base de datos NUEVA sin rastro del paradigma anterior: nombres y formas
-- nativos del dominio de torneos (organizadores, sedes, crews, combates…).
-- Cubre TODO el dominio que la demo ya definió: torneos (públicos y privados
-- por invitación), inscripciones de jugador y ESPECTADOR con cupos separados,
-- listas de espera, motor de combates con doble reporte y disputas, crono del
-- set (inicio_at), crews con administración, chat unificado (DM/grupo/crew/
-- torneo/difusión) con no-leídos por miembro, notificaciones CON destinatario,
-- valoraciones, reservas de sede con contraoferta, ledger de puntos y ranking.
--
-- Idempotente: se puede re-aplicar. Fuente de verdad de formas: sample.ts +
-- useDemoStore.ts (la demo es la maqueta funcional de referencia).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Las funciones de apoyo van ANTES que las tablas que citan (más legible):
-- se desactiva la validación de cuerpos durante la carga, como hace pg_dump.
SET check_function_bodies = off;

-- =============================================================================
-- FUNCIONES DE APOYO
-- =============================================================================

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Mi fila de usuarios (por el auth de Supabase)
CREATE OR REPLACE FUNCTION mi_usuario_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT id FROM usuarios WHERE auth_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION es_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT COALESCE((SELECT admin FROM usuarios WHERE auth_id = auth.uid()), false) $$;

CREATE OR REPLACE FUNCTION soy_organizador(org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM organizadores o WHERE o.id = org AND o.usuario_id = mi_usuario_id()) $$;

CREATE OR REPLACE FUNCTION soy_staff_sede(sede uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM miembros_sede m WHERE m.sede_id = sede AND m.usuario_id = mi_usuario_id() AND m.activo) $$;

CREATE OR REPLACE FUNCTION soy_miembro_hilo(hilo uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM miembros_hilo m WHERE m.hilo_id = hilo AND m.usuario_id = mi_usuario_id()) $$;

-- =============================================================================
-- IDENTIDAD
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id         UUID UNIQUE,                       -- auth.users de Supabase
  email           TEXT UNIQUE,
  nombre          TEXT NOT NULL,
  tag             TEXT UNIQUE,                       -- #XABCD (dígito + 4 letras)
  foto            TEXT,                              -- URL o dataURL comprimido
  banner          TEXT,                              -- CSS de preset o dataURL
  bio             TEXT,
  pais            TEXT NOT NULL DEFAULT 'ES',        -- ranking: tus puntos van a TU país
  idioma          TEXT NOT NULL DEFAULT 'es' CHECK (idioma IN ('es','en','ja')),
  mains           JSONB NOT NULL DEFAULT '{}',       -- juego_id -> [personajes]
  juegos_favoritos TEXT[] NOT NULL DEFAULT '{}',
  tier            TEXT NOT NULL DEFAULT 'gratis' CHECK (tier IN ('gratis','oro','platino','diamante')),
  admin           BOOLEAN NOT NULL DEFAULT false,
  estado          TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','suspendida','eliminada')),
  ultimo_torneo_at TIMESTAMPTZ,                      -- aviso de inactividad 45d
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_tag ON usuarios(tag);

CREATE TABLE IF NOT EXISTS organizadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL UNIQUE,
  nombre          TEXT NOT NULL,
  handle          TEXT,
  bio             TEXT,
  ciudad          TEXT,
  color           TEXT NOT NULL DEFAULT '#B6FF3A',
  foto            TEXT,
  banner          TEXT,
  juegos          TEXT[] NOT NULL DEFAULT '{}',
  verificado      BOOLEAN NOT NULL DEFAULT false,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado','suspendido')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sedes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  direccion       TEXT,
  ciudad          TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  aforo           INTEGER,
  foto            TEXT,
  banner          TEXT,
  galeria         JSONB NOT NULL DEFAULT '[]',       -- imágenes extra (≤6)
  equipos         JSONB NOT NULL DEFAULT '{}',       -- {ps5: 4, switch: 2, pc: 6…}
  juegos_extra    TEXT[] NOT NULL DEFAULT '{}',      -- añadidos a mano por la sede
  juegos_quitados TEXT[] NOT NULL DEFAULT '{}',
  precio_noche    NUMERIC(8,2),
  verificada      BOOLEAN NOT NULL DEFAULT false,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada','suspendida')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS miembros_sede (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id         UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol             TEXT NOT NULL DEFAULT 'staff' CHECK (rol IN ('dueno','staff')),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sede_id, usuario_id)
);

-- =============================================================================
-- CATÁLOGO
-- =============================================================================

CREATE TABLE IF NOT EXISTS juegos (
  id              TEXT PRIMARY KEY,                  -- 'smash', 'magic'…
  nombre          TEXT NOT NULL,
  corto           TEXT NOT NULL,
  color           TEXT NOT NULL,
  emoji           TEXT,
  plantilla       TEXT NOT NULL DEFAULT '1v1' CHECK (plantilla IN ('1v1','tcg','lobbies','equipos')),
  personajes      BOOLEAN NOT NULL DEFAULT false,    -- lucha/LoL/Valorant: sí
  tam_equipo      INTEGER NOT NULL DEFAULT 2,
  formatos        TEXT[] NOT NULL DEFAULT '{}',
  bo_default      JSONB NOT NULL DEFAULT '{"base":3,"top":5,"desde":"semis"}',
  activo          BOOLEAN NOT NULL DEFAULT true,
  orden           INTEGER NOT NULL DEFAULT 100,
  propuesto_por   UUID REFERENCES organizadores(id) ON DELETE SET NULL,
  estado          TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','propuesto','oculto')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temporadas (
  id              TEXT PRIMARY KEY,                  -- '2026-s2'
  nombre          TEXT NOT NULL,
  inicio          DATE NOT NULL,
  fin             DATE NOT NULL,
  activa          BOOLEAN NOT NULL DEFAULT false
);

-- =============================================================================
-- TORNEOS E INSCRIPCIONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS torneos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  juego_id        TEXT NOT NULL REFERENCES juegos(id),
  organizador_id  UUID NOT NULL REFERENCES organizadores(id) ON DELETE CASCADE,
  sede_id         UUID REFERENCES sedes(id) ON DELETE SET NULL,   -- null si online
  online          BOOLEAN NOT NULL DEFAULT false,
  privado         BOOLEAN NOT NULL DEFAULT false,    -- solo con invitación
  fecha           TIMESTAMPTZ,
  formato         TEXT NOT NULL DEFAULT 'Doble eliminación',
  bo              JSONB NOT NULL DEFAULT '{"base":3,"top":5,"desde":"semis"}',
  plazas          INTEGER NOT NULL DEFAULT 32,
  precio          NUMERIC(8,2) NOT NULL DEFAULT 0,
  bote            NUMERIC(10,2) NOT NULL DEFAULT 0,
  reparto         JSONB NOT NULL DEFAULT '{"1":70,"2":20,"3":10}',
  reparto_sede    INTEGER NOT NULL DEFAULT 20,       -- % del acuerdo sede/TO
  categoria       TEXT NOT NULL DEFAULT 'comunidad' CHECK (categoria IN ('comunidad','oficial','supermajor')),
  plazas_ver      INTEGER,                           -- cupo de ESPECTADORES (null = sin límite, 0 = sin entrada)
  ver_cerrado     BOOLEAN NOT NULL DEFAULT false,    -- el TO abre/cierra al instante
  reglas          JSONB NOT NULL DEFAULT '[]',
  descripcion     TEXT,
  video_url       TEXT,                              -- emisión en directo
  vod_url         TEXT,                              -- VOD final (YouTube canónico)
  estado          TEXT NOT NULL DEFAULT 'publicado' CHECK (estado IN ('borrador','publicado','en_directo','finalizado','cancelado')),
  inicio_directo_at TIMESTAMPTZ,                     -- ancla temporal de los VODs
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_torneos_juego ON torneos(juego_id);
CREATE INDEX IF NOT EXISTS idx_torneos_org ON torneos(organizador_id);
CREATE INDEX IF NOT EXISTS idx_torneos_fecha ON torneos(fecha);

CREATE TABLE IF NOT EXISTS inscripciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'jugador' CHECK (tipo IN ('jugador','espectador')),
  estado          TEXT NOT NULL DEFAULT 'inscrito' CHECK (estado IN ('inscrito','checkin','baja','reembolsado')),
  crew_id         UUID,                              -- FK tras crear crews
  seed            INTEGER,
  pagado          BOOLEAN NOT NULL DEFAULT false,
  qr              TEXT UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (torneo_id, usuario_id, tipo)
);
CREATE INDEX IF NOT EXISTS idx_insc_torneo ON inscripciones(torneo_id);
CREATE INDEX IF NOT EXISTS idx_insc_usuario ON inscripciones(usuario_id);

CREATE TABLE IF NOT EXISTS lista_espera (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'jugador' CHECK (tipo IN ('jugador','espectador')),
  estado          TEXT NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando','promovido','salido')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- el orden ES la antigüedad; el TO decide
  UNIQUE (torneo_id, usuario_id, tipo)
);

CREATE TABLE IF NOT EXISTS invitaciones_torneo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  invitado_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  estado          TEXT NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada','aceptada')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (torneo_id, usuario_id)
);

-- =============================================================================
-- SEDES: PLANO, DISPONIBILIDAD Y RESERVAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS mesas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id         UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  numero          INTEGER NOT NULL,
  nombre          TEXT,
  tipo            TEXT NOT NULL DEFAULT 'mesa' CHECK (tipo IN ('consola','pc','mesa','arcade','stream')),
  piso            INTEGER NOT NULL DEFAULT 0,
  x               INTEGER NOT NULL DEFAULT 0,
  y               INTEGER NOT NULL DEFAULT 0,
  forma           TEXT NOT NULL DEFAULT 'cuadrada' CHECK (forma IN ('cuadrada','redonda','alargada')),
  capacidad       INTEGER NOT NULL DEFAULT 2,
  activa          BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (sede_id, numero)
);

CREATE TABLE IF NOT EXISTS disponibilidad_sede (
  sede_id         UUID PRIMARY KEY REFERENCES sedes(id) ON DELETE CASCADE,
  dias            INTEGER[] NOT NULL DEFAULT '{}',   -- 0=lunes … 6=domingo
  desde_h         INTEGER NOT NULL DEFAULT 17,
  hasta_h         INTEGER NOT NULL DEFAULT 23,
  setups          INTEGER NOT NULL DEFAULT 8,
  precio_noche    NUMERIC(8,2),
  publicada       BOOLEAN NOT NULL DEFAULT false,
  excepciones     DATE[] NOT NULL DEFAULT '{}',      -- días sueltos bloqueados
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_sede (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizador_id  UUID NOT NULL REFERENCES organizadores(id) ON DELETE CASCADE,
  sede_id         UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  franja          TEXT,
  personas        INTEGER,
  mensaje         TEXT,
  reparto_sede    INTEGER NOT NULL DEFAULT 20,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada','rechazada','contraoferta')),
  contraoferta    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MOTOR DE COMBATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS combates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  mid             TEXT NOT NULL,                     -- 'r0m0' (compat con la demo)
  ronda           INTEGER NOT NULL DEFAULT 0,
  orden           INTEGER NOT NULL DEFAULT 0,
  lado            TEXT NOT NULL DEFAULT 'w' CHECK (lado IN ('w','l','gf')),
  jugador_a       UUID REFERENCES inscripciones(id) ON DELETE SET NULL,
  jugador_b       UUID REFERENCES inscripciones(id) ON DELETE SET NULL,
  score_a         INTEGER NOT NULL DEFAULT 0,
  score_b         INTEGER NOT NULL DEFAULT 0,
  ganador         TEXT CHECK (ganador IN ('a','b')),
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_cola','en_juego','jugado','disputa')),
  mesa_id         UUID REFERENCES mesas(id) ON DELETE SET NULL,
  personajes      JSONB NOT NULL DEFAULT '{}',       -- {a:[…], b:[…]} tras consenso
  inicio_at       TIMESTAMPTZ,                       -- crono del set (todo listo)
  fin_at          TIMESTAMPTZ,                       -- + vod offsets derivables
  siguiente_combate_id UUID REFERENCES combates(id) ON DELETE SET NULL,
  siguiente_slot  TEXT CHECK (siguiente_slot IN ('a','b')),
  UNIQUE (torneo_id, mid)
);
CREATE INDEX IF NOT EXISTS idx_combates_torneo ON combates(torneo_id);

CREATE TABLE IF NOT EXISTS reportes_combate (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combate_id      UUID NOT NULL REFERENCES combates(id) ON DELETE CASCADE,
  inscripcion_id  UUID NOT NULL REFERENCES inscripciones(id) ON DELETE CASCADE,
  marcador_a      INTEGER NOT NULL,
  marcador_b      INTEGER NOT NULL,
  personajes      TEXT[] NOT NULL DEFAULT '{}',      -- los MÍOS (≤2)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (combate_id, inscripcion_id)
);

CREATE TABLE IF NOT EXISTS disputas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combate_id      UUID NOT NULL REFERENCES combates(id) ON DELETE CASCADE,
  abierta_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  estado          TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','resuelta')),
  resuelta_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  marcador        JSONB,                             -- {a, b} fijado por el TO
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelta_at     TIMESTAMPTZ
);

-- =============================================================================
-- CREWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS crews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  tag             TEXT NOT NULL UNIQUE CHECK (tag ~ '^[A-Z]{4}$'),
  juego_id        TEXT NOT NULL REFERENCES juegos(id),
  emoji           TEXT,
  color           TEXT,
  banner          TEXT,
  descripcion     TEXT,
  creador_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS miembros_crew (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id         UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  admin           BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- la antigüedad hereda la gestión
  UNIQUE (crew_id, usuario_id)
);

ALTER TABLE inscripciones DROP CONSTRAINT IF EXISTS inscripciones_crew_fk;
ALTER TABLE inscripciones ADD CONSTRAINT inscripciones_crew_fk
  FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE SET NULL;

-- =============================================================================
-- SOCIAL: AMISTADES, CHAT, NOTIFICACIONES, SEGUIMIENTOS, VALORACIONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS amistades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  de_usuario      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  a_usuario       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (de_usuario, a_usuario),
  CHECK (de_usuario <> a_usuario)
);

-- Un HILO por conversación: DM, grupo de amigos, chat de crew, sala de torneo
-- o canal de difusión de un organizador (solo-lectura para seguidores).
CREATE TABLE IF NOT EXISTS hilos_chat (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('dm','grupo','crew','torneo','difusion')),
  nombre          TEXT,
  emoji           TEXT,
  crew_id         UUID UNIQUE REFERENCES crews(id) ON DELETE CASCADE,
  torneo_id       UUID UNIQUE REFERENCES torneos(id) ON DELETE CASCADE,
  organizador_id  UUID REFERENCES organizadores(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS miembros_hilo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hilo_id         UUID NOT NULL REFERENCES hilos_chat(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ultimo_leido_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- no-leídos estilo WhatsApp
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hilo_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS mensajes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hilo_id         UUID NOT NULL REFERENCES hilos_chat(id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,  -- null = sistema
  texto           TEXT NOT NULL,
  meta            JSONB,                             -- convocatoria de crew, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mensajes_hilo ON mensajes(hilo_id, created_at);

-- Notificaciones CON DESTINATARIO (lo que en la demo era el buzón cruzado)
CREATE TABLE IF NOT EXISTS notificaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'sistema',
  titulo_key      TEXT,                              -- clave i18n (se traduce al leer)
  cuerpo_key      TEXT,
  params          JSONB NOT NULL DEFAULT '{}',
  titulo          TEXT,                              -- fallback literal
  cuerpo          TEXT,
  href            TEXT,
  leida           BOOLEAN NOT NULL DEFAULT false,
  descartada      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notis_usuario ON notificaciones(usuario_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seguimientos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  organizador_id  UUID NOT NULL REFERENCES organizadores(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, organizador_id)
);

-- Valoraciones: jugador→TO (por torneo), TO→sede y sede→TO (por reserva)
CREATE TABLE IF NOT EXISTS valoraciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('jugador_a_to','to_a_sede','sede_a_to')),
  de_usuario      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  torneo_id       UUID REFERENCES torneos(id) ON DELETE CASCADE,
  solicitud_id    UUID REFERENCES solicitudes_sede(id) ON DELETE CASCADE,
  organizador_id  UUID REFERENCES organizadores(id) ON DELETE CASCADE,
  sede_id         UUID REFERENCES sedes(id) ON DELETE CASCADE,
  estrellas       INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  texto           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (tipo = 'jugador_a_to' AND torneo_id IS NOT NULL AND organizador_id IS NOT NULL) OR
    (tipo = 'to_a_sede'    AND solicitud_id IS NOT NULL AND sede_id IS NOT NULL) OR
    (tipo = 'sede_a_to'    AND solicitud_id IS NOT NULL AND organizador_id IS NOT NULL)
  )
);

-- =============================================================================
-- PUNTOS Y RANKING (regla de oro: SOLO puntúan torneos jugados en Torneum)
-- =============================================================================

-- Ledger: una fila por jugador y torneo FINALIZADO. La escribe el motor al
-- cerrar la final (topePuntos × reparto por puesto, como puntos.ts).
CREATE TABLE IF NOT EXISTS puntos_torneo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id       UUID NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  juego_id        TEXT NOT NULL REFERENCES juegos(id),
  temporada_id    TEXT NOT NULL REFERENCES temporadas(id),
  puesto          INTEGER NOT NULL,
  puntos          INTEGER NOT NULL,
  online          BOOLEAN NOT NULL DEFAULT false,
  categoria       TEXT NOT NULL DEFAULT 'comunidad',
  pais            TEXT NOT NULL DEFAULT 'ES',        -- el país del jugador AL puntuar
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (torneo_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_puntos_rk ON puntos_torneo(juego_id, temporada_id, online, pais);

-- Ranking agregado (País/Mundial × Presencial/Online y Circuito por categoría)
CREATE OR REPLACE VIEW ranking_torneum AS
SELECT usuario_id, juego_id, temporada_id, online, pais,
       SUM(puntos)::int AS puntos,
       COUNT(*)::int    AS torneos,
       MIN(puesto)      AS mejor,
       SUM(puntos) FILTER (WHERE categoria <> 'comunidad')::int AS puntos_circuito
FROM puntos_torneo
GROUP BY usuario_id, juego_id, temporada_id, online, pais;

-- Perfil PÚBLICO de usuario (lo que ven brackets, rankings y mini-perfiles;
-- el email y las preferencias se quedan fuera).
CREATE OR REPLACE VIEW perfiles_publicos AS
SELECT id, nombre, tag, foto, banner, bio, pais, mains, created_at FROM usuarios
WHERE estado = 'activa';

-- =============================================================================
-- TRIGGERS updated_at
-- =============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['usuarios','organizadores','sedes','torneos','solicitudes_sede','disponibilidad_sede']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%I ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_touch_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t, t);
  END LOOP;
END $$;

-- =============================================================================
-- RLS — todo cerrado por defecto; se abre solo lo público o lo propio.
-- Escrituras de juego (combates, puntos, promociones…) van por endpoints con
-- service_role: aquí no hay INSERT/UPDATE para esas tablas a propósito.
-- =============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['usuarios','organizadores','sedes','miembros_sede','juegos','temporadas',
    'torneos','inscripciones','lista_espera','invitaciones_torneo','mesas','disponibilidad_sede',
    'solicitudes_sede','combates','reportes_combate','disputas','crews','miembros_crew','amistades',
    'hilos_chat','miembros_hilo','mensajes','notificaciones','seguimientos','valoraciones','puntos_torneo']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Lectura pública (el descubrimiento es la puerta de entrada de la app)
DROP POLICY IF EXISTS pub_juegos ON juegos;
CREATE POLICY pub_juegos ON juegos FOR SELECT USING (estado = 'activo' AND activo);
DROP POLICY IF EXISTS pub_temporadas ON temporadas;
CREATE POLICY pub_temporadas ON temporadas FOR SELECT USING (true);
DROP POLICY IF EXISTS pub_torneos ON torneos;
CREATE POLICY pub_torneos ON torneos FOR SELECT USING (estado <> 'borrador');
DROP POLICY IF EXISTS pub_sedes ON sedes;
CREATE POLICY pub_sedes ON sedes FOR SELECT USING (estado = 'aprobada');
DROP POLICY IF EXISTS pub_organizadores ON organizadores;
CREATE POLICY pub_organizadores ON organizadores FOR SELECT USING (estado = 'aprobado');
DROP POLICY IF EXISTS pub_mesas ON mesas;
CREATE POLICY pub_mesas ON mesas FOR SELECT USING (true);
DROP POLICY IF EXISTS pub_dispo ON disponibilidad_sede;
CREATE POLICY pub_dispo ON disponibilidad_sede FOR SELECT USING (publicada);
DROP POLICY IF EXISTS pub_combates ON combates;
CREATE POLICY pub_combates ON combates FOR SELECT
  USING (EXISTS (SELECT 1 FROM torneos t WHERE t.id = combates.torneo_id AND t.estado <> 'borrador'));
DROP POLICY IF EXISTS pub_crews ON crews;
CREATE POLICY pub_crews ON crews FOR SELECT USING (true);
DROP POLICY IF EXISTS pub_miembros_crew ON miembros_crew;
CREATE POLICY pub_miembros_crew ON miembros_crew FOR SELECT USING (true);
DROP POLICY IF EXISTS pub_puntos ON puntos_torneo;
CREATE POLICY pub_puntos ON puntos_torneo FOR SELECT USING (true);
DROP POLICY IF EXISTS pub_valoraciones ON valoraciones;
CREATE POLICY pub_valoraciones ON valoraciones FOR SELECT USING (true);

-- Usuarios: cada uno lo suyo (el perfil público sale por la VISTA)
DROP POLICY IF EXISTS mi_usuario_sel ON usuarios;
CREATE POLICY mi_usuario_sel ON usuarios FOR SELECT USING (auth_id = auth.uid() OR es_admin());
DROP POLICY IF EXISTS mi_usuario_upd ON usuarios;
CREATE POLICY mi_usuario_upd ON usuarios FOR UPDATE USING (auth_id = auth.uid());

-- Organizador y sede editan su propia ficha
DROP POLICY IF EXISTS mi_org_upd ON organizadores;
CREATE POLICY mi_org_upd ON organizadores FOR UPDATE USING (usuario_id = mi_usuario_id());
DROP POLICY IF EXISTS mi_sede_upd ON sedes;
CREATE POLICY mi_sede_upd ON sedes FOR UPDATE USING (soy_staff_sede(id));
DROP POLICY IF EXISTS mi_sede_dispo ON disponibilidad_sede;
CREATE POLICY mi_sede_dispo ON disponibilidad_sede FOR ALL USING (soy_staff_sede(sede_id));
DROP POLICY IF EXISTS mi_sede_mesas ON mesas;
CREATE POLICY mi_sede_mesas ON mesas FOR ALL USING (soy_staff_sede(sede_id));
DROP POLICY IF EXISTS mi_sede_miembros ON miembros_sede;
CREATE POLICY mi_sede_miembros ON miembros_sede FOR SELECT USING (usuario_id = mi_usuario_id() OR soy_staff_sede(sede_id));

-- Torneos: el TO gestiona los suyos (borradores incluidos)
DROP POLICY IF EXISTS mi_torneo_all ON torneos;
CREATE POLICY mi_torneo_all ON torneos FOR ALL USING (soy_organizador(organizador_id));

-- Inscripciones: veo las mías; el TO ve las de su torneo; los inscritos de un
-- torneo se ven entre sí (participantes de la ficha)
DROP POLICY IF EXISTS insc_sel ON inscripciones;
CREATE POLICY insc_sel ON inscripciones FOR SELECT USING (
  usuario_id = mi_usuario_id()
  OR EXISTS (SELECT 1 FROM torneos t WHERE t.id = inscripciones.torneo_id AND soy_organizador(t.organizador_id))
  OR EXISTS (SELECT 1 FROM inscripciones mia WHERE mia.torneo_id = inscripciones.torneo_id AND mia.usuario_id = mi_usuario_id())
);
DROP POLICY IF EXISTS espera_sel ON lista_espera;
CREATE POLICY espera_sel ON lista_espera FOR SELECT USING (
  usuario_id = mi_usuario_id()
  OR EXISTS (SELECT 1 FROM torneos t WHERE t.id = lista_espera.torneo_id AND soy_organizador(t.organizador_id))
);
DROP POLICY IF EXISTS invit_sel ON invitaciones_torneo;
CREATE POLICY invit_sel ON invitaciones_torneo FOR SELECT USING (
  usuario_id = mi_usuario_id()
  OR EXISTS (SELECT 1 FROM torneos t WHERE t.id = invitaciones_torneo.torneo_id AND soy_organizador(t.organizador_id))
);

-- Solicitudes de sede: las ven las dos partes
DROP POLICY IF EXISTS sol_sede_sel ON solicitudes_sede;
CREATE POLICY sol_sede_sel ON solicitudes_sede FOR SELECT
  USING (soy_organizador(organizador_id) OR soy_staff_sede(sede_id));

-- Doble reporte: cada jugador inserta EL SUYO en combates donde juega
DROP POLICY IF EXISTS reporte_ins ON reportes_combate;
CREATE POLICY reporte_ins ON reportes_combate FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM inscripciones i WHERE i.id = reportes_combate.inscripcion_id AND i.usuario_id = mi_usuario_id())
  AND EXISTS (SELECT 1 FROM combates c WHERE c.id = reportes_combate.combate_id
              AND (c.jugador_a = reportes_combate.inscripcion_id OR c.jugador_b = reportes_combate.inscripcion_id))
);
DROP POLICY IF EXISTS reporte_sel ON reportes_combate;
CREATE POLICY reporte_sel ON reportes_combate FOR SELECT USING (true);
DROP POLICY IF EXISTS disputas_sel ON disputas;
CREATE POLICY disputas_sel ON disputas FOR SELECT USING (true);

-- Social: cada uno lo suyo
DROP POLICY IF EXISTS amistad_all ON amistades;
CREATE POLICY amistad_all ON amistades FOR ALL
  USING (de_usuario = mi_usuario_id() OR a_usuario = mi_usuario_id());
DROP POLICY IF EXISTS hilo_sel ON hilos_chat;
CREATE POLICY hilo_sel ON hilos_chat FOR SELECT USING (tipo = 'difusion' OR soy_miembro_hilo(id));
DROP POLICY IF EXISTS mi_hilo_miembro ON miembros_hilo;
CREATE POLICY mi_hilo_miembro ON miembros_hilo FOR ALL USING (usuario_id = mi_usuario_id());
DROP POLICY IF EXISTS msj_sel ON mensajes;
CREATE POLICY msj_sel ON mensajes FOR SELECT USING (
  soy_miembro_hilo(hilo_id) OR EXISTS (SELECT 1 FROM hilos_chat h WHERE h.id = mensajes.hilo_id AND h.tipo = 'difusion')
);
DROP POLICY IF EXISTS msj_ins ON mensajes;
CREATE POLICY msj_ins ON mensajes FOR INSERT WITH CHECK (
  usuario_id = mi_usuario_id() AND soy_miembro_hilo(hilo_id)
  AND NOT EXISTS (SELECT 1 FROM hilos_chat h WHERE h.id = mensajes.hilo_id AND h.tipo = 'difusion' AND h.organizador_id IS NOT NULL AND NOT soy_organizador(h.organizador_id))
);
DROP POLICY IF EXISTS mis_notis ON notificaciones;
CREATE POLICY mis_notis ON notificaciones FOR ALL USING (usuario_id = mi_usuario_id());
DROP POLICY IF EXISTS mis_seguimientos ON seguimientos;
CREATE POLICY mis_seguimientos ON seguimientos FOR ALL USING (usuario_id = mi_usuario_id());
DROP POLICY IF EXISTS valora_ins ON valoraciones;
CREATE POLICY valora_ins ON valoraciones FOR INSERT WITH CHECK (de_usuario = mi_usuario_id());

-- =============================================================================
-- SEEDS DE CATÁLOGO (datos de la nueva era, no rastro: el catálogo es producto)
-- =============================================================================
INSERT INTO juegos (id, nombre, corto, color, emoji, plantilla, personajes, tam_equipo, orden) VALUES
  ('smash',   'Super Smash Bros. Ultimate', 'Smash',    '#E63E54', '⚔️', '1v1',     true,  2, 1),
  ('magic',   'Magic: The Gathering',       'Magic',    '#F4912B', '🃏', 'tcg',     false, 2, 2),
  ('pokemon', 'Pokémon TCG',                'Pokémon',  '#FFC83D', '⚡', 'tcg',     false, 2, 3),
  ('tft',     'Teamfight Tactics',          'TFT',      '#4F8EF7', '♟️', 'lobbies', false, 8, 4),
  ('tekken',  'Tekken 8',                   'Tekken',   '#9B5DE5', '👊', '1v1',     true,  2, 5),
  ('sf6',     'Street Fighter 6',           'SF6',      '#2EC4B6', '🥊', '1v1',     true,  2, 6),
  ('valorant','VALORANT',                   'Valorant', '#FF4655', '🎯', 'equipos', true,  5, 7),
  ('lol',     'League of Legends',          'LoL',      '#0AC8B9', '🛡️', 'equipos', true,  5, 8),
  ('cod',     'Call of Duty',               'CoD',      '#E8913A', '💥', 'equipos', false, 4, 9),
  ('cs',      'Counter-Strike 2',           'CS2',      '#FFB03A', '💣', 'equipos', false, 5, 10)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, corto = EXCLUDED.corto,
  color = EXCLUDED.color, plantilla = EXCLUDED.plantilla, personajes = EXCLUDED.personajes,
  tam_equipo = EXCLUDED.tam_equipo, orden = EXCLUDED.orden;

INSERT INTO temporadas (id, nombre, inicio, fin, activa) VALUES
  ('2026-s2', 'Temporada 2026 · Split 2', '2026-07-01', '2026-12-31', true)
ON CONFLICT (id) DO NOTHING;
