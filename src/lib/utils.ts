import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PrecioDinamicoConfig, SignoZodiaco, TemperaturaAforo, TipoLocal } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcularSignoZodiaco(fechaNacimiento: string): SignoZodiaco {
  const fecha = new Date(fechaNacimiento)
  const mes = fecha.getMonth() + 1
  const dia = fecha.getDate()
  if ((mes === 3 && dia >= 21) || (mes === 4 && dia <= 19)) return 'Aries'
  if ((mes === 4 && dia >= 20) || (mes === 5 && dia <= 20)) return 'Tauro'
  if ((mes === 5 && dia >= 21) || (mes === 6 && dia <= 20)) return 'Géminis'
  if ((mes === 6 && dia >= 21) || (mes === 7 && dia <= 22)) return 'Cáncer'
  if ((mes === 7 && dia >= 23) || (mes === 8 && dia <= 22)) return 'Leo'
  if ((mes === 8 && dia >= 23) || (mes === 9 && dia <= 22)) return 'Virgo'
  if ((mes === 9 && dia >= 23) || (mes === 10 && dia <= 22)) return 'Libra'
  if ((mes === 10 && dia >= 23) || (mes === 11 && dia <= 21)) return 'Escorpio'
  if ((mes === 11 && dia >= 22) || (mes === 12 && dia <= 21)) return 'Sagitario'
  if ((mes === 12 && dia >= 22) || (mes === 1 && dia <= 19)) return 'Capricornio'
  if ((mes === 1 && dia >= 20) || (mes === 2 && dia <= 18)) return 'Acuario'
  return 'Piscis'
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

// Comisión PartyMaps: 8% sobre el precio que pone el dueño. Se SUMA al precio
// que paga el usuario, no se descuenta del local. Si en algún momento queremos
// diferenciar por tier, este es el único punto a tocar.
export const COMISION_PORCENTAJE = 8

export function calcularComision(precioLocal: number, _tier?: 'basico' | 'pro' | 'destacado'): number {
  return Math.round(precioLocal * (COMISION_PORCENTAJE / 100) * 100) / 100
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

export function normalizarTelefono(telefono: string, prefijo: string = '+34'): string {
  const limpio = telefono.replace(/\s/g, '')
  if (limpio.startsWith('+')) return limpio
  return `${prefijo}${limpio}`
}

export const FRASES_ZODIACO: Record<SignoZodiaco, string[]> = {
  Aries: ['Esta noche vas a arrasar.', 'Tu energía lo cambia todo.', 'Hoy lideras sin dudarlo.', 'Nadie puede con tu fuerza esta noche.', 'Aries en la pista: peligro.'],
  Tauro: ['Esta noche, todo lo bueno es tuyo.', 'Tu presencia vale oro.', 'Disfruta. Te lo mereces.', 'Hoy nada te detiene.', 'Tu momento ha llegado.'],
  'Géminis': ['Tu energía lo llena todo.', 'Esta noche eres dos veces más.', 'Brillas en cada conversación.', 'El ambiente te sigue a ti.', 'Hoy, todos quieren conocerte.'],
  'Cáncer': ['Hoy conectas de verdad.', 'Tu intuición te lleva al sitio correcto.', 'Esta noche algo especial te espera.', 'Corazón abierto, noche perfecta.', 'Hoy creas recuerdos.'],
  Leo: ['Esta noche el foco es tuyo.', 'Nadie brilla como tú.', 'El rey/la reina ha llegado.', 'Hoy todos te miran.', 'Tu noche, tus reglas.'],
  Virgo: ['Hoy todo encaja perfectamente.', 'Tu elegancia habla por ti.', 'Esta noche das en el clavo.', 'Perfección en cada movimiento.', 'Lo tuyo es clase pura.'],
  Libra: ['Esta noche el equilibrio es tuyo.', 'Armonía total. Disfruta.', 'Hoy encantas sin esfuerzo.', 'Tu presencia equilibra la sala.', 'Belleza y carisma, combo ganador.'],
  Escorpio: ['Esta noche vas a dejar huella.', 'Tu intensidad lo transforma todo.', 'Hoy nadie te olvida.', 'El misterio te hace irresistible.', 'Esta noche, pura magia oscura.'],
  Sagitario: ['Hoy la aventura comienza aquí.', 'Tu energía contagia a todos.', 'Esta noche, sin límites.', 'El mundo es pequeño para ti.', 'Hoy disparas flechas de fuego.'],
  Capricornio: ['Esta noche, clase absoluta.', 'Todo con intención, todo con estilo.', 'Tu determinación se nota.', 'Hoy construyes momentos únicos.', 'Ambición y estilo: tu combo.'],
  Acuario: ['Hoy eres el más único de la sala.', 'Tu originalidad marca tendencia.', 'Esta noche el futuro eres tú.', 'Nadie piensa como tú lo hace.', 'Rompe los esquemas esta noche.'],
  Piscis: ['Hoy sueñas despierto/a.', 'Tu sensibilidad es tu superpoder.', 'Esta noche el universo está contigo.', 'Magia pura en cada paso.', 'Hoy fluyes sin resistencia.'],
}

export function getFraseZodiaco(signo: SignoZodiaco, fecha: string): string {
  const frases = FRASES_ZODIACO[signo]
  const dia = new Date(fecha).getDate()
  return frases[dia % frases.length]
}

export const EMOJI_SIGNO: Record<SignoZodiaco, string> = {
  Aries: '♈', Tauro: '♉', 'Géminis': '♊', 'Cáncer': '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Escorpio: '♏',
  Sagitario: '♐', Capricornio: '♑', Acuario: '♒', Piscis: '♓',
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
