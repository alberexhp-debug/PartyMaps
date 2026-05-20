import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Solo accesible con CRON_SECRET para evitar ejecución accidental
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

  async function crearAuthUser(email: string, password: string) {
    // Buscar si ya existe
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existente = lista?.users.find(u => u.email === email)
    if (existente) { log.push(`Auth user ya existe: ${email}`); return existente }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) { errors.push(`Auth ${email}: ${error.message}`); return null }
    log.push(`Auth user creado: ${email}`)
    return data.user
  }

  // ── 1. CUENTAS ADMIN PANEL ────────────────────────────────────────────────
  const adminAccounts = [
    { email: 'superadmin@fourvenues.com', password: 'FV_SuperAdmin2025!', rol: 'super_admin', nombre: 'Super Admin' },
    { email: 'admin@fourvenues.com',      password: 'FV_Admin2025!',      rol: 'admin',       nombre: 'Admin Test' },
    { email: 'soporte@fourvenues.com',    password: 'FV_Soporte2025!',    rol: 'soporte',     nombre: 'Soporte Test' },
  ]

  for (const acc of adminAccounts) {
    const user = await crearAuthUser(acc.email, acc.password)
    if (!user) continue
    const { error } = await admin.from('administradores').upsert({
      auth_id: user.id,
      nombre: acc.nombre,
      email: acc.email,
      rol: acc.rol,
      activo: true,
      totp_secret: process.env.ADMIN_TOTP_SECRET ?? 'JBSWY3DPEHPK3PXP',
      totp_activado: true,
    }, { onConflict: 'email' })
    if (error) errors.push(`Administrador ${acc.email}: ${error.message}`)
    else log.push(`Administrador creado: ${acc.email} (${acc.rol})`)
  }

  // ── 2. LOCAL DE TEST ───────────────────────────────────────────────────────
  let localId: string | null = null
  const { data: localExistente } = await admin
    .from('locales').select('id').eq('nombre', 'Club Test Fourvenues').single()

  if (localExistente) {
    localId = localExistente.id
    log.push(`Local ya existe: ${localId}`)
  } else {
    const { data: newLocal, error: localErr } = await admin.from('locales').insert({
      nombre: 'Club Test Fourvenues',
      descripcion: 'Local de prueba para testear la plataforma Fourvenues. Discoteca electrónica en el centro de Madrid.',
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
    else { localId = newLocal.id; log.push(`Local creado: ${localId}`) }
  }

  // ── 3. CUENTAS PANEL LOCAL ────────────────────────────────────────────────
  if (localId) {
    const localAccounts = [
      { email: 'dueno@testlocal.com',     password: 'FV_Dueno2025!',    rol: 'dueno',           nombre: 'Dueño Test' },
      { email: 'gestor@testlocal.com',    password: 'FV_Gestor2025!',   rol: 'gestor',          nombre: 'Gestor Test' },
      { email: 'operador@testlocal.com',  password: 'FV_Operador2025!', rol: 'operador_noche',  nombre: 'Operador Noche' },
      { email: 'puerta@testlocal.com',    password: 'FV_Puerta2025!',   rol: 'puerta',          nombre: 'Puerta Test' },
    ]

    for (const acc of localAccounts) {
      const user = await crearAuthUser(acc.email, acc.password)
      if (!user) continue
      const { error } = await admin.from('usuario_local').upsert({
        usuario_id: user.id,
        local_id: localId,
        rol: acc.rol,
        email: acc.email,
        nombre: acc.nombre,
        activo: true,
      }, { onConflict: 'usuario_id,local_id' })
      if (error) errors.push(`Worker ${acc.email}: ${error.message}`)
      else log.push(`Worker creado: ${acc.email} (${acc.rol})`)
    }

    // ── 4. EVENTO DE TEST ────────────────────────────────────────────────────
    const { data: eventoExistente } = await admin
      .from('eventos').select('id').eq('local_id', localId).eq('nombre', 'Noche Test — Techno Friday').single()

    let eventoId: string | null = eventoExistente?.id ?? null

    if (!eventoExistente) {
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() + 1)
      fechaInicio.setHours(23, 0, 0, 0)
      const fechaFin = new Date(fechaInicio)
      fechaFin.setHours(fechaFin.getHours() + 7)

      const { data: ev, error: evErr } = await admin.from('eventos').insert({
        local_id: localId,
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
    const ahoraMs = Date.now()
    const aforoData = Array.from({ length: 24 }, (_, i) => ({
      local_id: localId!,
      porcentaje: Math.min(100, Math.max(5,
        Math.round(15 + Math.sin((i / 24) * Math.PI * 2 - 1) * 35 + Math.random() * 10)
      )),
      registrado_at: new Date(ahoraMs - (23 - i) * 60 * 60 * 1000).toISOString(),
    }))
    await admin.from('historial_aforo').insert(aforoData)
    log.push('Historial aforo insertado (24 puntos)')

    // ── 6. CONCURSO ACTIVO ───────────────────────────────────────────────────
    const { data: concursoExistente } = await admin
      .from('concursos').select('id').eq('local_id', localId).eq('estado', 'activo').single()

    if (!concursoExistente) {
      const { error: concErr } = await admin.from('concursos').insert({
        local_id: localId,
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
      .from('retos').select('id').eq('local_id', localId).eq('estado', 'activo').single()

    if (!retoExistente) {
      const { error: retoErr } = await admin.from('retos').insert({
        local_id: localId,
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

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok: errors.length === 0,
    log,
    errors,
    credenciales: {
      '── PANEL ADMIN (/admin/login) ──': {
        super_admin: 'superadmin@fourvenues.com  /  FV_SuperAdmin2025!',
        admin:       'admin@fourvenues.com       /  FV_Admin2025!',
        soporte:     'soporte@fourvenues.com     /  FV_Soporte2025!',
        totp_nota:   'Código TOTP: usa app autenticador con secret = JBSWY3DPEHPK3PXP',
        totp_url:    'otpauth://totp/Fourvenues%20Admin?secret=JBSWY3DPEHPK3PXP&issuer=Fourvenues',
      },
      '── PANEL LOCAL (/local-panel/login) ──': {
        dueno:          'dueno@testlocal.com      /  FV_Dueno2025!',
        gestor:         'gestor@testlocal.com     /  FV_Gestor2025!',
        operador_noche: 'operador@testlocal.com   /  FV_Operador2025!',
        puerta:         'puerta@testlocal.com     /  FV_Puerta2025!',
        local:          'Club Test Fourvenues (Madrid, tier Pro)',
      },
      '── PWA USUARIO (/login) ──': {
        nota: 'Login por SMS OTP — usa tu número real o configura un número de prueba en Supabase: Dashboard > Auth > Phone > Test phone numbers',
        supabase_test_number: '+34666000001  /  código: 123456',
      },
    },
  })
}
