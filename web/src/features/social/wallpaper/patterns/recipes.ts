import { type GlyphOutline, type PatternTileSpec, renderPatternTile } from '../canvas/pattern-tile';
import { seedFrom } from '../canvas/scatter';
import type { WallpaperPatternId } from '../types';

type GlyphSet = () => Promise<{ default: Record<string, GlyphOutline> }>;

interface PatternRecipe extends Omit<PatternTileSpec, 'glyphs'> {
  glyphs: GlyphSet | null;
}

function sizes(...tiers: [size: number, count: number][]): number[] {
  return tiers.flatMap(([size, count]) => Array<number>(count).fill(size));
}

// Few large glyphs, more medium and small ones: the size rhythm of a hand-laid doodle
// wallpaper, kept sparse so the gradient stays the main surface.
const ICONS = {
  glyphSizes: sizes([74, 2], [50, 4], [32, 8], [22, 6]),
  networkSpacing: 0,
  orbits: 0,
  constellations: 0,
  particles: 70,
  sparkles: 7,
};

const recipes: Record<WallpaperPatternId, PatternRecipe> = {
  courses: { ...ICONS, glyphs: () => import('./courses') },
  university: { ...ICONS, glyphs: () => import('./university') },
  school: { ...ICONS, glyphs: () => import('./school') },
  space: {
    glyphs: () => import('./space'),
    glyphSizes: sizes([86, 1], [44, 2], [26, 3]),
    networkSpacing: 0,
    orbits: 2,
    constellations: 2,
    particles: 280,
    sparkles: 14,
  },
  network: {
    glyphs: null,
    glyphSizes: [],
    networkSpacing: 78,
    orbits: 0,
    constellations: 0,
    particles: 90,
    sparkles: 6,
  },
  stardust: {
    glyphs: null,
    glyphSizes: [],
    networkSpacing: 0,
    orbits: 0,
    constellations: 0,
    particles: 160,
    sparkles: 12,
  },
};

export async function renderPatternMask(pattern: WallpaperPatternId, pixelRatio: number) {
  const { glyphs, ...layout } = recipes[pattern];
  const outlines = glyphs ? Object.values((await glyphs()).default) : [];
  return renderPatternTile({ ...layout, glyphs: outlines }, seedFrom(pattern), pixelRatio);
}
