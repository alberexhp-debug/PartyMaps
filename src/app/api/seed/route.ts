import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Solo accesible con CRON_SECRET para evitar ejecución accidental.
// Idempotente: se puede ejecutar varias veces sin duplicar datos.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const log: string[] = []
  const errors: string[] = []

  async function crearAuthUserPorEmail(email: string, password: string) {
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existente = lista?.users.find(u => u.email === email)
    if (existente) {
      // Asegurar que la contraseña está al valor de seed por si se cambió.
      await admin.auth.admin.updateUserById(existente.id, { password, email_confirm: true })
      log.push(`Auth (email) ya existe: ${email}`)
      return existente
    }
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (error) { errors.push(`Auth ${email}: ${error.message}`); return null }
    log.push(`Auth (email) creado: ${email}`)
    return data.user
  }

  async function crearAuthUserPorTelefono(telefono: string, password: string) {
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 })
    // El teléfono que devuelve Supabase no tiene el "+" delante.
    const phoneNorm = telefono.replace(/^\+/, '')
    const existente = lista?.users.find(u => u.phone === phoneNorm)
    if (existente) {
      await admin.auth.admin.updateUserById(existente.id, { password, phone_confirm: true })
      log.push(`Auth (tel) ya existe: ${telefono}`)
      return existente
    }
    const { data, error } = await admin.auth.admin.createUser({
      phone: telefono, password, phone_confirm: true,
    })
    if (error) { errors.push(`Auth tel ${telefono}: ${error.message}`); return null }
    log.push(`Auth (tel) creado: ${telefono}`)
    return data.user
  }

  // ── 1. CUENTAS ADMIN PANEL ────────────────────────────────────────────────
  const adminAccounts = [
    { email: 'superadmin@partymaps.com', password: 'PM_SuperAdmin2025!', rol: 'super_admin', nombre: 'Super Admin' },
    { email: 'admin@partymaps.com',      password: 'PM_Admin2025!',      rol: 'admin',       nombre: 'Admin Test' },
    { email: 'soporte@partymaps.com',    password: 'PM_Soporte2025!',    rol: 'soporte',     nombre: 'Soporte Test' },
  ]

  for (const acc of adminAccounts) {
    const user = await crearAuthUserPorEmail(acc.email, acc.password)
    if (!user) continue
    const { error } = await admin.from('administradores').upsert({
      auth_id: user.id,
      nombre: acc.nombre,
      email: acc.email,
      rol: acc.rol,
      activo: true,
      totp_secret: process.env.ADMIN_TOTP_SECRET ?? 'K45HX3JEC7U4Z5BPEFCKMNOR7RRPLMS7',
      totp_activado: true,
    }, { onConflict: 'email' })
    if (error) errors.push(`Administrador ${acc.email}: ${error.message}`)
    else log.push(`Administrador OK: ${acc.email} (${acc.rol})`)
  }

  // ── 2. LOCAL DE TEST GENÉRICO ─────────────────────────────────────────────
  let localTestId: string | null = null
  const { data: localExistente } = await admin
    .from('locales').select('id').eq('nombre', 'Club Test PartyMaps').maybeSingle()

  if (localExistente) {
    localTestId = localExistente.id
    log.push(`Local "Club Test PartyMaps" ya existe: ${localTestId}`)
  } else {
    const { data: newLocal, error: localErr } = await admin.from('locales').insert({
      nombre: 'Club Test PartyMaps',
      descripcion: 'Local de prueba para testear la plataforma PartyMaps. Discoteca electrónica en el centro de Madrid.',
      tipo_local: 'discoteca',
      musica: ['techno', 'house', 'electronica'],
      direccion: 'Calle Gran Vía, 45, 28013 Madrid',
      ciudad: 'Madrid',
      latitud: 40.4200,
      longitud: -3.7025,
      radio_verificacion_metros: 5000,
      aforo_maximo: 500,
      precio_entrada_min: 10,
      precio_entrada_max: 20,
      imagenes: [
        'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800',
        'https://images.unsplash.com/photo-1496297719650-0e341f40c0ce?w=800',
        'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
      ],
      tier: 'pro',
      modulos_activos: ['concurso', 'perfil_noche', 'retos'],
      consumiciones_bienvenida: [
        { id: crypto.randomUUID(), nombre: 'Copa de bienvenida', descripcion: 'Gin tonic o similar', precio: 8 },
        { id: crypto.randomUUID(), nombre: 'Cerveza premium', descripcion: 'Estrella Damm o Voll-Damm', precio: 5 },
      ],
      horario: {
        jueves: { apertura: '23:00', cierre: '06:00' },
        viernes: { apertura: '23:00', cierre: '07:00' },
        sabado: { apertura: '23:00', cierre: '07:00' },
        domingo: { apertura: '00:00', cierre: '06:00' },
      },
      estado: 'activo',
      aforo_estimado_porcentaje: 68,
      num_suscriptores: 0,
      notificaciones_semana_count: 0,
    }).select('id').single()

    if (localErr || !newLocal) { errors.push(`Local: ${localErr?.message}`); }
    else { localTestId = newLocal.id; log.push(`Local "Club Test PartyMaps" creado: ${localTestId}`) }
  }

  // ── 3. CUENTAS PANEL LOCAL — Club Test PartyMaps (las originales) ─────────
  if (localTestId) {
    const localAccounts = [
      { email: 'dueno@testlocal.com',     password: 'PM_Dueno2025!',    rol: 'dueno',           nombre: 'Dueño Test' },
      { email: 'gestor@testlocal.com',    password: 'PM_Gestor2025!',   rol: 'gestor',          nombre: 'Gestor Test' },
      { email: 'operador@testlocal.com',  password: 'PM_Operador2025!', rol: 'operador_noche',  nombre: 'Operador Noche' },
      { email: 'puerta@testlocal.com',    password: 'PM_Puerta2025!',   rol: 'puerta',          nombre: 'Puerta Test' },
    ]

    for (const acc of localAccounts) {
      const user = await crearAuthUserPorEmail(acc.email, acc.password)
      if (!user) continue
      const { error } = await admin.from('usuario_local').upsert({
        usuario_id: null,
        local_id: localTestId,
        rol: acc.rol,
        email: acc.email,
        nombre: acc.nombre,
        activo: true,
      }, { onConflict: 'email,local_id' })
      if (error) errors.push(`Worker ${acc.email}: ${error.message}`)
      else log.push(`Worker OK: ${acc.email} (${acc.rol})`)
    }

    // ── 4. EVENTO DE TEST ────────────────────────────────────────────────────
    const { data: eventoExistente } = await admin
      .from('eventos').select('id').eq('local_id', localTestId).eq('nombre', 'Noche Test — Techno Friday').maybeSingle()

    let eventoId: string | null = eventoExistente?.id ?? null

    if (!eventoExistente) {
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() + 1)
      fechaInicio.setHours(23, 0, 0, 0)
      const fechaFin = new Date(fechaInicio)
      fechaFin.setHours(fechaFin.getHours() + 7)

      const { data: ev, error: evErr } = await admin.from('eventos').insert({
        local_id: localTestId,
        nombre: 'Noche Test — Techno Friday',
        descripcion: 'Sesión de techno y house con los mejores DJs de la escena madrileña. Early bird disponible.',
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        aforo_maximo: 500,
        precio_base: 10,
        precio_maximo: 20,
        precio_early_bird: 7,
        early_bird_hasta: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        early_bird_cupo: 50,
        dress_code: 'Smart casual — no deportivo',
        estado: 'publicado',
        entradas_vendidas: 127,
        modulos_activos: ['concurso'],
      }).select('id').single()

      if (evErr) errors.push(`Evento: ${evErr.message}`)
      else { eventoId = ev?.id ?? null; log.push(`Evento creado: ${eventoId}`) }
    }

    // ── 5. HISTORIAL AFORO (gráfica del dashboard) ───────────────────────────
    //     Schema real: fecha (DATE) + hora (INTEGER 0-23) + aforo_estimado FLOAT
    const hoy = new Date()
    const fechaHoy = hoy.toISOString().slice(0, 10)
    const aforoData = Array.from({ length: 24 }, (_, i) => ({
      local_id: localTestId!,
      fecha: fechaHoy,
      hora: i,
      aforo_estimado: Math.min(100, Math.max(5,
        Math.round(15 + Math.sin((i / 24) * Math.PI * 2 - 1) * 35 + Math.random() * 10)
      )),
    }))
    const { error: histErr } = await admin.from('historial_aforo').upsert(aforoData)
    if (histErr) errors.push(`Historial aforo: ${histErr.message}`)
    else log.push('Historial aforo upsert (24 puntos)')

    // ── 6. CONCURSO ACTIVO ───────────────────────────────────────────────────
    const { data: concursoExistente } = await admin
      .from('concursos').select('id').eq('local_id', localTestId).eq('estado', 'activo').maybeSingle()

    if (!concursoExistente) {
      const { error: concErr } = await admin.from('concursos').insert({
        local_id: localTestId,
        evento_id: eventoId,
        descripcion: 'Sube la mejor foto del ambiente de esta noche y gana el premio sorpresa. La foto con más votos del público gana.',
        tipo_contenido: 'foto',
        fuente_contenido: 'directa',
        hora_apertura: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        hora_cierre: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        premio: 'Botella de Moët & Chandon para el ganador y su grupo',
        estado: 'activo',
      })
      if (concErr) errors.push(`Concurso: ${concErr.message}`)
      else log.push('Concurso activo creado')
    }

    // ── 7. RETO ACTIVO ───────────────────────────────────────────────────────
    const { data: retoExistente } = await admin
      .from('retos').select('id').eq('local_id', localTestId).eq('estado', 'activo').maybeSingle()

    if (!retoExistente) {
      const { error: retoErr } = await admin.from('retos').insert({
        local_id: localTestId,
        nombre: 'El selfie más épico de la noche',
        descripcion: 'Hazte el selfie más original que puedas dentro del club. El más votado gana una consumición gratis.',
        tipo_contenido: 'foto',
        metodo_ganador: 'votos',
        premio: 'Consumición gratis en la barra',
        hora_cierre: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        estado: 'activo',
      })
      if (retoErr) errors.push(`Reto: ${retoErr.message}`)
      else log.push('Reto activo creado')
    }
  }

  // ── 8. LOCALES FAMOSOS DE MADRID — trabajadores por local ─────────────────
  //     Migración 007 ya creó estos locales. Aquí solo añadimos su equipo.
  const venuesFamosos: { nombre: string; slug: string }[] = [
    { nombre: 'Kapital',        slug: 'kapital' },
    { nombre: 'Teatro Barceló', slug: 'teatro-barcelo' },
    { nombre: 'Mondo Disko',    slug: 'mondo-disko' },
  ]

  const rolesPorLocal: { rol: 'dueno' | 'gestor' | 'operador_noche' | 'puerta'; prefijo: string; nombreBase: string; passLabel: string }[] = [
    { rol: 'dueno',          prefijo: 'dueno',    nombreBase: 'Dueño',          passLabel: 'Dueno' },
    { rol: 'gestor',         prefijo: 'gestor',   nombreBase: 'Gestor',         passLabel: 'Gestor' },
    { rol: 'operador_noche', prefijo: 'operador', nombreBase: 'Operador noche', passLabel: 'Operador' },
    { rol: 'puerta',         prefijo: 'puerta',   nombreBase: 'Puerta',         passLabel: 'Puerta' },
  ]

  for (const venue of venuesFamosos) {
    const { data: local } = await admin
      .from('locales').select('id, nombre').eq('nombre', venue.nombre).maybeSingle()
    if (!local) {
      errors.push(`Local famoso no encontrado: ${venue.nombre} — ¿se aplicó migración 007?`)
      continue
    }
    log.push(`Local famoso encontrado: ${venue.nombre} → ${local.id}`)

    for (const r of rolesPorLocal) {
      const email = `${r.prefijo}.${venue.slug}@partymaps.com`
      const password = `PM_${r.passLabel}_${venue.slug.replace(/-/g, '')}_2025!`
      const user = await crearAuthUserPorEmail(email, password)
      if (!user) continue
      const { error } = await admin.from('usuario_local').upsert({
        usuario_id: null,
        local_id: local.id,
        rol: r.rol,
        email,
        nombre: `${r.nombreBase} ${venue.nombre}`,
        activo: true,
      }, { onConflict: 'email,local_id' })
      if (error) errors.push(`Worker ${email}: ${error.message}`)
      else log.push(`Worker OK: ${email} (${r.rol}) → ${venue.nombre}`)
    }

    // Un evento próximo en cada local famoso (publicado)
    const { data: evExistente } = await admin
      .from('eventos').select('id').eq('local_id', local.id).eq('nombre', `Noche en ${venue.nombre}`).maybeSingle()
    if (!evExistente) {
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() + 2)
      fechaInicio.setHours(23, 30, 0, 0)
      const fechaFin = new Date(fechaInicio)
      fechaFin.setHours(fechaFin.getHours() + 6)
      const { error: evErr } = await admin.from('eventos').insert({
        local_id: local.id,
        nombre: `Noche en ${venue.nombre}`,
        descripcion: `Una noche de fiesta legendaria en ${venue.nombre}. Música y ambiente al máximo.`,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        aforo_maximo: 800,
        precio_base: 15,
        precio_maximo: 20,
        estado: 'publicado',
        modulos_activos: ['concurso'],
      })
      if (evErr) errors.push(`Evento ${venue.nombre}: ${evErr.message}`)
      else log.push(`Evento creado para ${venue.nombre}`)
    }
  }

  // ── 9. USUARIOS PWA (3 cuentas genéricas con teléfono + contraseña) ───────
  //     Usamos números E.164 ficticios. Login del PWA por SMS sigue funcionando;
  //     además añadimos login por contraseña en /login para testing automatizado.
  const pwaUsuarios: { telefono: string; password: string; nombre: string; fecha_nacimiento: string }[] = [
    { telefono: '+34666000001', password: 'PM_User1_2025!', nombre: 'María García',  fecha_nacimiento: '1998-04-15' },
    { telefono: '+34666000002', password: 'PM_User2_2025!', nombre: 'Carlos López',  fecha_nacimiento: '2000-08-22' },
    { telefono: '+34666000003', password: 'PM_User3_2025!', nombre: 'Laura Sánchez', fecha_nacimiento: '1995-12-03' },
  ]

  for (const u of pwaUsuarios) {
    const authUser = await crearAuthUserPorTelefono(u.telefono, u.password)
    if (!authUser) continue
    // Asegurar fila en `usuarios`. UNIQUE por auth_id y por telefono.
    const { data: existente } = await admin
      .from('usuarios').select('id').eq('auth_id', authUser.id).maybeSingle()
    if (existente) {
      log.push(`Usuario PWA ya existe en BD: ${u.telefono}`)
      continue
    }
    const { error } = await admin.from('usuarios').insert({
      auth_id: authUser.id,
      telefono: u.telefono,
      telefono_verificado: true,
      nombre: u.nombre,
      fecha_nacimiento: u.fecha_nacimiento,
      estado_cuenta: 'activa',
    })
    if (error) errors.push(`Usuario PWA ${u.telefono}: ${error.message}`)
    else log.push(`Usuario PWA creado: ${u.telefono} (${u.nombre})`)
  }

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok: errors.length === 0,
    log,
    errors,
    credenciales: {
      '── PANEL ADMIN (/admin/login) ──': {
        super_admin: 'superadmin@partymaps.com  /  PM_SuperAdmin2025!',
        admin:       'admin@partymaps.com       /  PM_Admin2025!',
        soporte:     'soporte@partymaps.com     /  PM_Soporte2025!',
        totp_nota:   'Código TOTP: usa app autenticador con secret = K45HX3JEC7U4Z5BPEFCKMNOR7RRPLMS7',
        totp_url:    'otpauth://totp/PartyMaps%20Admin?secret=K45HX3JEC7U4Z5BPEFCKMNOR7RRPLMS7&issuer=PartyMaps',
      },
      '── PANEL LOCAL — Club Test ──': {
        dueno:          'dueno@testlocal.com      /  PM_Dueno2025!',
        gestor:         'gestor@testlocal.com     /  PM_Gestor2025!',
        operador_noche: 'operador@testlocal.com   /  PM_Operador2025!',
        puerta:         'puerta@testlocal.com     /  PM_Puerta2025!',
      },
      '── PANEL LOCAL — Kapital ──': {
        dueno:    'dueno.kapital@partymaps.com    /  PM_Dueno_kapital_2025!',
        gestor:   'gestor.kapital@partymaps.com   /  PM_Gestor_kapital_2025!',
        operador: 'operador.kapital@partymaps.com /  PM_Operador_kapital_2025!',
        puerta:   'puerta.kapital@partymaps.com   /  PM_Puerta_kapital_2025!',
      },
      '── PANEL LOCAL — Teatro Barceló ──': {
        dueno:    'dueno.teatro-barcelo@partymaps.com    /  PM_Dueno_teatrobarcelo_2025!',
        gestor:   'gestor.teatro-barcelo@partymaps.com   /  PM_Gestor_teatrobarcelo_2025!',
        operador: 'operador.teatro-barcelo@partymaps.com /  PM_Operador_teatrobarcelo_2025!',
        puerta:   'puerta.teatro-barcelo@partymaps.com   /  PM_Puerta_teatrobarcelo_2025!',
      },
      '── PANEL LOCAL — Mondo Disko ──': {
        dueno:    'dueno.mondo-disko@partymaps.com    /  PM_Dueno_mondodisko_2025!',
        gestor:   'gestor.mondo-disko@partymaps.com   /  PM_Gestor_mondodisko_2025!',
        operador: 'operador.mondo-disko@partymaps.com /  PM_Operador_mondodisko_2025!',
        puerta:   'puerta.mondo-disko@partymaps.com   /  PM_Puerta_mondodisko_2025!',
      },
      '── PWA USUARIO (/login) ──': {
        nota: 'Login por SMS (número real) o, para testing, login por contraseña (mismo endpoint /login con link "Acceder con contraseña").',
        usuario_1: '+34666000001  /  PM_User1_2025!  · María García',
        usuario_2: '+34666000002  /  PM_User2_2025!  · Carlos López',
        usuario_3: '+34666000003  /  PM_User3_2025!  · Laura Sánchez',
      },
    },
  })
}
