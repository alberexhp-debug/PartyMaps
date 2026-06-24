// Guías por página del panel de local (la "misma guía" del dashboard, extendida).
// Cada zona del panel tiene una secuencia de globos explicativos que dicen qué
// rellenar y qué se puede hacer en esa pantalla. Los pasos van con sel:'' a
// propósito → el Tour los muestra CENTRADOS (no anclados a un elemento), así la
// guía funciona en cualquier página sin tener que marcar el DOM de cada una.
//
// Se consume desde components/onboarding/GuiaPanel.tsx, que se monta una sola vez
// en el layout del panel y elige la guía según la ruta actual.
//
// Nota: 'dashboard' NO está aquí a propósito: ya tiene su propio tour anclado
// (TOUR_DASHBOARD) con su lógica de "primera vez" vía /api/onboarding.

import type { PasoTour } from '@/components/onboarding/Tour'

/** Clave = primer segmento de la ruta (/local-panel/<zona>), igual que en el layout. */
export const GUIAS_PANEL: Record<string, PasoTour[]> = {
  'configuracion': [
    { sel: '', texto: 'Esta es la ficha de tu local: lo que ve la gente en el mapa. Rellena cada pestaña de arriba.' },
    { sel: '', texto: 'En «Información» pon nombre, dirección, tipo y música. En «Horario», cuándo abres (así sales como «abierto»).' },
    { sel: '', texto: 'Sube fotos en «Galería» y define tu «Aforo por día» para controlar el lleno en vivo.' },
    { sel: '', texto: 'En «Barra» creas la carta para que tus clientes pidan desde el móvil.' },
  ],
  'mi-local': [
    { sel: '', texto: 'Aquí ves tu local tal y como lo verá un usuario en la app. Úsalo para revisar que todo se ve bien antes de publicar.' },
  ],
  'eventos': [
    { sel: '', texto: 'Aquí creas y publicas tus eventos: cartel, fecha, precio y aforo.' },
    { sel: '', texto: 'Un evento publicado es tu escaparate de la semana y es lo que te permite vender entradas.' },
  ],
  'productos': [
    { sel: '', texto: 'Esta es la carta de tu barra. Añade cada producto con su precio.' },
    { sel: '', texto: 'Con la carta activa, tus clientes piden desde el móvil y tú cobras sin colas.' },
  ],
  'sala': [
    { sel: '', texto: 'Diseña el plano de tu sala: coloca mesas y reservados.' },
    { sel: '', texto: 'Con el plano listo puedes aceptar reservas de mesa desde la app.' },
  ],
  'equipo': [
    { sel: '', texto: 'Aquí das de alta a tu equipo y le asignas su rol.' },
    { sel: '', texto: 'Cada rol ve solo su pantalla: el portero el scanner, el barman la cola de la barra.' },
  ],
  'rrpp': [
    { sel: '', texto: 'Gestiona a tus RRPP y sus comisiones.' },
    { sel: '', texto: 'Los RRPP te traen gente; aquí ves lo que generan y lo que les pagas, con todo claro.' },
  ],
  'taquilla': [
    { sel: '', texto: 'Vende entradas en la puerta: elige cantidad y precio.' },
    { sel: '', texto: 'El dinero lo cobras tú en mano. Pulsa «Cobrar y generar entrada» y se crea el QR al momento.' },
  ],
  'scanner': [
    { sel: '', texto: 'Controla la puerta: escanea los QR de las entradas para validarlas.' },
    { sel: '', texto: 'Aquí también ves la afluencia y el aforo en vivo de la noche.' },
  ],
  'pedidos-bar': [
    { sel: '', texto: 'Esta es la cola de la barra: los pedidos entran en tiempo real.' },
    { sel: '', texto: 'Marca cada pedido como preparado o entregado a medida que los sirves.' },
  ],
  'cortesias': [
    { sel: '', texto: 'Genera cortesías e invitaciones para tus invitados.' },
    { sel: '', texto: 'Se canjean con su QR igual que una entrada normal.' },
  ],
  'mensajes': [
    { sel: '', texto: 'Aquí hablas con tus clientes y con tus RRPP, todo en un mismo sitio.' },
  ],
  'notificaciones': [
    { sel: '', texto: 'Envía avisos push a tus suscriptores: un evento nuevo, una promo de última hora…' },
    { sel: '', texto: 'Ojo a tu límite semanal de envíos según tu tier.' },
  ],
  'crm': [
    { sel: '', texto: 'Tu base de clientes: quién viene, cuánto gasta y con qué frecuencia.' },
    { sel: '', texto: 'Úsalo para segmentar y fidelizar a tus mejores clientes.' },
  ],
  'analytics': [
    { sel: '', texto: 'Tus métricas: ingresos, entradas, afluencia y tendencias de tu local.' },
  ],
  'reviews': [
    { sel: '', texto: 'Las reseñas de tus clientes. Respóndelas y cuida tu reputación.' },
  ],
  'sugerencias': [
    { sel: '', texto: 'Aquí llegan las sugerencias y peticiones de los usuarios sobre tu local.' },
  ],
  'facturacion': [
    { sel: '', texto: 'Aquí ves tu tier, lo que pagas y la calculadora de comisiones: sin sorpresas.' },
  ],
  'puesta-a-punto': [
    { sel: '', texto: 'Tu checklist para dejar el local listo. Completa los pasos obligatorios para salir bien en el mapa.' },
  ],
  'soporte': [
    { sel: '', texto: '¿Dudas o algún problema? Desde aquí contactas con el soporte de TODH.' },
  ],
}
