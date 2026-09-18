/**
 * Visual identity for ONE MORE LEVEL.
 * Original geometric/neon-on-deep-navy look; every asset is drawn at runtime,
 * so there are no third-party images, fonts or sounds to license.
 */
export const THEME = {
  bg: '#0B0E1A',
  bgSoft: '#141A2E',
  surface: '#1B2240',
  surfaceHi: '#263056',
  ink: '#F2F5FF',
  inkDim: '#8E97BD',
  primary: '#5B7BFF',
  primaryDeep: '#3A55D9',
  accent: '#FFD166',
  success: '#3DDC97',
  danger: '#FF5E7A',
  warn: '#FF9F45',
  violet: '#B06BFF',
  cyan: '#45E0E5',
} as const;

/** Palette used by colour-matching challenges. Names are shown to the player. */
export const NAMED_COLORS = [
  { name: 'BLUE', hex: '#4D8BFF' },
  { name: 'RED', hex: '#FF5E7A' },
  { name: 'GREEN', hex: '#3DDC97' },
  { name: 'YELLOW', hex: '#FFD166' },
  { name: 'PURPLE', hex: '#B06BFF' },
  { name: 'ORANGE', hex: '#FF9F45' },
  { name: 'CYAN', hex: '#45E0E5' },
  { name: 'PINK', hex: '#FF7BD5' },
] as const;

export type NamedColor = (typeof NAMED_COLORS)[number];

export const FONT = {
  display: '"Bricolage", "Archivo Black", system-ui, -apple-system, "Segoe UI", sans-serif',
  body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/** Canvas font shorthand helper. */
export function font(size: number, weight: 700 | 800 | 900 | 600 = 800): string {
  return `${weight} ${Math.round(size)}px ${FONT.body}`;
}
