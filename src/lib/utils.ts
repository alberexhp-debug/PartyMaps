import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PrecioDinamicoConfig, TemperaturaAforo, TipoLocal, TipoMusica } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

export function getTemperaturaAforo(porcentaje: number): TemperaturaAforo {
  if (porcentaje <= 40) return 'fria'
  if (porcentaje <= 70) return 'templada'
  return 'caliente'
}

/** Claves de día de la semana en el orden de Date.getDay() (0=domingo). */
export const DIAS_SEMANA_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

/** Clave del día de hoy (o de una fecha dada) para indexar perfiles semanales. */
export function diaSemanaKey(fecha: Date = new Date()): typeof DIAS_SEMANA_KEYS[number] {
  return DIAS_SEMANA_KEYS[fecha.getDay()]
}

/**
 * Ocupación (%) que ve el usuario, resuelta por prioridad:
 *   1) corrección manual en vivo no expirada (el operador la tocó esta noche)
 *   2) perfil semanal del dueño para el día actual (aforo_por_dia)
 *   3) estimación almacenada
 */
export function aforoVisible(local: {
  aforo_correccion_manual?: number
  aforo_correccion_manual_expires?: string
  aforo_por_dia?: Partial<Record<string, number>>
  aforo_estimado_porcentaje?: number
}): number {
  if (
    local.aforo_correccion_manual != null &&
    local.aforo_correccion_manual_expires &&
    new Date(local.aforo_correccion_manual_expires) > new Date()
  ) {
    return local.aforo_correccion_manual
  }
  const delDia = local.aforo_por_dia?.[diaSemanaKey()]
  if (delDia != null) return delDia
  return local.aforo_estimado_porcentaje ?? 0
}

export function getColorTemperatura(temp: TemperaturaAforo): string {
  if (temp === 'fria') return '#4F8EF7'
  if (temp === 'templada') return '#F39C12'
  return '#E94560'
}

export function getLabelTemperatura(temp: TemperaturaAforo): string {
  if (temp === 'fria') return 'Tranquilo'
  if (temp === 'templada') return 'Animado'
  return 'Lleno'
}

export function getDescripcionTemperatura(temp: TemperaturaAforo, porcentaje: number): string {
  if (temp === 'fria') return `Tranquilo (estimamos menos del 40% de capacidad)`
  if (temp === 'templada') return `Animado (40-70% de capacidad)`
  return `Lleno o casi lleno (más del 70% de capacidad)`
}

export function getLabelTipoLocal(tipo: TipoLocal): string {
  const labels: Record<TipoLocal, string> = {
    discoteca: 'Discoteca',
    bar_copas: 'Bar de copas',
    rooftop: 'Rooftop',
    sala_conciertos: 'Sala de conciertos',
    bar_cocteleria: 'Bar de coctelería',
    otro: 'Local',
  }
  return labels[tipo]
}

export function getLabelMusica(genero: TipoMusica | string): string {
  const labels: Record<TipoMusica, string> = {
    techno: 'Techno', house: 'House', reggaeton: 'Reggaetón', pop: 'Pop',
    hip_hop: 'Hip-hop', indie: 'Indie', electronica: 'Electrónica',
    flamenco: 'Flamenco', otro: 'Variada',
  }
  return labels[genero as TipoMusica] ?? genero
}

export function formatearPrecio(precio: number): string {
  return `${precio.toFixed(2).replace('.', ',')}€`
}

export function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatearHora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function tiempoRelativo(fecha: string): string {
  const ahora = new Date()
  const then = new Date(fecha)
  const diff = ahora.getTime() - then.getTime()
  const minutos = Math.floor(diff / 60000)
  const horas = Math.floor(minutos / 60)
  const dias = Math.floor(horas / 24)
  if (minutos < 1) return 'Ahora mismo'
  if (minutos < 60) return `Hace ${minutos}m`
  if (horas < 24) return `Hace ${horas}h`
  if (dias < 7) return `Hace ${dias}d`
  return formatearFecha(fecha)
}

export function generarQRData(entradaId: string): string {
  return `PM2:${entradaId}:${Date.now()}`
}

export function generarCodigoInvitacion(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Modelo de tiers mixto (suscripción + comisión).
// Cada tier tiene su % de comisión sobre cada venta (entrada o pedido de bar).
// La comisión se SUMA al precio que paga el usuario, no se descuenta del local.
//
//   visibility:  0%   (no vende; solo aparece en mapa)
//   venta:       4.0% (gratis mensual, ideal para empezar)
//   basico:      4.0% (alias legacy de 'venta')
//   pro:         2.5% (49€/mes — break-even ~3.300€/mes en ventas)
//   destacado:   1.5% (149€/mes — break-even ~10.000€/mes)
//
// Tope absoluto: 3€ por transacción. Una entrada de 100€ no paga 4€ de comisión.
export const COMISION_POR_TIER: Record<'visibility' | 'venta' | 'basico' | 'pro' | 'destacado', number> = {
  visibility: 0,
  venta: 4.0,
  basico: 4.0,
  pro: 2.5,
  destacado: 1.5,
}

export const COMISION_MAX_POR_TRANSACCION = 3.0

// Compat con código existente que esperaba un porcentaje plano. Devuelve el
// valor "venta" como referencia para la UI cuando no hay tier disponible.
export const COMISION_PORCENTAJE = COMISION_POR_TIER.venta

export function calcularComision(precioLocal: number, tier?: string): number {
  if (precioLocal <= 0) return 0
  const t = (tier ?? 'venta') as keyof typeof COMISION_POR_TIER
  const pct = COMISION_POR_TIER[t] ?? COMISION_POR_TIER.venta
  if (pct === 0) return 0
  const bruta = precioLocal * (pct / 100)
  const final = Math.min(bruta, COMISION_MAX_POR_TRANSACCION)
  return Math.round(final * 100) / 100
}

export function porcentajeComisionTier(tier?: string): number {
  const t = (tier ?? 'venta') as keyof typeof COMISION_POR_TIER
  return COMISION_POR_TIER[t] ?? COMISION_POR_TIER.venta
}

// Precio dinámico (Doc4 §6.2). Devuelve precio actual y, si la curva es por
// tramos, también el próximo cambio para mostrarlo al usuario en la app.
export function calcularPrecioDinamico(
  precioMin: number,
  precioMax: number | null | undefined,
  config: PrecioDinamicoConfig | null | undefined,
  pctVendido: number,
): { precio: number; siguiente?: { pct: number; precio: number } } {
  if (!config?.activo || precioMax == null || precioMax <= precioMin) {
    return { precio: precioMin }
  }
  const pct = Math.max(0, Math.min(100, pctVendido))
  if (config.curva === 'lineal') {
    const precio = precioMin + (precioMax - precioMin) * (pct / 100)
    return { precio: Math.round(precio * 100) / 100 }
  }
  const tramos = (config.tramos ?? []).slice().sort((a, b) => a.pct - b.pct)
  if (tramos.length === 0) return { precio: precioMin }
  let precio = precioMin
  let siguiente: { pct: number; precio: number } | undefined
  for (const t of tramos) {
    if (pct >= t.pct) precio = t.precio
    else { siguiente = { pct: t.pct, precio: t.precio }; break }
  }
  return { precio, siguiente }
}

export function truncarTexto(texto: string, maxChars: number): string {
  if (texto.length <= maxChars) return texto
  return texto.substring(0, maxChars).trimEnd() + '…'
}

// Filtro de palabras prohibidas para retos de texto (Doc6 §4.4).
// Lista por defecto extensible desde configuracion_sistema.palabras_prohibidas (CSV).
const PALABRAS_PROHIBIDAS_DEFAULT = [
  'puta', 'gilipollas', 'cabron', 'cabrón', 'maricon', 'maricón', 'mierda',
  'follar', 'pollazo', 'nazi', 'racista', 'violar',
]

export function contienePalabraProhibida(texto: string, extras: string[] = []): string | null {
  const normalizado = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const p of [...PALABRAS_PROHIBIDAS_DEFAULT, ...extras]) {
    const palabra = p.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (!palabra) continue
    const regex = new RegExp(`\\b${palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (regex.test(normalizado)) return p
  }
  return null
}

export function validarTelefono(telefono: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(telefono.replace(/\s/g, ''))
}

/** Extrae el ID de un vídeo de YouTube de cualquier formato de URL. Null si no es válido. */
export function youtubeId(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

export function normalizarTelefono(telefono: string, prefijo: string = '+34'): string {
  const limpio = telefono.replace(/\s/g, '')
  if (limpio.startsWith('+')) return limpio
  return `${prefijo}${limpio}`
}

const REGEX_TELEFONO = /(?:(?:\+?\d{1,3}[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{2,4}[\s\-.]?\d{2,4}[\s\-.]?\d{0,4})/g
const REGEX_EMAIL = /[a-zA-Z0-9._%+\-]+\s?[@(arroba)]\s?[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi
const REGEX_INSTAGRAM = /(?:@|insta(?:gram)?[:\s]*@?)([a-zA-Z0-9._]{2,30})/gi

export function detectarContactoEnTexto(texto: string): { tieneContacto: boolean; tipo?: string } {
  const limpio = texto.replace(/\s+/g, ' ')
  const sospechosoDigitos = /(\d[\s\-.]?){7,}/.test(limpio)
  if (sospechosoDigitos) return { tieneContacto: true, tipo: 'teléfono' }
  if (REGEX_TELEFONO.test(limpio) && limpio.replace(/\D/g, '').length >= 7) {
    return { tieneContacto: true, tipo: 'teléfono' }
  }
  if (REGEX_EMAIL.test(limpio)) return { tieneContacto: true, tipo: 'email' }
  const matchInsta = limpio.match(REGEX_INSTAGRAM)
  if (matchInsta && matchInsta.length > 0) return { tieneContacto: true, tipo: 'usuario externo' }
  return { tieneContacto: false }
}

export function calcularDistanciaMetros(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function puedeCrearPlan(usuario: { reputacion_puntuacion?: number; reputacion_num_valoraciones: number; estado_cuenta: string }): { puede: boolean; motivo?: string } {
  if (usuario.estado_cuenta !== 'activa') {
    return { puede: false, motivo: 'Tu cuenta no está activa. Contacta con soporte.' }
  }
  if (
    usuario.reputacion_num_valoraciones > 5 &&
    typeof usuario.reputacion_puntuacion === 'number' &&
    usuario.reputacion_puntuacion < 2.0
  ) {
    return { puede: false, motivo: 'Tu reputación actual no permite crear planes. Únete a otros para subirla.' }
  }
  return { puede: true }
}
