// ─────────────────────────────────────────────────────────────────────────────
// Banners (paquete Chat): presets de gradiente con la estética de la app para
// la cabecera del perfil y de las crews. Se guarda el VALOR CSS directamente
// (o un dataURL si el usuario sube imagen): así pintar es un style background
// y no hace falta resolver ids. fondoBanner() unifica ambos casos.
// ─────────────────────────────────────────────────────────────────────────────

export type BannerPreset = { id: string; nombre: string; css: string }

export const BANNERS_PRESET: BannerPreset[] = [
  { id: 'lima',    nombre: 'Lima',    css: 'linear-gradient(120deg, #0D0F15 0%, #3E5C10 55%, #B6FF3A 130%)' },
  { id: 'violeta', nombre: 'Violeta', css: 'linear-gradient(120deg, #120F1F 0%, #4C2A85 55%, #9B5DE5 130%)' },
  { id: 'arcade',  nombre: 'Arcade',  css: 'linear-gradient(120deg, #1A0D12 0%, #7A1D30 55%, #E63E54 130%)' },
  { id: 'oceano',  nombre: 'Océano',  css: 'linear-gradient(120deg, #0D1420 0%, #1F4A7A 55%, #4F8EF7 130%)' },
  { id: 'zen',     nombre: 'Zen',     css: 'linear-gradient(120deg, #0D1715 0%, #125C54 55%, #2EC4B6 130%)' },
  { id: 'oro',     nombre: 'Oro',     css: 'linear-gradient(120deg, #17130D 0%, #77602A 55%, #E0BE63 130%)' },
]

// Valor listo para style={{ background }}: dataURL → imagen a cover; si no,
// el propio CSS del preset.
export function fondoBanner(banner: string): string {
  return banner.startsWith('data:') ? `url(${banner}) center / cover no-repeat` : banner
}
