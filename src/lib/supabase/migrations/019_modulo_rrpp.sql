-- =============================================
-- Migración 019: Módulo RRPP + tabla `contactos` (CRM 3 niveles)
-- ─────────────────────────────────────────────────────────────
-- Identidad de 3 niveles:
--   visitor  → anónimo, sin datos
--   contacto → lead CRM (email/teléfono, sin cuenta)
--   usuario  → cuenta completa (usuarios.auth_id presente)
--
-- Un `contacto` puede tener `user_id` rellenado cuando se promociona
-- a usuario registrado. Toda atribución (entrada, pedido bar, binding
-- al RRPP, lista, perk) viaja sobre `contacto_id`.
--
-- RLS pattern (CRÍTICO, no repetir bug migración 012):
-- Las policies NUNCA hacen JOIN a auth.users. Usan
-- `(SELECT auth.jwt() ->> 'email')` que es accesible por anon sin
-- privilegios de tabla.
--
-- Idempotente.
-- =============================================

-- ── 0. Helper de updated_at (puede que ya exista) ──────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- A. CRM: tabla `contactos`
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contactos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identificadores únicos cuando hay valor. NULL permitido en cualquiera
  -- pero al menos uno debe rellenarse (validado por trigger).
  email TEXT,
  telefono TEXT,
  nombre TEXT,
  -- Si tiene cuenta registrada, FK al usuario. NULL si solo lead.
  user_id UUID UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Atribución CRM "soft" perpetua: qué RRPP captó primero al contacto
  -- y en qué local. No determina la comisión por venta (eso lo hace
  -- el binding por noche), pero permite analítica de cartera.
  primer_rrpp_id UUID,  -- FK a rrpp.id, añadida más abajo cuando exista la tabla
  primer_local_id UUID REFERENCES locales(id) ON DELETE SET NULL,
  primer_contacto_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_contacto_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fuente_origen TEXT NOT NULL DEFAULT 'desconocido' CHECK (
    fuente_origen IN ('checkout_entrada', 'checkout_bar', 'lista_rrpp',
                      'invitacion_sms', 'invitacion_whatsapp',
                      'qr_rrpp', 'registro_directo', 'admin', 'desconocido')
  ),
  consentimiento_marketing BOOLEAN NOT NULL DEFAULT false,
  consentimiento_actualizado_en TIMESTAMPTZ,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  motivo_bloqueo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Únicos cuando hay valor (no usamos UNIQUE en columnas porque NULL múltiples romperían)
CREATE UNIQUE INDEX IF NOT EXISTS uq_contactos_email
  ON contactos (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contactos_telefono
  ON contactos (telefono) WHERE telefono IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contactos_user_id ON contactos (user_id);
CREATE INDEX IF NOT EXISTS idx_contactos_primer_rrpp ON contactos (primer_rrpp_id);
CREATE INDEX IF NOT EXISTS idx_contactos_ultimo ON contactos (ultimo_contacto_en DESC);

-- Trigger: al menos email o teléfono
CREATE OR REPLACE FUNCTION contactos_check_min_identidad()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL AND NEW.telefono IS NULL THEN
    RAISE EXCEPTION 'contactos: email o teléfono obligatorio';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contactos_check ON contactos;
CREATE TRIGGER trg_contactos_check
  BEFORE INSERT OR UPDATE ON contactos
  FOR EACH ROW EXECUTE FUNCTION contactos_check_min_identidad();

DROP TRIGGER IF EXISTS trg_contactos_touch ON contactos;
CREATE TRIGGER trg_contactos_touch
  BEFORE UPDATE ON contactos
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;

-- Service role gestiona contactos. El usuario registrado ve su propio
-- contacto vía user_id; los trabajadores del local ven los contactos
-- que han interactuado con su local (vía joins en endpoints, no aquí).
DROP POLICY IF EXISTS "Usuario ve su contacto" ON contactos;
CREATE POLICY "Usuario ve su contacto" ON contactos
  FOR SELECT USING (
    user_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════
-- B. RRPP: identidad como rol sobre usuario
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  nombre_publico TEXT NOT NULL,
  foto_url TEXT,
  bio TEXT,
  -- Redes (opcionales, mostradas en página pública)
  instagram TEXT,
  tiktok TEXT,
  -- Estado del rol RRPP del usuario
  activo BOOLEAN NOT NULL DEFAULT true,
  -- Términos aceptados (registro tipo creator, autodeclaración edad)
  terminos_aceptados_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edad_declarada_18 BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rrpp_usuario ON rrpp (usuario_id);
CREATE INDEX IF NOT EXISTS idx_rrpp_slug ON rrpp (lower(slug));

-- FK pendiente que dejamos en contactos.primer_rrpp_id
ALTER TABLE contactos
  DROP CONSTRAINT IF EXISTS contactos_primer_rrpp_fk;
ALTER TABLE contactos
  ADD CONSTRAINT contactos_primer_rrpp_fk
  FOREIGN KEY (primer_rrpp_id) REFERENCES rrpp(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_rrpp_touch ON rrpp;
CREATE TRIGGER trg_rrpp_touch
  BEFORE UPDATE ON rrpp
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE rrpp ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver los RRPP activos (página pública, listados, etc.)
DROP POLICY IF EXISTS "RRPP activos son públicos" ON rrpp;
CREATE POLICY "RRPP activos son públicos" ON rrpp
  FOR SELECT USING (activo = true);

-- El RRPP gestiona su propio perfil
DROP POLICY IF EXISTS "RRPP gestiona su perfil" ON rrpp;
CREATE POLICY "RRPP gestiona su perfil" ON rrpp
  FOR UPDATE USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════
-- C. Relación RRPP ↔ Local con su comisión pactada
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rrpp_venue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  -- Estado de la relación
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'activa', 'pausada', 'archivada')
  ),
  -- Iniciado por quién: si propuso el RRPP es 'rrpp'; si invitó el venue, 'venue'
  iniciado_por TEXT NOT NULL DEFAULT 'venue' CHECK (
    iniciado_por IN ('rrpp', 'venue')
  ),
  -- Comisión configurada por el venue (MVP: global por venue, % sobre bruto)
  comision_pct NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (comision_pct >= 0 AND comision_pct <= 100),
  -- Tope absoluto por venta (€) — análogo al tope 3€ de PartyMaps. NULL = sin tope.
  tope_por_venta NUMERIC(10, 2) CHECK (tope_por_venta IS NULL OR tope_por_venta >= 0),
  -- Triggers activos: jsonb con los triggers que aplican (MVP soporta entrada, escaneo, bar)
  triggers_activos JSONB NOT NULL DEFAULT '{
    "entrada_vendida": true,
    "escaneada_en_puerta": false,
    "consumo_bar": false
  }',
  -- Reglas de atribución (ventana, last-click, etc.)
  reglas_atribucion JSONB NOT NULL DEFAULT '{
    "modelo": "last_click",
    "ventana_dias": 7
  }',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rrpp_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_rrpp_venue_local ON rrpp_venue (local_id) WHERE estado = 'activa';
CREATE INDEX IF NOT EXISTS idx_rrpp_venue_rrpp ON rrpp_venue (rrpp_id) WHERE estado = 'activa';

DROP TRIGGER IF EXISTS trg_rrpp_venue_touch ON rrpp_venue;
CREATE TRIGGER trg_rrpp_venue_touch
  BEFORE UPDATE ON rrpp_venue
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE rrpp_venue ENABLE ROW LEVEL SECURITY;

-- Pública: relaciones activas son visibles (para que la página /r/[slug]
-- pueda mostrar dónde trabaja cada RRPP).
DROP POLICY IF EXISTS "Relaciones activas son públicas" ON rrpp_venue;
CREATE POLICY "Relaciones activas son públicas" ON rrpp_venue
  FOR SELECT USING (estado = 'activa');

-- El RRPP ve todas sus relaciones (incluso pendientes/pausadas)
DROP POLICY IF EXISTS "RRPP ve sus relaciones" ON rrpp_venue;
CREATE POLICY "RRPP ve sus relaciones" ON rrpp_venue
  FOR SELECT USING (
    rrpp_id IN (
      SELECT r.id FROM rrpp r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Trabajadores del local ven las relaciones de su local
DROP POLICY IF EXISTS "Trabajadores ven relaciones del local" ON rrpp_venue;
CREATE POLICY "Trabajadores ven relaciones del local" ON rrpp_venue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = rrpp_venue.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- Trabajadores gestionan (INSERT/UPDATE/DELETE separados por el bug 012)
DROP POLICY IF EXISTS "Trabajadores insertan relaciones" ON rrpp_venue;
CREATE POLICY "Trabajadores insertan relaciones" ON rrpp_venue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = rrpp_venue.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

DROP POLICY IF EXISTS "Trabajadores actualizan relaciones" ON rrpp_venue;
CREATE POLICY "Trabajadores actualizan relaciones" ON rrpp_venue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = rrpp_venue.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- ════════════════════════════════════════════════════════════════
-- D. Links de venta del RRPP (por evento o general)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS link_rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  -- NULL = link general del RRPP en ese local. Con valor = link por evento concreto.
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  -- Códigos manuales legibles (ej. "leo10") opcionales
  codigo_manual TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_rrpp_token ON link_rrpp (token) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_link_rrpp_codigo ON link_rrpp (lower(codigo_manual)) WHERE codigo_manual IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_link_rrpp_rrpp_local ON link_rrpp (rrpp_id, local_id, evento_id);

-- Códigos manuales únicos POR local
CREATE UNIQUE INDEX IF NOT EXISTS uq_link_codigo_manual_local
  ON link_rrpp (local_id, lower(codigo_manual)) WHERE codigo_manual IS NOT NULL;

ALTER TABLE link_rrpp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Links activos son públicos por token" ON link_rrpp;
CREATE POLICY "Links activos son públicos por token" ON link_rrpp
  FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "RRPP gestiona sus links" ON link_rrpp;
CREATE POLICY "RRPP gestiona sus links" ON link_rrpp
  FOR ALL USING (
    rrpp_id IN (
      SELECT r.id FROM rrpp r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- E. Binding cliente ↔ RRPP (la pieza central)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS binding_rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contacto_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  -- Evento opcional. Si NULL, es binding genérico de la noche en el local.
  evento_id UUID REFERENCES eventos(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'activo', 'expirado', 'cancelado')
  ),
  mecanismo_creacion TEXT NOT NULL CHECK (
    mecanismo_creacion IN ('link_compra', 'lista_rrpp', 'qr_rrpp',
                           'declaracion_bar', 'pre_binding', 'venta_taquilla', 'admin')
  ),
  mecanismo_activacion TEXT CHECK (
    mecanismo_activacion IS NULL OR mecanismo_activacion IN (
      'compra_entrada', 'puerta_scan', 'barra_pedido',
      'venta_taquilla', 'auto_link', 'admin'
    )
  ),
  link_id UUID REFERENCES link_rrpp(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activado_at TIMESTAMPTZ,
  expira_at TIMESTAMPTZ NOT NULL,
  cancelado_at TIMESTAMPTZ,
  cancelado_motivo TEXT
);

-- Un único binding ACTIVO por contacto/local en una ventana (controlado por endpoints)
CREATE INDEX IF NOT EXISTS idx_binding_contacto_local
  ON binding_rrpp (contacto_id, local_id, estado);
CREATE INDEX IF NOT EXISTS idx_binding_rrpp ON binding_rrpp (rrpp_id, estado);
CREATE INDEX IF NOT EXISTS idx_binding_expira ON binding_rrpp (expira_at) WHERE estado IN ('pendiente', 'activo');

ALTER TABLE binding_rrpp ENABLE ROW LEVEL SECURITY;

-- El RRPP ve sus bindings
DROP POLICY IF EXISTS "RRPP ve sus bindings" ON binding_rrpp;
CREATE POLICY "RRPP ve sus bindings" ON binding_rrpp
  FOR SELECT USING (
    rrpp_id IN (
      SELECT r.id FROM rrpp r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- El contacto registrado ve los bindings que le afectan
DROP POLICY IF EXISTS "Usuario ve sus bindings" ON binding_rrpp;
CREATE POLICY "Usuario ve sus bindings" ON binding_rrpp
  FOR SELECT USING (
    contacto_id IN (
      SELECT c.id FROM contactos c
      JOIN usuarios u ON u.id = c.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Trabajadores del local ven los bindings de su local
DROP POLICY IF EXISTS "Trabajadores ven bindings del local" ON binding_rrpp;
CREATE POLICY "Trabajadores ven bindings del local" ON binding_rrpp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = binding_rrpp.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
    )
  );

-- Función para expirar bindings (cron)
CREATE OR REPLACE FUNCTION expirar_bindings_rrpp()
RETURNS INTEGER AS $$
DECLARE expirados INTEGER;
BEGIN
  UPDATE binding_rrpp
  SET estado = 'expirado'
  WHERE estado IN ('pendiente', 'activo') AND expira_at < NOW();
  GET DIAGNOSTICS expirados = ROW_COUNT;
  RETURN expirados;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- F. Listas de invitados del RRPP
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lista_rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT 'Lista principal',
  -- Lista cerrada (solo se accede con el nombre/teléfono añadido por el RRPP)
  -- o abierta (cualquiera la rellena hasta cierto cupo bajo el nombre del RRPP).
  tipo TEXT NOT NULL DEFAULT 'cerrada' CHECK (tipo IN ('cerrada', 'abierta')),
  cupo_max INTEGER,
  -- Precio si la lista no es gratis (en €). 0 = gratis.
  precio NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  -- Hora límite para llegar a esa entrada (opcional, ej. "antes de las 1h")
  hora_limite TIME,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lista_rrpp_evento ON lista_rrpp (evento_id) WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_lista_rrpp_rrpp ON lista_rrpp (rrpp_id);

DROP TRIGGER IF EXISTS trg_lista_rrpp_touch ON lista_rrpp;
CREATE TRIGGER trg_lista_rrpp_touch
  BEFORE UPDATE ON lista_rrpp
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE lista_rrpp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listas activas son públicas" ON lista_rrpp;
CREATE POLICY "Listas activas son públicas" ON lista_rrpp
  FOR SELECT USING (activa = true);

DROP POLICY IF EXISTS "RRPP gestiona sus listas" ON lista_rrpp;
CREATE POLICY "RRPP gestiona sus listas" ON lista_rrpp
  FOR ALL USING (
    rrpp_id IN (
      SELECT r.id FROM rrpp r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Ítem de lista (cada invitado)
CREATE TABLE IF NOT EXISTS lista_rrpp_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lista_id UUID NOT NULL REFERENCES lista_rrpp(id) ON DELETE CASCADE,
  contacto_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  -- Token que sirve como QR de acceso si la lista es válida
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  estado TEXT NOT NULL DEFAULT 'invitado' CHECK (
    estado IN ('invitado', 'confirmado', 'entrado', 'no_show', 'cancelado')
  ),
  invitacion_enviada_en TIMESTAMPTZ,
  confirmado_en TIMESTAMPTZ,
  entrado_en TIMESTAMPTZ,
  entrado_por UUID REFERENCES usuario_local(id),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lista_id, contacto_id)
);

CREATE INDEX IF NOT EXISTS idx_lista_item_lista ON lista_rrpp_item (lista_id);
CREATE INDEX IF NOT EXISTS idx_lista_item_token ON lista_rrpp_item (token);
CREATE INDEX IF NOT EXISTS idx_lista_item_contacto ON lista_rrpp_item (contacto_id);

ALTER TABLE lista_rrpp_item ENABLE ROW LEVEL SECURITY;

-- El contacto registrado ve su propia entrada en la lista
DROP POLICY IF EXISTS "Usuario ve su ítem de lista" ON lista_rrpp_item;
CREATE POLICY "Usuario ve su ítem de lista" ON lista_rrpp_item
  FOR SELECT USING (
    contacto_id IN (
      SELECT c.id FROM contactos c
      JOIN usuarios u ON u.id = c.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- El RRPP ve los items de sus listas
DROP POLICY IF EXISTS "RRPP ve items de sus listas" ON lista_rrpp_item;
CREATE POLICY "RRPP ve items de sus listas" ON lista_rrpp_item
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lista_rrpp l
      JOIN rrpp r ON r.id = l.rrpp_id
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE l.id = lista_rrpp_item.lista_id
        AND u.auth_id = auth.uid()
    )
  );

-- Trabajadores del local ven items para canjear en puerta
DROP POLICY IF EXISTS "Trabajadores ven items del local" ON lista_rrpp_item;
CREATE POLICY "Trabajadores ven items del local" ON lista_rrpp_item
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lista_rrpp l
      JOIN usuario_local ul ON ul.local_id = l.local_id
      WHERE l.id = lista_rrpp_item.lista_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
    )
  );

-- ════════════════════════════════════════════════════════════════
-- G. Perks emitidos por el venue al RRPP, asignados a contactos
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS perk_rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  -- Contacto destino (a quién se ha asignado el perk).
  contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (
    tipo IN ('paso_libre', 'canje_copas', 'descuento_pct', 'acceso_vip', 'merch')
  ),
  -- Para 'canje_copas': cuántas. Para 'descuento_pct': el %. Etc.
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  descripcion TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  estado TEXT NOT NULL DEFAULT 'emitido' CHECK (
    estado IN ('emitido', 'asignado', 'canjeado', 'expirado', 'revocado')
  ),
  -- Caducidad obligatoria por defecto 30 días desde emisión
  expira_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  asignado_at TIMESTAMPTZ,
  canjeado_at TIMESTAMPTZ,
  canjeado_por UUID REFERENCES usuario_local(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perk_rrpp ON perk_rrpp (rrpp_id, estado);
CREATE INDEX IF NOT EXISTS idx_perk_contacto ON perk_rrpp (contacto_id, estado);
CREATE INDEX IF NOT EXISTS idx_perk_token ON perk_rrpp (token);
CREATE INDEX IF NOT EXISTS idx_perk_expira ON perk_rrpp (expira_at) WHERE estado IN ('emitido', 'asignado');

ALTER TABLE perk_rrpp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRPP ve sus perks" ON perk_rrpp;
CREATE POLICY "RRPP ve sus perks" ON perk_rrpp
  FOR SELECT USING (
    rrpp_id IN (
      SELECT r.id FROM rrpp r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuario ve perks que le asignaron" ON perk_rrpp;
CREATE POLICY "Usuario ve perks que le asignaron" ON perk_rrpp
  FOR SELECT USING (
    contacto_id IN (
      SELECT c.id FROM contactos c
      JOIN usuarios u ON u.id = c.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trabajadores ven perks del local" ON perk_rrpp;
CREATE POLICY "Trabajadores ven perks del local" ON perk_rrpp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = perk_rrpp.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
    )
  );

-- ════════════════════════════════════════════════════════════════
-- H. Followers del RRPP
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rrpp_seguidor (
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  seguido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  silenciado BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (rrpp_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_rrpp_seguidor_usuario ON rrpp_seguidor (usuario_id);

ALTER TABLE rrpp_seguidor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seguidos visibles públicamente" ON rrpp_seguidor;
CREATE POLICY "Seguidos visibles públicamente" ON rrpp_seguidor
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuario gestiona sus seguimientos" ON rrpp_seguidor;
CREATE POLICY "Usuario gestiona sus seguimientos" ON rrpp_seguidor
  FOR ALL USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════
-- I. Liquidaciones mensuales + audit log
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS liquidacion_rrpp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rrpp_id UUID NOT NULL REFERENCES rrpp(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  periodo CHAR(7) NOT NULL,                    -- formato 'YYYY-MM'
  monto_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  num_ventas INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'marcado_pagado', 'confirmado', 'disputado')
  ),
  marcado_pagado_at TIMESTAMPTZ,
  marcado_pagado_por UUID REFERENCES usuario_local(id),
  marcado_pagado_nota TEXT,
  confirmado_at TIMESTAMPTZ,
  disputado_at TIMESTAMPTZ,
  disputa_nota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rrpp_id, local_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_liquidacion_rrpp ON liquidacion_rrpp (rrpp_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_liquidacion_local ON liquidacion_rrpp (local_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_liquidacion_estado ON liquidacion_rrpp (estado, marcado_pagado_at);

DROP TRIGGER IF EXISTS trg_liquidacion_touch ON liquidacion_rrpp;
CREATE TRIGGER trg_liquidacion_touch
  BEFORE UPDATE ON liquidacion_rrpp
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE liquidacion_rrpp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RRPP ve sus liquidaciones" ON liquidacion_rrpp;
CREATE POLICY "RRPP ve sus liquidaciones" ON liquidacion_rrpp
  FOR SELECT USING (
    rrpp_id IN (
      SELECT r.id FROM rrpp r
      JOIN usuarios u ON u.id = r.usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trabajadores ven liquidaciones del local" ON liquidacion_rrpp;
CREATE POLICY "Trabajadores ven liquidaciones del local" ON liquidacion_rrpp
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuario_local ul
      WHERE ul.local_id = liquidacion_rrpp.local_id
        AND ul.email = (SELECT auth.jwt() ->> 'email')
        AND ul.activo = true
        AND ul.rol IN ('dueno', 'gestor')
    )
  );

-- Líneas de cada liquidación (qué ventas/pedidos la componen)
CREATE TABLE IF NOT EXISTS liquidacion_rrpp_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liquidacion_id UUID NOT NULL REFERENCES liquidacion_rrpp(id) ON DELETE CASCADE,
  trigger_tipo TEXT NOT NULL CHECK (
    trigger_tipo IN ('entrada_vendida', 'escaneada_en_puerta', 'consumo_bar', 'manual')
  ),
  -- Referencias polimórficas (una sí, otras NULL)
  entrada_id UUID REFERENCES entradas(id) ON DELETE SET NULL,
  pedido_bar_id UUID REFERENCES pedidos_bar(id) ON DELETE SET NULL,
  monto_base NUMERIC(10, 2) NOT NULL,           -- bruto sobre el que se calculó
  comision_pct NUMERIC(5, 2) NOT NULL,           -- % aplicado
  monto_comision NUMERIC(10, 2) NOT NULL,        -- € resultantes
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liquidacion_item_liq ON liquidacion_rrpp_item (liquidacion_id);

ALTER TABLE liquidacion_rrpp_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Items siguen RLS de la liquidación" ON liquidacion_rrpp_item;
CREATE POLICY "Items siguen RLS de la liquidación" ON liquidacion_rrpp_item
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM liquidacion_rrpp WHERE id = liquidacion_rrpp_item.liquidacion_id)
  );

-- Audit log append-only de cambios de estado de la liquidación
CREATE TABLE IF NOT EXISTS audit_log_liquidacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liquidacion_id UUID NOT NULL REFERENCES liquidacion_rrpp(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,                          -- 'creada', 'marcada_pagada', 'confirmada', 'disputada', ...
  actor_user_id UUID REFERENCES usuarios(id),
  actor_rol TEXT,                                -- 'rrpp' | 'dueno' | 'gestor' | 'system'
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_liq ON audit_log_liquidacion (liquidacion_id, created_at);

ALTER TABLE audit_log_liquidacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit visible a partes de la liquidación" ON audit_log_liquidacion;
CREATE POLICY "Audit visible a partes de la liquidación" ON audit_log_liquidacion
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM liquidacion_rrpp WHERE id = audit_log_liquidacion.liquidacion_id)
  );

-- ════════════════════════════════════════════════════════════════
-- J. Atribución de entradas y pedidos a contacto + RRPP
-- ════════════════════════════════════════════════════════════════

-- Añadir contacto_id a entradas (nullable: las entradas históricas no lo tienen)
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS rrpp_id UUID REFERENCES rrpp(id) ON DELETE SET NULL;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS link_rrpp_id UUID REFERENCES link_rrpp(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entradas_contacto ON entradas (contacto_id);
CREATE INDEX IF NOT EXISTS idx_entradas_rrpp ON entradas (rrpp_id) WHERE rrpp_id IS NOT NULL;

-- Añadir contacto_id a pedidos_bar
ALTER TABLE pedidos_bar ADD COLUMN IF NOT EXISTS contacto_id UUID REFERENCES contactos(id) ON DELETE SET NULL;
ALTER TABLE pedidos_bar ADD COLUMN IF NOT EXISTS rrpp_id UUID REFERENCES rrpp(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_bar_contacto ON pedidos_bar (contacto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_bar_rrpp ON pedidos_bar (rrpp_id) WHERE rrpp_id IS NOT NULL;

-- Backfill: para entradas existentes con usuario_id, crear/encontrar su contacto
-- (idempotente: solo si no tienen contacto_id ya)
DO $$
DECLARE
  e RECORD;
  cid UUID;
  u RECORD;
BEGIN
  FOR e IN
    SELECT id, usuario_id FROM entradas WHERE contacto_id IS NULL AND usuario_id IS NOT NULL
  LOOP
    SELECT * INTO u FROM usuarios WHERE id = e.usuario_id;
    IF u.id IS NULL THEN CONTINUE; END IF;
    -- Buscar contacto existente por user_id
    SELECT id INTO cid FROM contactos WHERE user_id = u.id LIMIT 1;
    IF cid IS NULL THEN
      INSERT INTO contactos (telefono, nombre, user_id, fuente_origen)
      VALUES (u.telefono, u.nombre, u.id, 'registro_directo')
      ON CONFLICT DO NOTHING
      RETURNING id INTO cid;
      IF cid IS NULL THEN
        SELECT id INTO cid FROM contactos WHERE user_id = u.id LIMIT 1;
      END IF;
    END IF;
    UPDATE entradas SET contacto_id = cid WHERE id = e.id;
  END LOOP;
END $$;

-- Backfill análogo para pedidos_bar
DO $$
DECLARE
  p RECORD; cid UUID; u RECORD;
BEGIN
  FOR p IN
    SELECT id, usuario_id FROM pedidos_bar WHERE contacto_id IS NULL AND usuario_id IS NOT NULL
  LOOP
    SELECT * INTO u FROM usuarios WHERE id = p.usuario_id;
    IF u.id IS NULL THEN CONTINUE; END IF;
    SELECT id INTO cid FROM contactos WHERE user_id = u.id LIMIT 1;
    IF cid IS NULL THEN
      INSERT INTO contactos (telefono, nombre, user_id, fuente_origen)
      VALUES (u.telefono, u.nombre, u.id, 'registro_directo')
      ON CONFLICT DO NOTHING
      RETURNING id INTO cid;
      IF cid IS NULL THEN
        SELECT id INTO cid FROM contactos WHERE user_id = u.id LIMIT 1;
      END IF;
    END IF;
    UPDATE pedidos_bar SET contacto_id = cid WHERE id = p.id;
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════
-- FIN migración 019
-- ════════════════════════════════════════════════════════════════
