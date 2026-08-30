import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Glifos de los 5 niveles de emblema de crew. Mismo lenguaje que gameGlyphs
// (viewBox 24, stroke currentColor, grosor 2, extremos/uniones redondeados).
// La silueta del ESCUDO es idéntica en los 5 niveles (identidad de crew);
// lo que crece con el nivel es el ornamento, siempre legible a 16 px:
//   1 bronce   → escudo solo.
//   2 plata    → escudo + estrella de 4 puntas dentro.
//   3 oro      → escudo + corona baja que nace del borde superior.
//   4 diamante → escudo + diamante central + alas cortas a los lados.
//   5 élite    → escudo + corona alta + destellos + gema central (máx. 4 paths).
// Aquí va solo el CONTENIDO interno; CrewEmblema pone la carcasa <svg>.
// ─────────────────────────────────────────────────────────────────────────────

// Escudo heráldico: borde superior recto (asiento para las coronas), flancos
// rectos y punta inferior. Deja aire arriba (y<6.5) para el ornamento.
const ESCUDO = 'M5.5 6.5 H18.5 V12.5 C18.5 17.1 15.6 19.8 12 21.5 C8.4 19.8 5.5 17.1 5.5 12.5 Z'

export const CREW_EMBLEM_GLYPHS: Record<1 | 2 | 3 | 4 | 5, ReactNode> = {
  // Nivel 1 — escudo desnudo.
  1: <path d={ESCUDO} />,

  // Nivel 2 — estrella/gema de 4 puntas en el centro del campo.
  2: (
    <>
      <path d={ESCUDO} />
      <path d="M12 10 L12.9 12.3 L15.2 13.2 L12.9 14.1 L12 16.4 L11.1 14.1 L8.8 13.2 L11.1 12.3 Z" />
    </>
  ),

  // Nivel 3 — corona baja de 3 puntas; su base es el propio borde del escudo
  // (sin línea doble: a 16 px no se emborrona).
  3: (
    <>
      <path d={ESCUDO} />
      <path d="M7.9 6.5 L7.6 3.1 L10.2 4.8 L12 2.6 L13.8 4.8 L16.4 3.1 L16.1 6.5" />
    </>
  ),

  // Nivel 4 — diamante central + dos alas cortas (dos plumas por lado) que
  // brotan de los flancos superiores.
  4: (
    <>
      <path d={ESCUDO} />
      <path d="M12 9.2 L15.4 13 L12 16.8 L8.6 13 Z" />
      <path d="M4.9 7.8 C3.1 8.1 2 9.3 1.7 11.1 M5 10.8 C3.9 11.1 3.2 11.9 3 13.2" />
      <path d="M19.1 7.8 C20.9 8.1 22 9.3 22.3 11.1 M19 10.8 C20.1 11.1 20.8 11.9 21 13.2" />
    </>
  ),

  // Nivel 5 — corona alta, dos destellos en cruz flanqueándola y gema central.
  5: (
    <>
      <path d={ESCUDO} />
      <path d="M7.7 6.5 L7.4 2 L10.1 3.9 L12 1.3 L13.9 3.9 L16.6 2 L16.3 6.5" />
      <path d="M3.1 1.6 V4.6 M1.6 3.1 H4.6 M20.9 1.6 V4.6 M19.4 3.1 H22.4" />
      <circle cx="12" cy="13.3" r="1.7" />
    </>
  ),
}
