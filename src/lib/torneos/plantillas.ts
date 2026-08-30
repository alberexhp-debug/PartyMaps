// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLAS DE JUEGO (sesión 21-ago): cada juego se gestiona distinto — un
// torneo de FIFA no es un torneo de Magic. En vez de programar cada juego a
// mano, el admin lo da de alta eligiendo un ARQUETIPO de competición (preset)
// y ajustando lo que haga falta. La plantilla resultante le dice al resto de
// la app cómo tratar ese juego:
//   · qué formatos de torneo sugerir al TO (crear-torneo)
//   · a cuántos sets se juega por defecto (bestOf)
//   · cómo se reporta un resultado (sets ganados / puntos por lobby / posición)
//   · cuánta gente juega a la vez (1v1, equipos de 5, lobbies de 8, mesas de 4)
//   · qué setups necesita en la sede (consola, PC, mesa, arcade)
//   · si puede jugarse online
//   · cómo se llama el "main" en ese juego (Main / Deck / Agente / Club…)
// Sin imports de sample.ts (sample importa este tipo → evitar ciclo runtime).
// ─────────────────────────────────────────────────────────────────────────────

export type ModoJuego = '1v1' | 'equipos' | 'lobbies' | 'mesas'
export type ReporteJuego = 'sets' | 'puntos' | 'posicion'
export type SetupJuego = 'consola' | 'pc' | 'mesa' | 'arcade'

// ── Scouting v1 (30-08): cómo se estudia a un rival de este juego ──
// 'individual' → se estudia al jugador; 'equipo' → a la CREW (cod/cs/lol/valorant).
// Los módulos son las tarjetas que aplican en la vista de scouting: lucha lleva
// mains+clutch+h2h+vods; TCG arquetipos y consistencia (sin decklist: nota en la
// vista); TFT comps; equipos el scouting de crew. Solo datos medibles (spec).
export type ScoutingTipo = 'individual' | 'equipo'
export type ModuloScouting = 'mains' | 'clutch' | 'h2h' | 'vods' | 'tendencia' | 'historial' | 'actividad' | 'crew'

export type PlantillaJuego = {
  preset: string             // arquetipo de origen (id de PRESETS_JUEGO)
  modo: ModoJuego
  tamGrupo: number           // 2 en 1v1 · jugadores por equipo · tamaño de lobby/mesa
  formatos: string[]         // sugeridos al TO al crear torneo (el 1º es el default)
  bestOf: string             // 'Bo3 · Bo5 en top 8', 'Partida única'…
  reporte: ReporteJuego
  labelMain: string          // 'Main', 'Deck', 'Agente', 'Club'…
  setups: SetupJuego[]
  online: boolean
  // ¿Se declaran personajes al reportar un combate? (hasta 2 por jugador).
  // Lucha (Smash/Tekken/SF6), LoL y Valorant sí; Magic/Pokémon/TFT/CoD/CS no.
  personajes: boolean
  scouting: ScoutingTipo           // a quién se estudia: jugador o crew
  scoutingModulos: ModuloScouting[]  // tarjetas de scouting que aplican al juego
}

export const MODO_LABEL: Record<ModoJuego, string> = {
  '1v1': '1 contra 1', equipos: 'Por equipos', lobbies: 'Lobbies (todos contra todos)', mesas: 'Mesas multijugador',
}
export const REPORTE_LABEL: Record<ReporteJuego, string> = {
  sets: 'Sets ganados (2-1, 3-0…)', puntos: 'Puntos por partida', posicion: 'Posición final',
}
export const SETUP_LABEL: Record<SetupJuego, string> = {
  consola: 'Consola', pc: 'PC', mesa: 'Mesa', arcade: 'Arcade',
}

// Arquetipos: elegir uno rellena la plantilla entera; luego todo es ajustable.
export type PresetJuego = { id: string; label: string; ejemplos: string; emoji: string; plantilla: Omit<PlantillaJuego, 'preset'> }

export const PRESETS_JUEGO: PresetJuego[] = [
  {
    id: 'lucha', label: 'Lucha / duelo 1v1', ejemplos: 'Smash, Street Fighter, Tekken…', emoji: '🥊',
    plantilla: {
      modo: '1v1', tamGrupo: 2,
      formatos: ['Doble eliminación', 'Eliminación simple', 'Pools → Top cut', 'Round robin'],
      bestOf: 'Bo3 · Bo5 en top 8', reporte: 'sets', labelMain: 'Main',
      setups: ['consola', 'arcade'], online: true, personajes: true,
      scouting: 'individual', scoutingModulos: ['mains', 'clutch', 'h2h', 'vods', 'tendencia', 'historial', 'actividad'],
    },
  },
  {
    id: 'tcg', label: 'Cartas / juego de mesa', ejemplos: 'Magic, Pokémon TCG, Yu-Gi-Oh!…', emoji: '🃏',
    plantilla: {
      modo: '1v1', tamGrupo: 2,
      formatos: ['Suizo', 'Suizo + Top 8', 'Round robin', 'Eliminación simple'],
      bestOf: 'Bo3', reporte: 'sets', labelMain: 'Deck',
      setups: ['mesa'], online: false, personajes: false,
      // TCG: arquetipos + consistencia; SIN decklist (nota «decklist no pública»)
      scouting: 'individual', scoutingModulos: ['mains', 'clutch', 'h2h', 'tendencia', 'historial', 'actividad'],
    },
  },
  {
    id: 'lobbies', label: 'Lobbies / battle royale', ejemplos: 'TFT, Fortnite, CoD por puntos…', emoji: '♟️',
    plantilla: {
      modo: 'lobbies', tamGrupo: 8,
      formatos: ['Pools → Top cut', 'Puntos por lobby', 'Checkmate final'],
      bestOf: 'Lobbies de 8', reporte: 'puntos', labelMain: 'Compo',
      setups: ['pc', 'consola'], online: true, personajes: false,
      // Lobbies (TFT): comps; sin sets 1v1 → sin clutch ni head-to-head
      scouting: 'individual', scoutingModulos: ['mains', 'tendencia', 'historial', 'actividad'],
    },
  },
  {
    id: 'equipos', label: 'Equipos', ejemplos: 'VALORANT, LoL, Rocket League…', emoji: '🛡️',
    plantilla: {
      modo: 'equipos', tamGrupo: 5,
      formatos: ['Eliminación simple', 'Doble eliminación', 'Liga + playoffs'],
      bestOf: 'Bo1 · Bo3 desde semis', reporte: 'sets', labelMain: 'Rol',
      setups: ['pc'], online: true, personajes: true,
      // Equipos: se estudia a la CREW rival (roster + media + fuerte/débil)
      scouting: 'equipo', scoutingModulos: ['crew', 'mains', 'h2h', 'tendencia', 'historial', 'actividad'],
    },
  },
  {
    id: 'deportes', label: 'Deportes / simulación', ejemplos: 'EA FC (FIFA), NBA 2K, F1…', emoji: '⚽',
    plantilla: {
      modo: '1v1', tamGrupo: 2,
      formatos: ['Eliminación simple', 'Liga (todos contra todos)', 'Grupos + eliminatorias'],
      bestOf: 'Partido único · ida y vuelta en la final', reporte: 'sets', labelMain: 'Club',
      setups: ['consola'], online: true, personajes: false,
      // Deportes: sin personajes → sin módulo de mains
      scouting: 'individual', scoutingModulos: ['clutch', 'h2h', 'tendencia', 'historial', 'actividad'],
    },
  },
]

export const presetDe = (id: string): PresetJuego => PRESETS_JUEGO.find(p => p.id === id) ?? PRESETS_JUEGO[0]

// Plantillas de los juegos de serie (catálogo de sample.ts) — así todo juego
// existente ya tiene perfil de gestión sin tocar sus datos.
const P = (presetId: string, patch: Partial<PlantillaJuego> = {}): PlantillaJuego =>
  ({ preset: presetId, ...presetDe(presetId).plantilla, ...patch })

export const PLANTILLAS_BASE: Record<string, PlantillaJuego> = {
  smash:   P('lucha'),
  tekken:  P('lucha'),
  sf6:     P('lucha'),
  magic:   P('tcg', { formatos: ['Suizo', 'Suizo + Top 8', 'Round robin', 'Commander (mesas de 4)'] }),
  pokemon: P('tcg'),
  tft:     P('lobbies'),
  valorant:P('equipos', { labelMain: 'Agente' }),
  lol:     P('equipos', { labelMain: 'Campeón' }),
  // CS sin personajes → sin módulo de mains en el scouting de equipo
  cs:      P('equipos', { formatos: ['Eliminación simple', 'Doble eliminación', 'Suizo + playoffs'], bestOf: 'Bo1 (MR12) · Bo3 en playoffs', personajes: false, scoutingModulos: ['crew', 'h2h', 'tendencia', 'historial', 'actividad'] }),
  // CoD compite por equipos aunque reporte por lobbies → scouting de crew
  cod:     P('lobbies', { tamGrupo: 12, formatos: ['Puntos por lobby', 'Kill race', 'Eliminación simple'], labelMain: 'Clase', scouting: 'equipo', scoutingModulos: ['crew', 'tendencia', 'historial', 'actividad'] }),
}

// Fallback para juegos añadidos sin plantilla (p. ej. los creados por un TO
// desde crear-torneo antes de esta pieza).
export const PLANTILLA_GENERICA: PlantillaJuego = P('lucha')
