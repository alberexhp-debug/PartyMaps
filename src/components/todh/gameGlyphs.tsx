import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Glifos propios de los juegos de serie — REDISEÑO 30-08 (decisión Albert #4).
// Mandato: que cada glifo SE ASEMEJE al logo real del juego para que el
// jugador lo identifique de un vistazo (evocar sin calcar: geometría propia,
// no un trazado del logo registrado).
// Lenguaje lucide exacto: viewBox 24, stroke currentColor, grosor 2, extremos
// y uniones redondeados. Máximo 3-4 paths por glifo, legibles a 12 px.
// Aquí va solo el CONTENIDO interno; GameIcon pone la carcasa <svg> (y ahí
// stroke = color del juego, que cae en currentColor si no se pasa).
// ─────────────────────────────────────────────────────────────────────────────

export const GAME_GLYPHS: Record<string, ReactNode> = {
  // Círculo cruzado por dos ejes DESCENTRADOS (arriba-izquierda), como la
  // cruz del emblema de Smash: cuatro cuadrantes desiguales.
  smash: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 3.35 V20.65 M3.35 9.6 H20.65" />
    </>
  ),
  // El óvalo del logo de Magic con la M en pico dentro (marco clásico M:tG).
  magic: (
    <>
      <ellipse cx="12" cy="12" rx="9.5" ry="6.5" />
      <path d="M8 15.2 V9.3 L12 13.2 L16 9.3 V15.2" />
    </>
  ),
  // Pokéball: esfera con banda ecuatorial interrumpida y botón central.
  pokemon: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H7.7 M16.3 12 H21" />
      <circle cx="12" cy="12" r="3.3" />
    </>
  ),
  // Casilla hexagonal del tablero de TFT con el peón del táctico dentro.
  tft: (
    <>
      <path d="M12 2.5 L20.23 7.25 V16.75 L12 21.5 L3.77 16.75 V7.25 Z" />
      <circle cx="12" cy="9.7" r="2.1" />
      <path d="M8.9 17 C8.9 14.2 10.3 13.1 12 13.1 C13.7 13.1 15.1 14.2 15.1 17 Z" />
    </>
  ),
  // Los dos rectángulos angulados en itálica del logotipo de TEKKEN.
  tekken: (
    <>
      <path d="M7 4 H11.5 L8 20 H3.5 Z" />
      <path d="M16 4 H20.5 L17 20 H12.5 Z" />
    </>
  ),
  // El «6» hexagonal y anguloso del logo de Street Fighter 6.
  sf6: (
    <>
      <path d="M16.5 4 H11 L7.5 11.9" />
      <path d="M12 9.3 L16.5 11.9 V17.1 L12 19.7 L7.5 17.1 V11.9 Z" />
    </>
  ),
  // La V angular partida del logo de VALORANT: brazo izquierdo entero con la
  // punta abajo y fragmento derecho truncado por el corte diagonal.
  valorant: (
    <>
      <path d="M3.5 5 L12.2 18.5 H8.2 L3.5 11.2 Z" />
      <path d="M20.5 5 L15 13.5 L12.6 9.8 L15.7 5 Z" />
    </>
  ),
  // La L angulosa con cortes en diagonal del icono moderno de LoL.
  lol: (
    <>
      <path d="M11.5 3.5 V16.5 H18.5 L16.5 20.5 H7.5 V7 Z" />
    </>
  ),
  // Mira militar: aro con 4 marcas que cruzan el borde y punto central
  // (la de smash es un círculo partido por ejes largos descentrados;
  // esta es simétrica, de marcas cortas — no se confunden).
  cod: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2.5 V7 M12 17 V21.5 M2.5 12 H7 M17 12 H21.5" />
      <path d="M12 11.9 V12.1" />
    </>
  ),
  // La C partida del logo de CS2 con el «2» anguloso dentro.
  cs: (
    <>
      <path d="M19 7.1 A8.5 8.5 0 1 0 19 16.9" />
      <path d="M9.5 9 H14 L9.5 15 H14.5" />
    </>
  ),
}
