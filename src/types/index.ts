// =============================================
// TIPOS GLOBALES DE PARTYMAPS 2.0
// =============================================

// --- ENUMS ---

// 'basico' se mantiene por compatibilidad (legacy) — equivale a 'venta'.
// El modelo nuevo es: visibility (gratis, no vende) · venta (gratis, 4%) ·
// pro (49€/mes, 2.5%) · destacado (149€/mes, 1.5%).
export type TierLocal = 'visibility' | 'venta' | 'pro' | 'destacado' | 'basico'
export type EstadoLocal = 'pendiente_verificacion' | 'activo' | 'suspendido' | 'eliminado'
export type TipoLocal = 'discoteca' | 'bar_copas' | 'rooftop' | 'sala_conciertos' | 'bar_cocteleria' | 'otro'
export type TipoMusica = 'techno' | 'house' | 'reggaeton' | 'pop' | 'hip_hop' | 'indie' | 'electronica' | 'flamenco' | 'otro'
export type EstadoUsuario = 'activa' | 'suspendida_temporal' | 'suspendida_permanente' | 'eliminada'
export type SignoZodiaco = 'Aries' | 'Tauro' | 'Géminis' | 'Cáncer' | 'Leo' | 'Virgo' | 'Libra' | 'Escorpio' | 'Sagitario' | 'Capricornio' | 'Acuario' | 'Piscis'
export type RolLocal = 'dueno' | 'gestor' | 'puerta' | 'barman'

export type CategoriaProducto =
  | 'cerveza' | 'cubata' | 'copa' | 'cocktail' | 'chupito'
  | 'refresco' | 'agua' | 'comida' | 'snack' | 'pack' | 'otro'

export interface ProductoLocal {
  id: string
  local_id: string
  nombre: string
  descripcion?: string
  categoria: CategoriaProducto
  precio: number
  coste?: number
  imagen_url?: string
  disponible: boolean
  orden: number
  es_pack: boolean
  unidades_pack?: number
  created_at: string
  updated_at: string
}

export type EstadoPedidoBar = 'pagado' | 'entregado' | 'expirado' | 'cancelado'

export interface PedidoBar {
  id: string
  usuario_id: string
  local_id: string
  qr_code: string
  estado: EstadoPedidoBar
  precio_total: number
  comision_plataforma: number
  metodo_pago: string
  pagado_at: string
  expira_at: string
  entregado_at?: string
  entregado_por?: string
  cancelado_at?: string
  cancelado_motivo?: string
  notas?: string
  created_at: string
  updated_at: string
}

export interface PedidoBarItem {
  id: string
  pedido_id: string
  producto_id?: string
  nombre_snapshot: string
  precio_unitario: number
  cantidad: number
  created_at: string
}
export type RolAdmin = 'super_admin' | 'admin'
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

export type EstiloCarta = 'holo' | 'aurora' | 'oro' | 'noche' | 'rosa'

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
  carta_frase?: string
  carta_estilo?: EstiloCarta
  carta_publica?: boolean
  carta_slug?: string
  carta_apodo?: string
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
  videos_youtube?: string[]
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
  instagram_handle?: string
  entradas_disponibles_noche?: number
  aforo_por_dia?: AforoPorDia
  reservas_activas?: boolean
  reservas_modo?: ModoReservas
  created_at: string
  updated_at: string
}

/** Perfil semanal de ocupación (%) que ve el usuario. 0-100 por día; ausente = sin preajuste. */
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
export type AforoPorDia = Partial<Record<DiaSemana, number>>

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

// ── Mesas, plantas y reservas (reservados) ──────────────────────────
export type ModoReservas = 'solicitud' | 'instantanea'
export type TipoMesa = 'mesa' | 'reservado' | 'barra' | 'otro'
export type FormaMesa = 'redonda' | 'cuadrada' | 'rect'
export type EstadoReserva =
  | 'solicitada' | 'confirmada' | 'rechazada' | 'sentada' | 'cancelada' | 'no_show'

export interface Planta {
  id: string
  local_id: string
  nombre: string
  orden: number
  created_at: string
  updated_at: string
}

/** pos_x/pos_y y ancho/alto son fracciones (0..1) del lienzo de la planta. */
export interface Mesa {
  id: string
  local_id: string
  planta_id: string
  codigo: string
  capacidad: number
  tipo: TipoMesa
  forma: FormaMesa
  pos_x: number
  pos_y: number
  ancho: number
  alto: number
  zona?: string | null
  reservable: boolean
  activa: boolean
  created_at: string
  updated_at: string
}

export interface Reserva {
  id: string
  local_id: string
  mesa_id: string
  evento_id?: string | null
  usuario_id?: string | null
  nombre_contacto: string
  telefono?: string | null
  personas: number
  fecha_noche: string
  estado: EstadoReserva
  modo: ModoReservas
  importe?: number | null
  pagada: boolean
  notas?: string | null
  confirmada_at?: string | null
  confirmada_por?: string | null
  created_at: string
  updated_at: string
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

// =============================================
// MÓDULO RRPP + CRM 3 niveles (migración 019)
// =============================================

/**
 * Contacto = CRM de Rumbo. Identidad de 3 niveles:
 *   - visitor  → anónimo, no aparece aquí
 *   - lead     → contacto con email o teléfono, sin cuenta (user_id NULL)
 *   - usuario  → contacto promocionado, user_id rellenado
 * Toda atribución (entrada, pedido bar, binding RRPP, lista, perk) viaja
 * sobre `contacto_id`. Cuando un lead se registra como usuario, su
 * historial sigue vinculado sin migrar nada.
 */
export type FuenteContacto =
  | 'checkout_entrada' | 'checkout_bar' | 'lista_rrpp'
  | 'invitacion_sms' | 'invitacion_whatsapp'
  | 'qr_rrpp' | 'registro_directo' | 'admin' | 'desconocido'

export interface Contacto {
  id: string
  email?: string | null
  telefono?: string | null
  nombre?: string | null
  user_id?: string | null
  primer_rrpp_id?: string | null
  primer_local_id?: string | null
  primer_contacto_en: string
  ultimo_contacto_en: string
  fuente_origen: FuenteContacto
  consentimiento_marketing: boolean
  consentimiento_actualizado_en?: string | null
  bloqueado: boolean
  motivo_bloqueo?: string | null
  created_at: string
  updated_at: string
}

/**
 * RRPP = rol opcional sobre un usuario Rumbo. Cualquier usuario
 * activa el modo y obtiene panel multi-venue + página pública /r/[slug]
 * + followers. La identidad y carta de perfil son los del usuario.
 */
export interface RRPP {
  id: string
  usuario_id: string
  slug: string
  nombre_publico: string
  foto_url?: string | null
  bio?: string | null
  instagram?: string | null
  tiktok?: string | null
  activo: boolean
  terminos_aceptados_en: string
  edad_declarada_18: boolean
  created_at: string
  updated_at: string
}

/**
 * Relación RRPP ↔ Local con la comisión pactada. MVP usa comisión global
 * por venue (% sobre bruto, con tope opcional). triggers_activos y
 * reglas_atribucion quedan abiertos en JSON para evolución sin migrar.
 */
export type EstadoRRPPVenue = 'pendiente' | 'activa' | 'pausada' | 'archivada'
export type IniciadoPor = 'rrpp' | 'venue'

export interface TriggersActivos {
  entrada_vendida: boolean
  escaneada_en_puerta: boolean
  consumo_bar: boolean
  /** Reservado para v2 */
  consumo_reservado?: boolean
}

export interface ReglasAtribucion {
  modelo: 'last_click' | 'first_click'
  ventana_dias: number
}

export interface RRPPVenue {
  id: string
  rrpp_id: string
  local_id: string
  estado: EstadoRRPPVenue
  iniciado_por: IniciadoPor
  comision_pct: number
  tope_por_venta?: number | null
  triggers_activos: TriggersActivos
  reglas_atribucion: ReglasAtribucion
  created_at: string
  updated_at: string
}

/**
 * Link de venta del RRPP. Si evento_id es NULL, es link general del RRPP
 * en ese local (`partymaps.com/r/leo` para Pacha). Con evento_id, es
 * específico (`/e/X?r=leo`). codigo_manual permite `?r=leo10` legible.
 */
export interface LinkRRPP {
  id: string
  rrpp_id: string
  local_id: string
  evento_id?: string | null
  token: string
  codigo_manual?: string | null
  activo: boolean
  clicks: number
  created_at: string
}

/**
 * Binding = la pieza que dice "este contacto, esta noche, es de Leo".
 * Independiente de si hubo venta de entrada. Nace `pendiente` y se
 * activa con un evento físico (puerta, barra, compra), o expira sin
 * pagar comisión. First-binding-wins durante la ventana.
 */
export type EstadoBinding = 'pendiente' | 'activo' | 'expirado' | 'cancelado'
export type MecanismoCreacionBinding =
  | 'link_compra' | 'lista_rrpp' | 'qr_rrpp'
  | 'declaracion_bar' | 'pre_binding' | 'venta_taquilla' | 'admin'
export type MecanismoActivacionBinding =
  | 'compra_entrada' | 'puerta_scan' | 'barra_pedido'
  | 'venta_taquilla' | 'auto_link' | 'admin'

export interface BindingRRPP {
  id: string
  contacto_id: string
  rrpp_id: string
  local_id: string
  evento_id?: string | null
  estado: EstadoBinding
  mecanismo_creacion: MecanismoCreacionBinding
  mecanismo_activacion?: MecanismoActivacionBinding | null
  link_id?: string | null
  created_at: string
  activado_at?: string | null
  expira_at: string
  cancelado_at?: string | null
  cancelado_motivo?: string | null
}

/**
 * Lista de invitados del RRPP para un evento concreto. Puede ser gratis
 * o con precio (entrada incluida). Tipo abierta/cerrada.
 */
export type TipoLista = 'cerrada' | 'abierta'

export interface ListaRRPP {
  id: string
  rrpp_id: string
  local_id: string
  evento_id: string
  nombre: string
  tipo: TipoLista
  cupo_max?: number | null
  precio: number
  hora_limite?: string | null
  activa: boolean
  created_at: string
  updated_at: string
}

export type EstadoListaItem =
  | 'invitado' | 'confirmado' | 'entrado' | 'no_show' | 'cancelado'

export interface ListaRRPPItem {
  id: string
  lista_id: string
  contacto_id: string
  token: string
  estado: EstadoListaItem
  invitacion_enviada_en?: string | null
  confirmado_en?: string | null
  entrado_en?: string | null
  entrado_por?: string | null
  notas?: string | null
  created_at: string
}

/**
 * Perks emitidos por el venue al RRPP, asignados a un contacto concreto.
 * Cada uno con QR `PMR:<token>` que se canjea en puerta o barra.
 */
export type TipoPerk =
  | 'paso_libre' | 'canje_copas' | 'descuento_pct' | 'acceso_vip' | 'merch'
export type EstadoPerk =
  | 'emitido' | 'asignado' | 'canjeado' | 'expirado' | 'revocado'

export interface PerkRRPP {
  id: string
  rrpp_id: string
  local_id: string
  contacto_id?: string | null
  tipo: TipoPerk
  cantidad: number
  descripcion?: string | null
  token: string
  estado: EstadoPerk
  expira_at: string
  asignado_at?: string | null
  canjeado_at?: string | null
  canjeado_por?: string | null
  created_at: string
}

/** Follower de un RRPP (solo usuarios registrados, no leads). */
export interface RRPPSeguidor {
  rrpp_id: string
  usuario_id: string
  seguido_en: string
  silenciado: boolean
}

/**
 * Liquidación mensual por par RRPP↔venue. Rumbo NO toca dinero —
 * solo refleja qué le debe el venue al RRPP. El venue marca como pagado,
 * el RRPP confirma. A 14 días sin confirmar, tácitamente confirmado.
 */
export type EstadoLiquidacion =
  | 'pendiente' | 'marcado_pagado' | 'confirmado' | 'disputado'

export interface LiquidacionRRPP {
  id: string
  rrpp_id: string
  local_id: string
  periodo: string  // 'YYYY-MM'
  monto_total: number
  num_ventas: number
  estado: EstadoLiquidacion
  marcado_pagado_at?: string | null
  marcado_pagado_por?: string | null
  marcado_pagado_nota?: string | null
  confirmado_at?: string | null
  disputado_at?: string | null
  disputa_nota?: string | null
  created_at: string
  updated_at: string
}

export type TriggerLiquidacionItem =
  | 'entrada_vendida' | 'escaneada_en_puerta' | 'consumo_bar' | 'manual'

export interface LiquidacionRRPPItem {
  id: string
  liquidacion_id: string
  trigger_tipo: TriggerLiquidacionItem
  entrada_id?: string | null
  pedido_bar_id?: string | null
  monto_base: number
  comision_pct: number
  monto_comision: number
  notas?: string | null
  created_at: string
}
