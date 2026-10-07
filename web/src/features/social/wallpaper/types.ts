export type WallpaperPatternId = 'network' | 'university' | 'school' | 'space' | 'stardust';

/** Mesh anchors, in order: top right, upper left, bottom left, lower right. */
export type WallpaperPalette = readonly [string, string, string, string];

export interface WallpaperPattern {
  id: WallpaperPatternId;
  /** Colour of the pattern lines, blended across the same anchors as the base. */
  ink: WallpaperPalette;
  opacity: number;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  /** Dark wallpapers get light service labels and more opaque incoming bubbles. */
  tone: 'light' | 'dark';
  colors: WallpaperPalette;
  pattern: WallpaperPattern | null;
  /** Own bubble gradient, from its tail corner towards the opposite one. */
  accent: readonly [string, string];
  /** Deep tone behind date pills and service labels on light wallpapers. */
  service: string;
}
