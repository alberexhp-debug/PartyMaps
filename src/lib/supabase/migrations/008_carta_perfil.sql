-- =============================================
-- Migración 008: Carta de perfil holográfica
-- Idempotente. Añade columnas para personalizar
-- la carta del usuario, su slug público y la
-- visibilidad de la carta compartida.
-- =============================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS carta_frase TEXT,
  ADD COLUMN IF NOT EXISTS carta_estilo TEXT NOT NULL DEFAULT 'holo'
    CHECK (carta_estilo IN ('holo', 'aurora', 'oro', 'noche', 'rosa')),
  ADD COLUMN IF NOT EXISTS carta_publica BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS carta_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS carta_apodo TEXT;

CREATE INDEX IF NOT EXISTS idx_usuarios_carta_slug ON usuarios(carta_slug) WHERE carta_slug IS NOT NULL;

-- Generador de slug base32 corto (8 caracteres) idempotente.
-- No usamos pgcrypto para evitar dependencias; un slug aleatorio simple basta.
CREATE OR REPLACE FUNCTION generar_slug_carta()
RETURNS TEXT AS $$
DECLARE
  alfabeto TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  resultado TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    resultado := resultado || substr(alfabeto, floor(random() * length(alfabeto) + 1)::int, 1);
  END LOOP;
  RETURN resultado;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill: cada usuario sin slug recibe uno único
DO $$
DECLARE
  u RECORD;
  intentos INT;
  candidato TEXT;
BEGIN
  FOR u IN SELECT id FROM usuarios WHERE carta_slug IS NULL LOOP
    intentos := 0;
    LOOP
      candidato := generar_slug_carta();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM usuarios WHERE carta_slug = candidato);
      intentos := intentos + 1;
      IF intentos > 5 THEN
        candidato := candidato || floor(random() * 1000)::text;
        EXIT;
      END IF;
    END LOOP;
    UPDATE usuarios SET carta_slug = candidato WHERE id = u.id;
  END LOOP;
END $$;

-- Trigger para asignar slug automáticamente a nuevos usuarios
CREATE OR REPLACE FUNCTION asignar_slug_carta()
RETURNS TRIGGER AS $$
DECLARE
  intentos INT := 0;
  candidato TEXT;
BEGIN
  IF NEW.carta_slug IS NULL THEN
    LOOP
      candidato := generar_slug_carta();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM usuarios WHERE carta_slug = candidato);
      intentos := intentos + 1;
      EXIT WHEN intentos > 5;
    END LOOP;
    NEW.carta_slug := candidato;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asignar_slug_carta ON usuarios;
CREATE TRIGGER trg_asignar_slug_carta
  BEFORE INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION asignar_slug_carta();

-- RLS: cualquiera puede leer el subset de carta pública por slug (vía SECURITY DEFINER endpoint).
-- No hacemos RLS abierto sobre la tabla — el endpoint /api/perfil/carta-publica usa service role
-- y filtra solo columnas seguras (sin teléfono ni email).

-- Tabla opcional: frases sugeridas por signo (alimenta el editor)
CREATE TABLE IF NOT EXISTS frases_zodiaco (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signo TEXT NOT NULL CHECK (signo IN (
    'Aries','Tauro','Géminis','Cáncer','Leo','Virgo',
    'Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'
  )),
  frase TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frases_zodiaco_signo ON frases_zodiaco(signo) WHERE activa = true;

ALTER TABLE frases_zodiaco ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Frases zodiaco son públicas en lectura" ON frases_zodiaco;
CREATE POLICY "Frases zodiaco son públicas en lectura" ON frases_zodiaco
  FOR SELECT USING (activa = true);

DROP POLICY IF EXISTS "Solo admins editan frases zodiaco" ON frases_zodiaco;
CREATE POLICY "Solo admins editan frases zodiaco" ON frases_zodiaco
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
