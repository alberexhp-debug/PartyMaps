/**
 * Helpers de confeti — usa canvas-confetti con la paleta de Tourneum.
 * Lazy-load para no incluir en el bundle inicial.
 */
const COLORES_PM = ['#B6FF3A', '#A6EE2B', '#7C5CFF', '#4F8EF7', '#FBE08F']

export async function dispararConfetiCompra() {
  if (typeof window === 'undefined') return
  const confetti = (await import('canvas-confetti')).default

  // Ráfaga principal desde el centro inferior
  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.7 },
    colors: COLORES_PM,
    ticks: 220,
    scalar: 1.1,
  })

  // Ráfaga lateral izquierda
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: COLORES_PM,
    })
  }, 250)

  // Ráfaga lateral derecha
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: COLORES_PM,
    })
  }, 400)
}

/**
 * Ráfaga sutil para acciones positivas (suscribirse, valorar, etc.)
 */
export async function dispararConfetiSuave(x = 0.5, y = 0.6) {
  if (typeof window === 'undefined') return
  const confetti = (await import('canvas-confetti')).default
  confetti({
    particleCount: 30,
    spread: 50,
    startVelocity: 25,
    origin: { x, y },
    colors: COLORES_PM,
    ticks: 150,
    scalar: 0.85,
  })
}
