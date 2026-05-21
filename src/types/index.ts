// =============================================
// TIPOS GLOBALES DE PARTYMAPS 2.0
// =============================================

// --- ENUMS ---

export type TierLocal = 'basico' | 'pro' | 'destacado'
export type EstadoLocal = 'pendiente_verificacion' | 'activo' | 'suspendido' | 'eliminado'
export type TipoLocal = 'discoteca' | 'bar_copas' | 'rooftop' | 'sala_conciertos' | 'bar_cocteleria' | 'otro'
export type TipoMusica = 'techno' | 'house' | 'reggaeton' | 'pop' | 'hip_hop' | 'indie' | 'electronica' | 'flamenco' | 'otro'
export type EstadoUsuario = 'activa' | 'suspendida_temporal' | 'suspendida_permanente' | 'eliminada'
export type SignoZodiaco = 'Aries' | 'Tauro' | 'Géminis' | 'Cáncer' | 'Leo' | 'Virgo' | 'Libra' | 'Escorpio' | 'Sagitario' | 'Capricornio' | 'Acuario' | 'Piscis'
export type RolLocal = 'dueno' | 'gestor' | 'operador_noche' | 'puerta'
export type RolAdmin = 'super_admin' | 'admin' | 'soporte'
export type EstadoConcurso = 'programado' | 'activo' | 'cerrado' | 'finalizado' | 'cancelado'
export type EstadoPlan = 'activo' | 'completado' | 'cancelado'
export type EstadoSolicitudPlan = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada'
export type EstadoEntrada = 'activa' | 'usada' | 'cancelada' | 'expirada'
export type TipoModulo = 'concurso' | 'perfil_noche' | 'retos'
export type EstadoEvento = 'borrador' | 'publicado' | 'cancelado' | 'finalizado'
export type CurvaPrecio = 'lineal' | 'tramos'

export interface TramoPrecio {
  pct: number
  precio: number
}

export interface PrecioDinamicoConfig {
  activo: boolean
  curva: CurvaPrecio
  tramos?: TramoPrecio[]
}

// --- ENTIDADES ---

export interface Usuario {
  id: string
  telefono?: string
  telefono_verificado: boolean
  nombre: string
  foto_perfil_url?: string
  fecha_nacimiento: string
  reputacion_puntuacion?: number
  reputacion_num_valoraciones: number
  estado_cuenta: EstadoUsuario
  prefs_notificaciones: PrefsNotificaciones
  auth_provider: 'ninguno' | 'google' | 'apple'
  created_at: string
  updated_at: string
}

export interface PrefsNotificaciones {
  eventos: boolean
  promos: boolean
  planes: boolean
  sistema: boolean
  patrocinadas: boolean
}

export interface Local {
  id: string
  nombre: string
  descripcion?: string
  tipo_local: TipoLocal
  musica: TipoMusica[]
  direccion: string
  ciudad: string
  latitud: number
  longitud: number
  radio_verificacion_metros: number
  aforo_maximo: number
  horario: HorarioLocal
  precio_entrada_min?: number
  precio_entrada_max?: number
  imagenes: string[]
  tier: TierLocal
  tier_fecha_inicio?: string
  tier_fecha_fin?: string
  cif?: string
  email_facturacion?: string
  stripe_account_id?: string
  modulos_activos: TipoModulo[]
  consumiciones_bienvenida: ConsumicionBienvenida[]
  num_suscriptores: number
  notificaciones_semana_count: number
  estado: EstadoLocal
  aforo_estimado_porcentaje?: number
  aforo_correccion_manual?: number
  aforo_correccion_manual_expires?: string
  precio_dinamico?: PrecioDinamicoConfig
  precio_promocional?: number
  promo_ultima_hora_hasta?: string
  created_at: string
  updated_at: string
}

export interface HorarioLocal {
  lunes?: { apertura: string; cierre: string } | null
  martes?: { apertura: string; cierre: string } | null
  miercoles?: { apertura: string; cierre: string } | null
  jueves?: { apertura: string; cierre: string } | null
  viernes?: { apertura: string; cierre: string } | null
  sabado?: { apertura: string; cierre: string } | null
  domingo?: { apertura: string; cierre: string } | null
}

export interface ConsumicionBienvenida {
  id: string
  nombre: string
  descripcion: string
  precio: number
}

export interface UsuarioLocal {
  id: string
  usuario_id: string
  local_id: string
  rol: RolLocal
  email: string
  nombre: string
  activo: boolean
  created_at: string
}

export interface Evento {
  id: string
  local_id: string
  nombre: string
  tematica?: string
  descripcion?: string
  imagen_url?: string
  fecha_inicio: string
  fecha_fin?: string
  aforo_maximo: number
  dress_code?: string
  precio_base: number
  precio_maximo?: number
  precio_early_bird?: number
  early_bird_hasta?: string
  early_bird_cupo?: number
  precio_dinamico?: PrecioDinamicoConfig
  estado: EstadoEvento
  entradas_vendidas: number
  modulos_activos: TipoModulo[]
  configuracion_modulos?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Entrada {
  id: string
  usuario_id: string
  local_id: string
  evento_id?: string
  precio_local: number
  comision_plataforma: number
  precio_total: number
  consumicion_id?: string
  consumicion_canjeada: boolean
  qr_code: string
  estado: EstadoEntrada
  usado_at?: string
  created_at: string
}

export interface Suscripcion {
  id: string
  usuario_id: string
  local_id: string
  silenciada: boolean
  created_at: string
}

export interface PlanPublico {
  id: string
  creador_id: string
  local_id: string
  hora_llegada: string
  total_personas: number
  huecos_disponibles: number
  descripcion?: string
  estado: EstadoPlan
  miembros_count: number
  created_at: string
  updated_at: string
  local?: Local
  creador?: Partial<Usuario>
}

export interface ParticipantePlan {
  id: string
  plan_id: string
  usuario_id: string
  estado: EstadoSolicitudPlan
  created_at: string
  usuario?: Partial<Usuario>
}

export interface MensajeChat {
  id: string
  plan_id: string
  usuario_id: string
  contenido: string
  created_at: string
  usuario?: Partial<Usuario>
}

export interface Review {
  id: string
  usuario_id: string
  local_id: string
  puntuacion: number
  comentario?: string
  utiles: number
  censurada: boolean
  motivo_censura?: string
  respuesta_local?: string
  created_at: string
  usuario?: Partial<Usuario>
}

export interface Sugerencia {
  id: string
  usuario_id: string
  local_id: string
  contenido: string
  estado: 'nueva' | 'leida' | 'respondida'
  nota_interna?: string
  created_at: string
}

export interface Checkin {
  id: string
  usuario_id: string
  local_id: string
  latitud: number
  longitud: number
  entrada_at: string
  salida_at?: string
}

export interface Concurso {
  id: string
  local_id: string
  evento_id?: string
  descripcion: string
  tipo_contenido: 'foto' | 'video' | 'ambos'
  fuente_contenido: 'directa' | 'instagram' | 'ambas'
  hora_apertura: string
  hora_cierre: string
  premio: string
  estado: EstadoConcurso
  ganador_participacion_id?: string
  created_at: string
}

export interface ParticipacionConcurso {
  id: string
  concurso_id: string
  usuario_id: string
  contenido_url?: string
  instagram_post_id?: string
  instagram_post_url?: string
  num_votos: number
  estado: 'pendiente_moderacion' | 'aprobada' | 'rechazada' | 'eliminada'
  created_at: string
  usuario?: Partial<Usuario>
}

export interface Reto {
  id: string
  local_id: string
  evento_id?: string
  nombre: string
  descripcion: string
  tipo_contenido: 'foto' | 'video' | 'texto'
  metodo_ganador: 'votos' | 'manual'
  premio?: string
  hora_cierre?: string
  estado: 'activo' | 'cerrado' | 'cancelado'
  ganador_participacion_id?: string
  created_at: string
}

export interface Administrador {
  id: string
  nombre: string
  email: string
  rol: RolAdmin
  activo: boolean
  totp_secret?: string
  created_at: string
  ultimo_acceso?: string
}

export interface ConfiguracionSistema {
  id: string
  clave: string
  valor: string
  descripcion?: string
  updated_at: string
  updated_by?: string
}

export interface NotificacionEnviada {
  id: string
  local_id: string
  titulo: string
  cuerpo: string
  enlace?: string
  num_destinatarios: number
  num_aperturas: number
  enviada_at: string
  tipo: 'manual' | 'automatica' | 'patrocinada'
}

// --- TIPOS UI ---

export type TemperaturaAforo = 'fria' | 'templada' | 'caliente'

export interface LocalConAforo extends Local {
  temperatura: TemperaturaAforo
  evento_activo?: Evento
  esta_suscrito?: boolean
}

export interface FiltrosMapa {
  tipos: TipoLocal[]
  musica: TipoMusica[]
  precio_min?: number
  precio_max?: number
  solo_con_evento: boolean
  solo_con_planes: boolean
}

export interface ResultadoEscaneoQR {
  tipo: 'entrada_ok' | 'entrada_usada' | 'entrada_fecha_incorrecta' | 'qr_invalido' | 'consumicion_ok' | 'consumicion_usada'
  entrada?: Entrada
  consumicion?: ConsumicionBienvenida
  mensaje: string
  timestamp?: string
}
