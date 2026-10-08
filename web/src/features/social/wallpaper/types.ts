export type WallpaperPatternId =
  'courses' | 'university' | 'school' | 'space' | 'network' | 'stardust';

/** Follows the app theme: the same preset renders on a light or a dark base. */
export type WallpaperAppearance = 'light' | 'dark';

interface LightBase {
  /** Centre, as fractions of the surface width and height. */
  x: number;
  y: number;
  /** Fraction of the longer side of the surface. */
  radius: number;
  color: string;
  strength: number;
}

/**
 * The colour of a wallpaper is composed from a few soft light shapes: a glow, an aurora
 * ribbon (a glow stretched along `angle`), or a halo, a ring of light seen at `tilt`.
 */
export type WallpaperLight =
  | (LightBase & { kind: 'glow' })
  | (LightBase & { kind: 'ribbon'; stretch: number; angle: number })
  | (LightBase & { kind: 'halo'; tilt: number; angle: number });

export interface WallpaperPreset {
  id: string;
  name: string;
  lights: readonly WallpaperLight[];
  pattern: WallpaperPatternId | null;
}
